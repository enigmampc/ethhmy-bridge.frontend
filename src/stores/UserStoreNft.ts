import { action, observable } from 'mobx';
import { IStores } from 'stores';
import { statusFetching } from '../constants';
import { StoreConstructor } from './core/StoreConstructor';
import * as agent from 'superagent';
import { divDecimals, fixUnlockToken, sleep, unlockToken } from '../utils';
import { BroadcastMode, CosmWasmClient } from 'secretjs';
import { BigNumber } from 'bignumber.js';
import { getViewingKey, QueryDeposit, QueryRewards, Snip20GetBalance } from '../blockchain-bridge';
import { AsyncSender } from '../blockchain-bridge/scrt/asyncSender';
import { NftDetails } from '../blockchain-bridge/eth/EthMethodsNftBridge';
import { Snip721GetTokens } from '../blockchain-bridge/scrt/snip721';


export const rewardsKey = key => `${key}Rewards`;

export class UserStoreSecret extends StoreConstructor {
  public declare stores: IStores;
  @observable public isAuthorized: boolean;
  public status: statusFetching;
  redirectUrl: string;

  @observable public keplrWallet: any;
  @observable public keplrOfflineSigner: any;
  @observable public secretjs: CosmWasmClient;
  @observable public secretjsSend: AsyncSender;
  @observable public isKeplrWallet = false;
  @observable public error: string;

  @observable public sessionType: 'mathwallet' | 'ledger' | 'wallet';
  @observable public address: string;
  @observable public balanceSCRT: BigNumber;

  @observable public availableNfts: { [key: string]: NftDetails[] }  = {};
  @observable public selectedAddress: string = process.env.SECRET_NFT_ADDRESS || 'secret1wisdadsfjasdfjasfdj';
  @observable public isLocked: boolean = true;
  // @observable public balanceToken: { [key: string]: string } = {};
  // @observable public balanceTokenMin: { [key: string]: string } = {};
  //
  // @observable public balanceRewards: { [key: string]: string } = {};

  @observable public scrtRate = 0;
  // @observable public ethRate = 0;

  // @observable public snip20Address = '';
  @observable public snip721Address = '';
  // @observable public snip20BalanceMin = '';

  @observable public isInfoReading = false;
  @observable public isInfoEarnReading = false;
  @observable public chainId: string;

  @observable public ws: WebSocket;

  constructor(stores) {
    super(stores);

    // setInterval(() => this.getBalances(), 15000);

    // Load tokens from DB
    this.stores.tokens.init();
    this.stores.tokens.filters = {};
    this.stores.tokens.fetch();

    const keplrCheckPromise = new Promise<void>((accept, _reject) => {
      // 1. Every one second, check if Keplr was injected to the page
      const keplrCheckInterval = setInterval(async () => {
        this.isKeplrWallet =
          // @ts-ignore
          !!window.keplr &&
          // @ts-ignore
          !!window.getOfflineSigner &&
          // @ts-ignore
          !!window.getEnigmaUtils;
        // @ts-ignore
        this.keplrWallet = window.keplr;

        if (this.isKeplrWallet) {
          // Keplr is present, stop checking
          clearInterval(keplrCheckInterval);
          accept();
        }
      }, 1000);
    });

    const session = localStorage.getItem('keplr_session');

    const sessionObj = JSON.parse(session);

    if (sessionObj) {
      this.address = sessionObj.address;
      this.isInfoReading = sessionObj.isInfoReading;
      this.isInfoEarnReading = sessionObj.isInfoEarnReading;
      keplrCheckPromise.then(async () => {
        await this.signIn();

        this.getRates();
        this.getBalances();
        this.getSecretNfts();
        //this.websocketInit();
      });
    }
  }

  // @action public setSnip20Balance(balance: string) {
  //   this.snip20Balance = balance;
  // }
  //
  // @action public setSnip20BalanceMin(balance: string) {
  //   this.snip20BalanceMin = balance;
  // }

