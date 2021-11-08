import { action, observable } from 'mobx';
import stores, { IStores } from 'stores';
import { statusFetching } from '../constants';
import { StoreConstructor } from './core/StoreConstructor';
import * as agent from 'superagent';
import { IOperation } from './interfaces';
import { canonicalizeBalance, divDecimals, fixUnlockToken, formatWithSixDecimals, sleep, unlockToken } from '../utils';
import { BroadcastMode, CosmWasmClient, EnigmaUtils, SigningCosmWasmClient } from 'secretjs';
import {
  getFeeForExecute,
  getViewingKey,
  networkFromToken,
  NETWORKS,
  QueryDeposit,
  QueryRewards,
  Snip20GetBalance,
} from '../blockchain-bridge';
import { AsyncSender } from '../blockchain-bridge/scrt/asyncSender';
import BigNumber from 'bignumber.js';
import { storeTxResultLocally } from 'pages/Swap/utils';
import { RewardData } from 'pages/SefiStaking';
import { RewardsToken } from 'components/Earn/EarnRow';
import axios from "axios";
import moment from 'moment';


export const rewardsDepositKey = key => `${key}RewardsDeposit`;

export const rewardsKey = key => `${key}Rewards`;

export class UserStoreEx extends StoreConstructor {
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
  @observable public balanceSCRT: string;
  @observable public balanceCSHBK: string;
  @observable public expectedSEFIFromCSHBK: number;
  @observable public ratioCSHBK: number;

  @observable public balanceToken: { [key: string]: string } = {};
  @observable public balanceTokenMin: { [key: string]: string } = {};

  @observable public balanceRewards: { [key: string]: string } = {};
  @observable public proposals: Array<{
    id: string,
    address: string,
    title: string,
    description: string,
    vote_type: string,
    author_address: string,
    author_alias: string,
    end_date: number,
    ended: boolean,
    valid: boolean,
    status: string,
  }>;
  @observable public numOfActiveProposals: number;


  @observable public scrtRate = 0;
  // @observable public ethRate = 0;

  @observable public snip20Address = '';
  @observable public snip20Balance = '';
  @observable public snip20BalanceMin = '';

  @observable public isUnconnected = '';
  @observable public isInfoReading = false;
  @observable public isInfoEarnReading = false;
  @observable public isMaintenanceOpen = false;
  @observable public chainId: string;
  @observable public isModalOpen= false;
  @observable public ws: WebSocket;

  constructor(stores) {
    super(stores);
    window.addEventListener("keplr_keystorechange", () => {
      console.log("Key store in Keplr is changed. Reloading page")
      window.location.reload();
    })
    // setInterval(() => this.getBalances(), 15000);

    // Load tokens from DB
    this.stores.tokens.init();
    this.stores.tokens.filters = {};
    this.stores.tokens.fetch();


    const session = localStorage.getItem('keplr_session');

    const sessionObj = JSON.parse(session);

    if (sessionObj) {
      this.address = sessionObj.address;
      this.isInfoReading = sessionObj.isInfoReading;
      this.isInfoEarnReading = sessionObj.isInfoEarnReadingSecret3;
      this.keplrCheckPromise.then(async () => {
        await this.signIn();

        this.getRates();
        this.getBalances();

        //this.websocketInit();
      });
    } else {
      console.log("Couln't find a session")
      this.isUnconnected = 'true';
    }
  }