  // @action public async websocketTerminate(waitToBeOpen?: boolean) {
  //   if (waitToBeOpen) {
  //     while (!this.ws && this.ws.readyState !== WebSocket.OPEN) {
  //       await sleep(100);
  //     }
  //   }
  //
  //   if (this.ws && this.ws.readyState === WebSocket.OPEN) {
  //     this.ws.close(1000 /* Normal Closure */, 'Ba bye');
  //   }
  // }
  //
  // @action public async websocketInit() {
  //   if (this.ws) {
  //     while (this.ws.readyState === WebSocket.CONNECTING) {
  //       await sleep(100);
  //     }
  //
  //     if (this.ws.readyState === WebSocket.OPEN) {
  //       this.ws.close(1012 /* Service Restart */, 'Refreshing connection');
  //     }
  //   }
  //
  //   this.ws = new WebSocket(process.env.SECRET_WS);
  //
  //   const symbolUpdateHeightCache: { [symbol: string]: number } = {};
  //
  //   this.ws.onmessage = async event => {
  //     try {
  //       const data = JSON.parse(event.data);
  //
  //       const symbol = data.id;
  //
  //       if (!(symbol in symbolUpdateHeightCache)) {
  //         console.error(symbol, 'not in symbolUpdateHeightCache:', symbolUpdateHeightCache);
  //         return;
  //       }
  //
  //       let height = 0;
  //       try {
  //         height = Number(data.result.data.value.TxResult.height);
  //       } catch (error) {
  //         // Not a tx
  //         // Probably just the /subscribe ok event
  //         return;
  //       }
  //
  //       if (height <= symbolUpdateHeightCache[symbol]) {
  //         console.log('Already updated', symbol, 'for height', height);
  //         return;
  //       }
  //       symbolUpdateHeightCache[symbol] = height;
  //       //await this.updateBalanceForSymbol(symbol);
  //     } catch (error) {
  //       console.log(`Error parsing websocket event: ${error}`);
  //     }
  //   };
  //
  //   this.ws.onopen = async () => {
  //     while (this.stores.tokens.allData.length === 0) {
  //       await sleep(100);
  //     }
  //
  //     while (!this.address.startsWith('secret')) {
  //       await sleep(100);
  //     }
  //
  //     for (const token of this.stores.rewards.allData) {
  //       // For any tx on this token's address or rewards pool => update my balance
  //       const symbol = token.inc_token.symbol.replace('s', '');
  //
  //       symbolUpdateHeightCache[symbol] = 0;
  //
  //       const tokenQueries = [
  //         `message.contract_address='${token.inc_token.address}'`,
  //         `wasm.contract_address='${token.inc_token.address}'`,
  //         `message.contract_address='${token.pool_address}'`,
  //         `wasm.contract_address='${token.pool_address}'`,
  //       ];
  //
  //       for (const query of tokenQueries) {
  //         this.ws.send(
  //           JSON.stringify({
  //             jsonrpc: '2.0',
  //             id: symbol, // jsonrpc id
  //             method: 'subscribe',
  //             params: { query },
  //           }),
  //         );
  //       }
  //     }
  //
  //     // Also hook sSCRT
  //     symbolUpdateHeightCache['sSCRT'] = 0;
  //     const secretScrtQueries = [
  //       `message.contract_address='${process.env.SSCRT_CONTRACT}'`,
  //       `wasm.contract_address='${process.env.SSCRT_CONTRACT}'`,
  //     ];
  //
  //     for (const query of secretScrtQueries) {
  //       this.ws.send(
  //         JSON.stringify({
  //           jsonrpc: '2.0',
  //           id: 'sSCRT', // jsonrpc id
  //           method: 'subscribe',
  //           params: { query },
  //         }),
  //       );
  //     }
  //
  //     symbolUpdateHeightCache['SCRT'] = 0;
  //     const scrtQueries = [
  //       `message.sender='${this.address}'` /* sent a tx (gas) */,
  //       `message.signer='${this.address}'` /* executed a contract (gas) */,
  //       `transfer.recipient='${this.address}'` /* received SCRT */,
  //     ];
  //
  //     for (const query of scrtQueries) {
  //       this.ws.send(
  //         JSON.stringify({
  //           jsonrpc: '2.0',
  //           id: 'SCRT', // jsonrpc id
  //           method: 'subscribe',
  //           params: { query },
  //         }),
  //       );
  //     }
  //   };
  // }


  @action public async signIn(wait?: boolean) {
    this.error = '';

    console.log('Waiting for Keplr...');
    while (wait && !this.keplrWallet) {
      await sleep(100);
    }
    console.log('Found Keplr', process.env.CHAIN_ID);

    this.chainId = process.env.CHAIN_ID;

    // Setup Secret Testnet (not needed on mainnet)
    if (process.env.ENV !== 'MAINNET') {
      await this.keplrWallet.experimentalSuggestChain({
        chainId: this.chainId,
        chainName: process.env.CHAIN_NAME,
        rpc: process.env.SECRET_RPC,
        rest: process.env.SECRET_LCD,
        bip44: {
          coinType: 529,
        },
        coinType: 529,
        stakeCurrency: {
          coinDenom: 'SCRT',
          coinMinimalDenom: 'uscrt',
          coinDecimals: 6,
        },
        bech32Config: {
          bech32PrefixAccAddr: 'secret',
          bech32PrefixAccPub: 'secretpub',
          bech32PrefixValAddr: 'secretvaloper',
          bech32PrefixValPub: 'secretvaloperpub',
          bech32PrefixConsAddr: 'secretvalcons',
          bech32PrefixConsPub: 'secretvalconspub',
        },
        currencies: [
          {
            coinDenom: 'SCRT',
            coinMinimalDenom: 'uscrt',
            coinDecimals: 6,
          },
        ],
        feeCurrencies: [
          {
            coinDenom: 'SCRT',
            coinMinimalDenom: 'uscrt',
            coinDecimals: 6,
          },
        ],
        gasPriceStep: {
          low: 0.01,
          average: 0.25,
          high: 0.25,
        },
        features: ['secretwasm'],
      });
    }

    // Ask the user for permission
    await this.keplrWallet.enable(this.chainId);

    // @ts-ignore
    this.keplrOfflineSigner = window.getOfflineSigner(this.chainId);
    const accounts = await this.keplrOfflineSigner.getAccounts();
    this.address = accounts[0].address;
    this.isAuthorized = true;
    // @ts-ignore
    this.secretjsSend = this.initSecretJS(process.env.SECRET_POST_ADDRESS, true);
    this.secretjs = this.initSecretJS(process.env.SECRET_LCD, false);
  }

  initSecretJS = (address: string, isSigner: boolean) => {
    try {
      const client = isSigner
        ? new AsyncSender(
            address,
            this.address,
            this.keplrOfflineSigner,
            // @ts-ignore
            window.getEnigmaUtils(this.chainId),
            {
              init: {
                amount: [{ amount: '100000', denom: 'uscrt' }],
                gas: '300000',
              },
              exec: {
                amount: [{ amount: '125000', denom: 'uscrt' }],
                gas: '500000',
              },
            },
            BroadcastMode.Async,
          )
        : new CosmWasmClient(
            address,
            // @ts-ignore
          );
      this.syncLocalStorage();
      this.getBalances();
      this.getSecretNfts();
      return client;
    } catch (error) {
      this.error = error.message;
      this.isAuthorized = false;
      console.error('keplr login error', error);
      return undefined;
    }
  };

  @action public getSnip20Balance = async (snip20Address: string, decimals?: string | number): Promise<string> => {
    let timeout = 0;
    while (timeout < 1000 && !this.secretjs) {
      await sleep(100);
      timeout += 100;
    }

    const viewingKey = await getViewingKey({
      keplr: this.keplrWallet,
      chainId: this.chainId,
      address: snip20Address,
    });

    if (!viewingKey) {
      return unlockToken;
    }

    const rawBalance = await Snip20GetBalance({
      secretjs: this.secretjs,
      token: snip20Address,
      address: this.address,
      key: viewingKey,
    });

    if (isNaN(Number(rawBalance))) {
      return fixUnlockToken;
    }

    if (decimals) {
      const decimalsNum = Number(decimals);
      return divDecimals(rawBalance, decimalsNum);
    }

    return rawBalance;
  };

  @action public getBridgeRewardsBalance = async (snip20Address: string, noheight): Promise<string> => {
    if (!this.secretjs) {
      return '0';
    }

    let height = noheight ? undefined : String(await this.secretjs.getHeight());

    const viewingKey = await getViewingKey({
      keplr: this.keplrWallet,
      chainId: this.chainId,
      address: snip20Address,
    });
    if (!viewingKey) {
      throw new Error('Failed to get viewing key');
    }

    try {
      return await QueryRewards({
        cosmJS: this.secretjs,
        contract: snip20Address,
        address: this.address,
        key: viewingKey,
        height: height,
      });
    } catch (e) {
      try {
        height = String(await this.secretjs.getHeight());
        return await QueryRewards({
          cosmJS: this.secretjs,
          contract: snip20Address,
          address: this.address,
          key: viewingKey,
          height: height,
        });
      } catch (e) {
        console.error(`failed to query rewards: ${e}`);
        throw new Error('failed to query rewards');
      }
    }
  };