  public keplrCheckPromise = new Promise<void>((accept, _reject) => {
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
        clearInterval(keplrCheckInterval)
        accept();
      } else {
        console.log("Keplr is not installed")
        this.isUnconnected = 'UNINSTALLED';
      }
    }, 1000);
  });
  @action public setSnip20Balance(balance: string) {
    this.snip20Balance = balance;
  }

  @action public setSnip20BalanceMin(balance: string) {
    this.snip20BalanceMin = balance;
  }
  @action public setModalOpen(open:boolean){
    this.isModalOpen = open;
  }
  @action public setMaintenanceModal(open:boolean){
    this.isMaintenanceOpen = open;
  }
  @action public async websocketTerminate(waitToBeOpen?: boolean) {
    if (waitToBeOpen) {
      while (!this.ws && this.ws.readyState !== WebSocket.OPEN) {
        await sleep(100);
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000 /* Normal Closure */, 'Ba bye');
    }
  }

  @action public async websocketInit() {
    if (this.ws) {
      while (this.ws.readyState === WebSocket.CONNECTING) {
        await sleep(100);
      }

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1012 /* Service Restart */, 'Refreshing connection');
      }
    }

    this.ws = new WebSocket(process.env.SECRET_WS);

    const symbolUpdateHeightCache: { [symbol: string]: number } = {};

    this.ws.onmessage = async event => {
      try {
        const data = JSON.parse(event.data);

        const symbol = data.id;

        if (!(symbol in symbolUpdateHeightCache)) {
          console.error(symbol, 'not in symbolUpdateHeightCache:', symbolUpdateHeightCache);
          return;
        }

        let height = 0;
        try {
          height = Number(data.result.data.value.TxResult.height);
        } catch (error) {
          // Not a tx
          // Probably just the /subscribe ok event
          return;
        }

        if (height <= symbolUpdateHeightCache[symbol]) {
          console.log('Already updated', symbol, 'for height', height);
          return;
        }
        symbolUpdateHeightCache[symbol] = height;
        //await this.updateBalanceForSymbol(symbol);
      } catch (error) {
        console.log(`Error parsing websocket event: ${error}`);
      }
    };

    this.ws.onopen = async () => {
      while (this.stores.tokens.allData.length === 0) {
        await sleep(100);
      }

      while (!this.address.startsWith('secret')) {
        await sleep(100);
      }

      for (const token of this.stores.rewards.allData) {
        // For any tx on this token's address or rewards pool => update my balance
        const symbol = token.inc_token.symbol.replace('s', '');

        symbolUpdateHeightCache[symbol] = 0;

        const tokenQueries = [
          `message.contract_address='${token.inc_token.address}'`,
          `wasm.contract_address='${token.inc_token.address}'`,
          `message.contract_address='${token.pool_address}'`,
          `wasm.contract_address='${token.pool_address}'`,
        ];

        for (const query of tokenQueries) {
          this.ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: symbol, // jsonrpc id
              method: 'subscribe',
              params: { query },
            }),
          );
        }
      }

      // Also hook sSCRT
      symbolUpdateHeightCache['sSCRT'] = 0;
      const secretScrtQueries = [
        `message.contract_address='${process.env.SSCRT_CONTRACT}'`,
        `wasm.contract_address='${process.env.SSCRT_CONTRACT}'`,
      ];

      for (const query of secretScrtQueries) {
        this.ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'sSCRT', // jsonrpc id
            method: 'subscribe',
            params: { query },
          }),
        );
      }

      symbolUpdateHeightCache['SCRT'] = 0;
      const scrtQueries = [
        `message.sender='${this.address}'` /* sent a tx (gas) */,
        `message.signer='${this.address}'` /* executed a contract (gas) */,
        `transfer.recipient='${this.address}'` /* received SCRT */,
      ];

      for (const query of scrtQueries) {
        this.ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'SCRT', // jsonrpc id
            method: 'subscribe',
            params: { query },
          }),
        );
      }
    };
  }

  @action public setInfoReading() {
    this.isInfoReading = true;
    this.syncLocalStorage();
  }

  @action public setInfoEarnReading() {
    this.isInfoEarnReading = true;
    this.syncLocalStorage();
  }

  @action public async signIn(wait?: boolean) {
    try {

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
            low: 0.1,
            average: 0.25,
            high: 0.4,
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
      await this.updateScrtBalance();
      await this.updateCSHBKBalance();
      await this.getProposals();
      await this.getActiveProposals();
      this.isUnconnected = '';
    } catch (error) {
      this.isUnconnected = 'true';
      console.error(error)
    }
  }

  initSecretJS = (address: string, isSigner: boolean) => {
    try {
      const client = isSigner
        ? new AsyncSender(
          address,
          this.address,
          this.keplrOfflineSigner,
          // @ts-ignore
          new EnigmaUtils(process.env.SECRET_LCD),
          {
            init: {
              amount: [{ amount: '300000', denom: 'uscrt' }],
              gas: '300000',
            },
            exec: {
              amount: [{ amount: '500000', denom: 'uscrt' }],
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
      return client;
    } catch (error) {
      this.error = error.message;
      this.isAuthorized = false;
      console.error('keplr login error', error);
      return undefined;
    }
  };

  @action public getSnip20Balance = async (snip20Address: string, decimals?: string | number): Promise<string> => {
    await this.prepareDeps();

    if (!this.secretjs) {
      return '0';
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

  @action public getBalances = async () => {
    await Promise.all([this.updateBalanceForSymbol('SCRT'), this.updateBalanceForSymbol('sSCRT')]);
  };

  @action public updateScrtBalance = async () => {
    this.secretjs.getAccount(this.address).then(account => {
      try {
        this.balanceSCRT = formatWithSixDecimals(divDecimals(account.balance[0].amount, 6));
      } catch (e) {
        this.balanceSCRT = '0';
      }
    });
    return;
  };

  @action public updateSScrtBalance = async () => {
    try {
      const balance = await this.getSnip20Balance(process.env.SSCRT_CONTRACT, 6);
      this.balanceToken[process.env.SSCRT_CONTRACT] = balance;
    } catch (err) {
      this.balanceToken[process.env.SSCRT_CONTRACT] = unlockToken;
    }

    const token = this.stores.tokens.allData.find(t => t.display_props.symbol === 'SSCRT');

    if (!token) {
      return;
    }

    try {
      this.balanceTokenMin[process.env.SSCRT_CONTRACT] = token.display_props.min_from_scrt;
    } catch (e) {
      console.log(`unknown error: ${e}`);
    }
    return;
  };

  @action public updateBalanceForRewardsToken = async (tokenAddress: string) => {
    while (!this.address && !this.secretjs && this.stores.tokens.isPending) {
      await sleep(100);
    }
  };

  @action public updateBalanceForSymbol = async (symbol: string) => {
    while (!this.address && !this.secretjs && this.stores.tokens.allData.length === 0) {
      await sleep(100);
    }

    if (!symbol) {
      return;
    } else if (symbol === 'SCRT') {
      await this.updateScrtBalance();
    } else if (symbol === 'sSCRT') {
      await this.updateSScrtBalance();
    } else if (symbol === "CSHBK") {
      await this.updateCSHBKBalance();
    }

    //console.log(symbol)

    await this.refreshTokenBalance(symbol);

    //await this.refreshRewardsBalances(symbol);
  };
  @action public updateExpectedSEFIFromCSHBK = async () => {
    try {
      //Calculating Expected SEFI from CSHBK
      const cb_balance = parseFloat(this.balanceCSHBK)
      //Total supply
      const { token_info } = await this.secretjs.queryContractSmart(process.env.CSHBK_CONTRACT, { token_info: {} });
      const cb_total_supply = parseFloat(token_info?.total_supply)
      //Current block
      const block = (await this.secretjs.getBlock()).header.height;
      //Peding SEFI
      const { pending } = await this.secretjs.queryContractSmart(process.env.MASTER_CONTRACT, { pending: { spy_addr: process.env.CSHBK_CONTRACT, block, }, });
      const pending_sefi = parseFloat(pending?.amount);
      //Calculating CSHBK ratio
      //Reward balance 
      const result = await this.secretjs.queryContractSmart(process.env.CSHBK_CONTRACT, { reward_balance: {} });
      const cb_rewards_balance = parseInt(result.reward_balance.balance);
      //Prices
      const sefiUSD = parseFloat(this.stores.tokens.allData.find(t => t.display_props.symbol === 'SEFI')?.price || '0.2');
      const scrtUSD = parseFloat(this.stores.tokens.allData.find(t => t.display_props.symbol === 'SSCRT')?.price || '3.8');
      const accumulated_sefi = cb_rewards_balance + pending_sefi;

      //Result Rate CSHBK
      // console.log(`(${accumulated_sefi} / ${cb_total_supply}) * ( ${sefiUSD} / ( ${scrtUSD} * 0.003 ))`)      
      this.ratioCSHBK = parseFloat(((accumulated_sefi / cb_total_supply) * (sefiUSD / (scrtUSD * 0.003))).toFixed(2))
      if (parseFloat(this.balanceCSHBK) > 0) {
        //Result Expected SEFI
        this.expectedSEFIFromCSHBK = parseFloat(((cb_balance * scrtUSD * 0.003 * this.ratioCSHBK) / sefiUSD).toFixed(2))
        // console.log(`cashback -> (${cb_balance} * ${scrtUSD} * 0.003 * ${this.ratioCSHBK} ) / ${sefiUSD}`)    
        // console.log(`cashback 2 -> ((${cb_balance} * ${scrtUSD} * 0.003 ) / ${sefiUSD}) * ${this.ratioCSHBK} `)    
      } else {
        this.expectedSEFIFromCSHBK = 0.0;
      }
    } catch (error) {
      this.expectedSEFIFromCSHBK = 0.0;
      console.error(error)
    }
  }

  @action public updateCSHBKBalance = async () => {
    try {
      const balance = await this.getSnip20Balance(process.env.CSHBK_CONTRACT, 6);
      this.balanceToken[process.env.CSHBK_CONTRACT] = balance;
      this.balanceCSHBK = balance;
      await this.updateExpectedSEFIFromCSHBK()
    } catch (err) {
      this.balanceToken[process.env.CSHBK_CONTRACT] = unlockToken;
      console.error(err)
      this.balanceCSHBK = unlockToken;
    }

    const token = this.stores.tokens.allData.find(t => t.display_props.symbol === 'CSHBK');

    if (!token) {
      return;
    }

    try {
      this.balanceTokenMin[process.env.CSHBK_CONTRACT] = token.display_props.min_from_scrt;
    } catch (e) {
      console.log(`unknown error: ${e}`);
    }
    return;
  }
  public async ConvertCHSBKToSEFI(): Promise<any> {
    const canonicalizeCHSBK = canonicalizeBalance(new BigNumber(this.balanceCSHBK), 6)
    const result = await this.secretjsSend.asyncExecute(
      process.env.CSHBK_CONTRACT,
      {
        burn: {
          amount: canonicalizeCHSBK,
        },
      }, '', [],
      getFeeForExecute(450_000),
    );

    if (result?.code) {
      return result
    }

    this.updateLocalCSHBKData(this.expectedSEFIFromCSHBK, this.balanceCSHBK)
    await this.updateCSHBKBalance();
    return result;

  }
  public async createVote(choice: number, contractAddress: string, salt: string): Promise<any> {
    const viewingKey = await getViewingKey({
      keplr: this.keplrWallet,
      chainId: this.chainId,
      address: process.env.SEFI_STAKING_CONTRACT,
    });

    if (viewingKey) {
      const result = await this.secretjsSend.asyncExecute(contractAddress,
        {
          "vote":
          {
            "choice": choice,
            "staking_pool_viewing_key": viewingKey,
            "salt": salt,
          }
        },
        '',
        [],
        getFeeForExecute(550_000))

      return result;
    } else {
      throw new Error(this.error);
    }
  }

  public async createProposal(
    title: string, description: string, vote_type: string, author_alias: string):
    Promise<any> {
    let viewingKey = await getViewingKey({
      keplr: this.keplrWallet,
      chainId: this.chainId,
      address: process.env.SEFI_STAKING_CONTRACT,
    });

    if (!viewingKey) {
      await this.keplrWallet.suggestToken(this.chainId, process.env.SEFI_STAKING_CONTRACT);
      viewingKey = await getViewingKey({
        keplr: this.keplrWallet,
        chainId: this.chainId,
        address: process.env.SEFI_STAKING_CONTRACT,
      });
    }

    const result = await this.secretjsSend.asyncExecute(process.env.FACTORY_CONTRACT,
      {
        "new_poll": {
          "poll_metadata": {
            "title": title,
            "description": description,
            "vote_type": vote_type,
            "author": this.address,
            "author_alias": author_alias,
          },
          "poll_choices": ["Yes", "No"],
          "pool_viewing_key": viewingKey
        }
      },
      '',
      [],
      getFeeForExecute(450_000))

    const newPoll = result.logs[0]?.events[1]?.attributes.find((e)=>e.key==='new_poll').value;
    if (newPoll) {
      await axios.post(`${process.env.BACKEND_URL}/secret_votes/${newPoll}`);
    }

    return result;
  }

  public async sendFinalizeVote(contractAddress: string, rollingHash: string): Promise<any> {

    const result = await this.secretjsSend.asyncExecute(contractAddress,
      {
        finalize: {
          rolling_hash: rollingHash,
        }
      },
      '',
      [],
      getFeeForExecute(550_000))
    // console.log(result);
    // const decoder = new TextDecoder();
    // console.log(decoder.decode(result.data));
    return result;

  }

  public getProposals = async () => {
    try {
      const response = await axios.get(`${process.env.BACKEND_URL}/secret_votes`);
      const data = response.data.result;
      // console.log(data);
      const result = data.map(proposal => {
        return {
          id: proposal._id,
          reveal_com: {
            revealers: proposal.reveal_com.revealers,
            number: proposal.reveal_com.n
          },
          address: proposal.address,
          title: proposal.title,
          description: proposal.description,
          tally: proposal.tally,
          vote_type: proposal.vote_type,
          author_address: proposal.author_addr,
          author_alias: proposal.author_alias,
          end_date: proposal.end_timestamp,
          finalized: proposal.finalized,
          valid: proposal.valid,
          status: proposal.status.toLowerCase(),
          voting_percentaje: proposal.voting_percentage,
          hidden: proposal.hidden
        }
      });
      return result;
      // console.log('Result:', result);
    } catch (error) {
      console.log('Error Message:', error);
    }
  }

  @action public getActiveProposals = async () => {

    try {

      const response = await axios.get(`${process.env.BACKEND_URL}/secret_votes`);
      const proposals = await response.data.result;

      const activeProposals = proposals.filter(prop =>
        moment.unix(prop.end_timestamp) > moment()
      );

      this.numOfActiveProposals = activeProposals.length;

    } catch (error) {
      console.error('Error Message:', error);
    }

  }

  // Query Committe Finalize Vote
  public async getRevealCommitte(contractAddress: string,): Promise<any> {
    await this.prepareDeps();

    const result = await this.secretjs.queryContractSmart(contractAddress,
      {
        reveal_committee: {},
      }
    )
    return {
      revealers_number: result.reveal_committee.committee.n,
      revealers: result.reveal_committee.committee.revealers,
    };

  }

  public async getChoices(contractAddress: string,): Promise<any> {
    await this.prepareDeps();

    const result = await this.secretjs.queryContractSmart(contractAddress,
      {
        choices: {}
      },
    )
    return result;
  }

  public async voteInfo(contractAddress: string,): Promise<any> {
    await this.prepareDeps();
    const result = await this.secretjs.queryContractSmart(contractAddress,
      {
        vote_info: {}
      },
    )
    return {
      finalized: result.vote_info.config.finalized,
      valid: result.vote_info.config.valid
    }

  }

  public async hasVote(contractAddress: string,): Promise<any> {

    const client = this.secretjs || this.initSecretJS(process.env.SECRET_LCD, false);
    const result = await client.queryContractSmart(contractAddress,
      {
        has_voted: {
          voter: this.address
        }
      },
    )
    return result.has_voted.has_voted;
  }


  public async getNumberOfVoters(contractAddress: string): Promise<any> {
    await this.prepareDeps();
    const result = await this.secretjs.queryContractSmart(contractAddress,
      {
        number_of_voters: {}
      },
    )
    return result.number_of_voters.count;
  }

  public async revealed(contractAddress: string): Promise<any> {
    await this.prepareDeps();
    const result = await this.secretjs.queryContractSmart(contractAddress,
      {
        revealed: {}
      },
    )
    return {
      num_revealed: result.revealed.num_revealed,
      required: result.revealed.required,
      revelead: result.revealed.revealed
    };
  }

  public async rollingHash(contractAddress: string): Promise<any> {
    await this.prepareDeps();
    const result = await this.secretjs.queryContractSmart(contractAddress,
      {
        rolling_hash: {}
      },
    )
    return result.rolling_hash.hash;
  }

  public async getMinimumStake(): Promise<any> {
    await this.prepareDeps();
    const result = await this.secretjs.queryContractSmart(process.env.FACTORY_CONTRACT,
      {
        minimum_stake: {}
      },
    )
    return parseInt(result.minimum_stake.amount);
  }

  prepareDeps = async () => {
    await this.keplrCheckPromise;
    this.secretjs = this.secretjs || this.initSecretJS(process.env.SECRET_LCD, false);
  }

  // Query Proposal Normal Vote
  public async userVote(contractAddress: string): Promise<any> {
    // TODO This is not supposed to be here, but was neccesary, cuz, the way it is
    // right now, doesn't work. Please be kind, do not remove this line :).
    await this.prepareDeps();

    const viewingKey = await getViewingKey({
      keplr: this.keplrWallet,
      chainId: this.chainId,
      address: process.env.SEFI_STAKING_CONTRACT,
    });

    if (!viewingKey) return;

    const query = {
      vote: {
        voter: this.address,
        key: viewingKey
      }
    };

    const result = await this.secretjs.queryContractSmart(contractAddress, query);

    return {
      choice: parseInt(result.vote.choice),
      voting_power: parseFloat(result.vote.voting_power) / (Math.pow(10, 6))
    }
  }

  public updateLocalCSHBKData(sefi: number, cashback: string) {
    const sefi_earned = localStorage.getItem('total_sefi_earned')
    const cb_received = localStorage.getItem('total_cb_received')

    if (sefi_earned) {
      const total_sefi_earned = parseFloat(sefi_earned) + sefi;
      localStorage.setItem('total_sefi_earned', total_sefi_earned.toString())
    } else {
      localStorage.setItem('total_sefi_earned', sefi.toString())
    }
    if (cb_received) {
      const total_cb_received = parseFloat(cb_received) + parseFloat(cashback);
      localStorage.setItem('total_cb_received', total_cb_received.toString())
    } else {
      localStorage.setItem('total_cb_received', cashback)
    }
  }

  public async getIsSupported(pairAddress: string): Promise<boolean> {
    try {
      if (pairAddress) {
        let { is_supported: result } = await this.secretjs.queryContractSmart(process.env.MINTER_CONTRACT, { is_supported: { pair: pairAddress } });
        return result?.is_supported;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }
  private async refreshTokenBalance(symbol: string) {
    const token = this.stores.tokens.allData.find(t => t.display_props.symbol === symbol);

    // console.log(token)
    if (!token) {
      return;
    }

    try {
      const balance = await this.getSnip20Balance(token.dst_address, token.decimals);
      this.balanceToken[token.dst_address] = balance;
    } catch (err) {
      this.balanceToken[token.dst_address] = unlockToken;
    }

    try {
      this.balanceTokenMin[token.dst_address] = token.display_props.min_from_scrt;
    } catch (e) {
      console.log(`unknown error: ${e}`);
    }
  }
  async refreshTokenBalanceByAddress(address: string) {
    const token = this.stores.tokens.allData.find(t => t.dst_address === address);

    // console.log(token)
    if (!token) {
      return;
    }

    try {
      const balance = await this.getSnip20Balance(token.dst_address, token.decimals);
      this.balanceToken[token.dst_address] = balance;
    } catch (err) {
      this.balanceToken[token.dst_address] = unlockToken;
    }

    try {
      this.balanceTokenMin[token.dst_address] = token.display_props.min_from_scrt;
    } catch (e) {
      console.log(`unknown error: ${e}`);
    }
  }

  async refreshRewardsBalances(symbol: string, address?: string) {
    let rewardsToken;
    if (address) {
      rewardsToken = this.stores.rewards.allData.find(t => {
        return t.pool_address === address;
      });
    } else {
      rewardsToken = this.stores.rewards.allData.find(t => {
        return t.inc_token.symbol.toLowerCase() === symbol.toLowerCase();
      });
    }
    if (!rewardsToken) {
      // old style rewards token (earn page)
      rewardsToken = this.stores.rewards.allData.find(t => {
        return t.inc_token.symbol.toLowerCase().includes(symbol.toLowerCase());
      });

      if (!rewardsToken) {
        console.log('No rewards token for', symbol);
        throw new Error(`No rewards token for ${symbol}`);
      }
    }

    try {
      const balance = await this.getBridgeRewardsBalance(rewardsToken.pool_address, false);

      if (balance.includes(unlockToken)) {
        this.balanceRewards[rewardsKey(rewardsToken.pool_address)] = balance;
      } else {
        // rewards are in the rewards_token decimals
        this.balanceRewards[rewardsKey(rewardsToken.pool_address)] = divDecimals(
          balance,
          rewardsToken.rewards_token.decimals,
        ); //divDecimals(balance, token.inc_token.decimals);
      }
    } catch (err) {
      this.balanceRewards[rewardsKey(rewardsToken.pool_address)] = unlockToken;
    }

    try {
      const balance = await this.getBridgeDepositBalance(rewardsToken.pool_address);

      if (balance.includes(unlockToken)) {
        this.balanceRewards[rewardsDepositKey(rewardsToken.pool_address)] = balance;
      } else {
        this.balanceRewards[rewardsDepositKey(rewardsToken.pool_address)] = divDecimals(
          balance,
          rewardsToken.inc_token.decimals,
        );
      }
    } catch (err) {
      this.balanceRewards[rewardsDepositKey(rewardsToken.pool_address)] = unlockToken;
    }

    try {
      const balance = await this.getSnip20Balance(
        rewardsToken.rewards_token.address,
        rewardsToken.rewards_token.decimals,
      );

      if (balance.includes(unlockToken)) {
        this.balanceRewards[rewardsToken.rewards_token.address] = balance;
      } else {
        this.balanceRewards[rewardsToken.rewards_token.address] = divDecimals(
          balance,
          rewardsToken.rewards_token.decimals,
        );
      }
    } catch (err) {
      this.balanceRewards[rewardsToken.rewards_token.address] = unlockToken;
    }
    // console.log(this.balanceRewards)
  }

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
        isInfoEarnReadingSecret3: this.isInfoEarnReading,
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
    // this.rates = Object.assign(
    //   {},
    //   ...this.stores.tokens.allData
    //     .filter(token => token.src_address === 'native')
    //     .map(token => {
    //       let network = networkFromToken(token);
    //       return {
    //         [network]: token.price,
    //       };
    //     }),
    // );

    this.scrtRate = Number(
      this.stores.tokens.allData.find(token => token.display_props.symbol.toUpperCase() === 'SSCRT').price,
    );

    // fallback to binance prices
    if (isNaN(this.scrtRate) || this.scrtRate === 0) {
      const scrtbtc = await agent.get<{ body: IOperation }>(
        'https://api.binance.com/api/v1/ticker/24hr?symbol=SCRTBTC',
      );
      const btcusdt = await agent.get<{ body: IOperation }>(
        'https://api.binance.com/api/v1/ticker/24hr?symbol=BTCUSDT',
      );

      this.scrtRate = scrtbtc.body.lastPrice * btcusdt.body.lastPrice;
    }
  }

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
  @action public async getRewardToken(tokenAddress: string): Promise<RewardsToken> {
    try {
      stores.rewards.init({
        isLocal: true,
        sorter: 'none',
        pollingInterval: 20000,
      });
      stores.rewards.fetch();
      stores.tokens.init();
      const getFilteredTokens = async () => {
        if (stores.tokens.allData.length > 0) {
          await sleep(500);
          return (stores.tokens.tokensUsageSync('LPSTAKING'));
        } else {
          return undefined
        }
      };

      while (stores.rewards.isPending) {
        await sleep(100);
      }
      const filteredTokens = await getFilteredTokens();
      const mappedRewards = stores.rewards.allData
        .filter(rewards => filteredTokens?.find(element => element.dst_address === rewards.inc_token.address))
        .map(reward => {
          return { reward, token: filteredTokens?.find(element => element.dst_address === reward.inc_token.address) };
        });
      while (!stores.user.secretjs || stores.tokens.isPending) {
        await sleep(100);
      }
      await stores.user.refreshTokenBalanceByAddress(tokenAddress);
      const reward_tokens = mappedRewards
        .slice()
        .filter(rewardToken => (process.env.TEST_COINS ? true : !rewardToken.reward.hidden))
        //@ts-ignore
        .map(rewardToken => {
          const rewardsToken: RewardsToken = {
            rewardsContract: rewardToken.reward.pool_address,
            lockedAsset: rewardToken.reward.inc_token.symbol,
            lockedAssetAddress: rewardToken.token.dst_address,
            totalLockedRewards: divDecimals(
              Number(rewardToken.reward.total_locked) * Number(rewardToken.reward.inc_token.price),
              rewardToken.reward.inc_token.decimals,
            ),
            rewardsDecimals: String(rewardToken.reward.rewards_token.decimals),
            rewards: stores.user.balanceRewards[rewardsKey(rewardToken.token.dst_address)],
            deposit: stores.user.balanceRewards[rewardsDepositKey(rewardToken.token.dst_address)],
            balance: stores.user.balanceToken[rewardToken.token.dst_address],
            decimals: rewardToken.token.decimals,
            name: rewardToken.token.name,
            price: String(rewardToken.reward.inc_token.price),
            rewardsPrice: String(rewardToken.reward.rewards_token.price),
            display_props: rewardToken.token.display_props,
            remainingLockedRewards: rewardToken.reward.pending_rewards,
            deadline: Number(rewardToken.reward.deadline),
            rewardsSymbol: 'SEFI',
          };

          if (rewardsToken.rewardsContract === tokenAddress) {
            return rewardsToken;
          }
        });
      return reward_tokens.filter(e => e !== undefined)[0];
    } catch (error) {
      console.error(error)
      return undefined;
    }


  }
}