  @action public getBridgeDepositBalance = async (snip20Address: string): Promise<string> => {
    if (!this.secretjs) {
      return '0';
    }

    const viewingKey = await getViewingKey({
      keplr: this.keplrWallet,
      chainId: this.chainId,
      address: snip20Address,
    });
    if (!viewingKey) {
      throw new Error('Failed to get viewing key');
    }

    try {
      return await QueryDeposit({
        cosmJS: this.secretjs,
        contract: snip20Address,
        address: this.address,
        key: viewingKey,
      });
    } catch (e) {
      return await Snip20GetBalance({
        secretjs: this.secretjs,
        address: this.address,
        token: snip20Address,
        key: viewingKey,
      });
    }
  };

  @action public getSecretNfts = async () => {
    await this.updateScrtNfts(); //, this.updateBalanceForSymbol('sSCRT')
  };

  @action public getBalances = async () => {
    await this.updateScrtBalance(); //, this.updateBalanceForSymbol('sSCRT')
  };

  @action public updateScrtBalance = async () => {
    this.secretjs.getAccount(this.address).then(account => {
      try {
        this.balanceSCRT = new BigNumber(account.balance[0].amount);
      } catch (e) {
        this.balanceSCRT = new BigNumber(0);
      }
    });
    return;
  };

  @action public updateScrtNfts = async () => {
    const viewingKey = await getViewingKey({
      keplr: this.keplrWallet,
      chainId: this.chainId,
      address: this.snip721Address,
    });
    try {
      const resp = await Snip721GetTokens({ secretjs: this.secretjs, token: this.snip721Address, key: viewingKey, address: this.address });
    } catch (e) {
      // todo: probably viewing key not working, but also could be other stuff. handle here
    }

    // need to figure out what to
    // token ids to details

    const tokenDetails = [];

    this.availableNfts = {[this.snip721Address]:tokenDetails};
  };


  @action public signOut() {
    this.isAuthorized = false;
    this.address = null;
    this.syncLocalStorage();
  }

  private syncLocalStorage() {
    localStorage.setItem(
      'keplr_session',
      JSON.stringify({
        address: this.address,
        isInfoReading: this.isInfoReading,
        isInfoEarnReading: this.isInfoEarnReading,
      }),
    );
  }

  @action public signTransaction(txn: any) {
    /*  if (this.sessionType === 'mathwallet' && this.isKeplrWallet) {
      return this.keplrWallet.signTransaction(txn);
    } */
  }

  public saveRedirectUrl(url: string) {
    if (!this.isAuthorized && url) {
      this.redirectUrl = url;
    }
  }


  @action public async getRates() {

    // fallback to binance prices
    if (isNaN(this.scrtRate) || this.scrtRate === 0) {
      const scrtbtc = await agent.get(
        'https://api.binance.com/api/v1/ticker/24hr?symbol=SCRTBTC',
      );
      const btcusdt = await agent.get(
        'https://api.binance.com/api/v1/ticker/24hr?symbol=BTCUSDT',
      );

      this.scrtRate = scrtbtc.body.lastPrice * btcusdt.body.lastPrice;
    }
  }

  //@action public async get


  // this.rates = {
  //   BSC: ,
  //   ETH: '',
  //   PLSM: '',
  // };

  // const scrtbtc = await agent.get<{ body: IOperation }>('https://api.binance.com/api/v1/ticker/24hr?symbol=SCRTBTC');
  // const btcusdt = await agent.get<{ body: IOperation }>('https://api.binance.com/api/v1/ticker/24hr?symbol=BTCUSDT');
  //
  // this.scrtRate = scrtbtc.body.lastPrice * btcusdt.body.lastPrice;
  //
  // const ethusdt = await agent.get<{ body: IOperation }>('https://api.binance.com/api/v1/ticker/24hr?symbol=ETHUSDT');
  //
  // this.ethRate = ethusdt.body.lastPrice;
  //}
}
