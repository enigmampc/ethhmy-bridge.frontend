import { action, observable } from 'mobx';
import { statusFetching } from '../constants';
import detectEthereumProvider from '@metamask/detect-provider';
import { StoreConstructor } from './core/StoreConstructor';
import * as contract from '../blockchain-bridge';
import { getErc20Balance, getEthBalance, networkFromToken, NETWORKS } from '../blockchain-bridge';
import { divDecimals, sleep } from '../utils';
import Web3 from 'web3';
import { IOperation, TOKEN } from './interfaces';
import { chainProps, chainPropToString } from '../blockchain-bridge/eth/chainProps';
import * as agent from 'superagent';
import { NftDetails } from '../blockchain-bridge/eth/EthMethodsNftBridge';

const defaults = {};

interface ConnectInfo {
  chainId: string;
}
interface NetworkProps {
  mainnet: boolean;
  network: NETWORKS;
}

const chainIdMap: Record<string, NetworkProps> = {
  '0x1': { mainnet: true, network: NETWORKS.ETH },
  '0x2': { mainnet: false, network: NETWORKS.ETH },
  '0x3': { mainnet: false, network: NETWORKS.ETH },
  '0x4': { mainnet: false, network: NETWORKS.ETH },
  '0x5': { mainnet: false, network: NETWORKS.ETH },
  '0x2a': { mainnet: false, network: NETWORKS.ETH },
  '0x38': { mainnet: true, network: NETWORKS.BSC },
  '0x61': { mainnet: false, network: NETWORKS.BSC },
  '0x50': { mainnet: false, network: NETWORKS.PLSM },
};

const leaderMap: Record<NETWORKS, string> = {
  [NETWORKS.ETH]: process.env.LEADER_ACCOUNT_ETH,
  [NETWORKS.PLSM]: '',
  [NETWORKS.BSC]: process.env.LEADER_ACCOUNT_BSC,
  [NETWORKS.XMR]: '',
};

export interface IERC20Token {
  name: string;
  symbol: string;
  decimals: string;
  erc20Address: string;
}

export class UserStoreMetamask extends StoreConstructor {
  @observable public isAuthorized: boolean;
  @observable error: string = '';

  @observable public chainId: string;
  @observable public network: NETWORKS;

  @observable public mainnet: boolean;

  public status: statusFetching;
  public balancesLoading: boolean = false;
  @observable public isMetaMask = false;
  private provider: any;

  @observable public chainName: string;
  @observable public ethAddress: string;
  @observable public nativeBalance: string = '';
  @observable public balanceToken: { [key: string]: string } = {};
  //@observable public balanceTokenMin: { [key: string]: string } = {};
  @observable public rates: Record<NETWORKS, number>;
  @observable public availableNfts: NftDetails[] = [];


  @observable erc721Address: string = '';
  @observable erc721TokenDetails: IERC20Token;
  @observable erc20Balance: string = '';
  @observable erc20BalanceMin: string = '';

  constructor(stores) {
    super(stores);

    const session = localStorage.getItem('metamask_session');

    this.network = NETWORKS.ETH;

    const sessionObj = JSON.parse(session);

    if (sessionObj && sessionObj.ethAddress) {
      this.signIn();
    }

    if (sessionObj && sessionObj.erc20Address) {
      this.setToken(sessionObj.erc20Address);
    }
    this.getRates();
    this.getBalances();
    setInterval(() => {
      this.getRates();
      this.getBalances();
    }, 5000);
  }

  getLeaderAddress() {
    return leaderMap[this.network];
  }

  @action.bound
  handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      return this.setError('Please connect to MetaMask');
    } else {
      this.ethAddress = Web3.utils.toChecksumAddress(accounts[0]);
      this.syncLocalStorage();
    }
    this.getBalances();
  }

  @action public async getRates() {
    // this.rates = Object.assign(
    //   {},
    //   ...this.stores.tokens.allData
    //     .filter(token => token.src_address === 'native')
    //     .map(token => {
    //       let network = networkFromToken(token);
    //       return {
    //         [network]: Number(token.price),
    //       };
    //     }),
    // );

    if (isNaN(this.rates?.BSC) || this.rates?.BSC === 0) {
      const bnbUSDT = await agent.get<{ body: IOperation }>(
        'https://api.binance.com/api/v1/ticker/24hr?symbol=BNBUSDT',
      );
      this.rates.BSC = bnbUSDT.body.lastPrice;
    }
    if (isNaN(this.rates?.ETH) || this.rates?.ETH === 0) {
      const ethusdt = await agent.get<{ body: IOperation }>(
        'https://api.binance.com/api/v1/ticker/24hr?symbol=ETHUSDT',
      );
      this.rates.ETH = ethusdt.body.lastPrice;
    }
  }

  getNetworkPrice() {
    return this.rates[this.network];
  }

  getCurrencySymbol() {
    return chainPropToString(chainProps.currency_symbol, this.network || NETWORKS.ETH);
  }

  getNetworkFullName() {
    return chainPropToString(chainProps.full_name, this.network || NETWORKS.ETH);
  }

  getNetworkImage() {
    return chainPropToString(chainProps.image_logo, this.network || NETWORKS.ETH);
  }

  getNativeDecimals() {
    return chainPropToString(chainProps.decimals, this.network || NETWORKS.ETH);
  }

  getNetworkName(id: string) {
    switch (id) {
      case '0x1':
        return 'mainnet';
      case '0x2a':
        return 'kovan';
      case '0x3':
        return 'ropsten';
      case '0x4':
        return 'rinkeby';
      case '0x38':
        return 'BSC Mainnet';
      case '0x61':
        return 'BSC Testnet';
      case '0x50':
        return 'Plasm Testnet';
      default:
        return '';
    }
  }

  async isCorrectNetworkSelected() {
    console.log(`chain-id ${this.chainId}`)

    if (process.env.ENV === 'MAINNET') {
      //let result = chainIdMap[this.chainId]?.mainnet && chainIdMap[this.chainId]?.network === this.network;
      let result = this.chainId === "0x1";
      if (!result) {
        // if (this.network === NETWORKS.ETH) {
        //
        //
        // }
        await this.setupNetwork(1);
        // else if (this.network === NETWORKS.BSC) {
        //           this.setupNetwork(56);
        //         }
      }
      console.log(`chain-id result ${result}`)
      return result;
    }

    if (process.env.ENV === 'TESTNET') {
      return !chainIdMap[this.chainId]?.mainnet && chainIdMap[this.chainId]?.network === this.network;
    }

    console.log(`Could not identify chain: ${this.chainId}`);
    return false;
  }

  setupNetwork = async (chainId: number) => {
    const provider = await detectEthereumProvider();
    if (provider) {
      try {
        // if (chainId === 56) {
        //   // @ts-ignore
        //   await provider.request({
        //     method: 'wallet_addEthereumChain',
        //     params: [
        //       {
        //         chainId: `0x38`,
        //         chainName: 'Binance Smart Chain',
        //         nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        //         rpcUrls: ['https://bsc-dataseed.binance.org/'],
        //         blockExplorerUrls: ['https://bscscan.com/'],
        //       },
        //     ],
        //   });
        // }
        //else
        if (chainId === 1) {
          // @ts-ignore
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [
              {
                chainId: `0x1`,
                // chainName: 'Ethereum Mainnet',
                // nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                // rpcUrls: ['https://mainnet.infura.io/v3/undefined'],
                // blockExplorerUrls: ['https://etherscan.io']
              },
            ],
          });
        }
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    } else {
      console.error(
        `Can't setup the network with chainId: ${chainId} on metamask because window.ethereum is undefined`,
      );
      return false;
    }
  };

  @action.bound
  setError(error: string) {
    this.error = error;
    this.isAuthorized = false;
  }

  @action.bound
  public async signOut() {
    this.isAuthorized = false;
    this.nativeBalance = '';
    this.ethAddress = '';
    this.balanceToken = {};

    this.syncLocalStorage();
  }

  @action.bound
  public async signIn(isNew = false) {
    try {
      this.error = '';

      const provider = await detectEthereumProvider();

      // @ts-ignore
      if (provider !== window.ethereum) {
        console.error('Do you have multiple wallets installed?');
      }

      // @ts-ignore
      const chainId = await provider.request({ method: 'eth_chainId' });
      this.chainName = this.getNetworkName(chainId);

      // @ts-ignore
      provider.on('chainChanged', chainId => {
        this.chainName = this.getNetworkName(chainId);
        this.setNetworkFromChainId(chainId);
        this.getBalances();
      });

      if (!provider) {
        return this.setError('Metamask not found');
      }

      this.provider = provider;

      if (this.provider.chainId) {
        this.setNetworkFromChainId(this.provider.chainId);
      }

      this.provider.autoRefreshOnNetworkChange = false;

      this.provider.on('accountsChanged', this.handleAccountsChanged);

      this.provider.on('connect', async (connectInfo: ConnectInfo) => {
        this.isAuthorized = true;
        const params = await this.provider.request({
          method: 'eth_requestAccounts',
        });
        this.handleAccountsChanged(params);
        this.setNetworkFromChainId(connectInfo.chainId);
      });

      this.provider.on('disconnect', () => {
        this.isAuthorized = false;
        this.ethAddress = null;
      });

      try {
        if (isNew) {
          await new Promise((accept, reject) =>
            this.provider.send(
              {
                method: 'wallet_requestPermissions',
                params: [
                  {
                    eth_accounts: {},
                  },
                ],
              },
              err => (err ? reject(err) : accept('success')),
            ),
          );
        }

        this.isAuthorized = true;

        const params = await this.provider.request({
          method: 'eth_requestAccounts',
        });
        this.handleAccountsChanged(params);
      } catch (err) {
        if (err.code === 4001) {
          this.isAuthorized = false;
          this.ethAddress = null;
          this.syncLocalStorage();
          return this.setError('Please connect to MetaMask.');
        } else {
          console.error(err);
        }
      }
    } catch (e) {
      return this.setError(e.message);
    }
  }

  @action.bound
  setNetwork(network: NETWORKS) {
    this.network = network;
  }

  @action.bound
  private setNetworkFromChainId(chainId: string) {
    this.chainId = chainId;

    try {
      this.network = chainIdMap[chainId].network;
      this.mainnet = chainIdMap[chainId].mainnet;
    } catch (e) {
      console.error('Unknown chain ID, defaulting to ETH');
      this.network = NETWORKS.ETH;
    }
  }

  private syncLocalStorage() {
    localStorage.setItem(
      'metamask_session',
      JSON.stringify({
        ethAddress: this.ethAddress,
        erc721Address: this.erc721Address,
      }),
    );
  }

  @action.bound public getBalances = async () => {
    if (!this.ethAddress) {
      return;
    }

    this.balancesLoading = true;

    // while (this.stores.tokens.isPending) {
    //   await sleep(50);
    // }
    // always load native balance, because why not? And this bypasses race conditions with this.stores.tokens
    this.nativeBalance = await getEthBalance(this.ethAddress);

    this.availableNfts = await contract.evmMethods[this.network][TOKEN.ERC721].enumerateUserTokens(this.ethAddress);

    //
    // this.nativeBalanceMin = this.balanceTokenMin[this.getNetworkFullName()];
    //
    // for (const token of this.stores.tokens.allData.filter(t => networkFromToken(t) === this.network)) {
    //   if (token.src_address === 'native') {
    //     continue;
    //   }
    //   getErc20Balance(this.ethAddress, token.src_address).then(b => {
    //     this.balanceToken[token.src_coin] = b;
    //     //console.log(`hello from ${token.display_props.symbol} - ${JSON.stringify(this.balanceToken[token.src_coin])}`)
    //   });
    //   this.balanceTokenMin[token.src_coin] = token.display_props.min_to_scrt;
    // }

    this.balancesLoading = false;
  };

  @action.bound public setToken = async (tokens?) => {
    this.erc721TokenDetails = null;
    this.erc721Address = '';
    this.erc20Balance = '';
    //this.erc20BalanceMin = '';
    this.stores.userSecret.snip721Address = '';
    // this.stores.userSecret.snip20Balance = '';
    // this.stores.userSecret.snip20BalanceMin = '';

    this.erc721TokenDetails = await contract.evmMethods[this.network][TOKEN.ERC721].tokenDetails();

    this.erc721Address = '';
    // this.erc20Balance = divDecimals(
    //   await getErc20Balance(this.ethAddress, erc20Address),
    //   this.erc721TokenDetails.decimals,
    // );

    // this.erc20BalanceMin = this.stores.tokens.allData.find(
    //   t => t.src_address === erc20Address,
    // ).display_props.min_to_scrt;

    // if (tokens) {
    //   const token = tokens.allData.find(t => t.src_address === this.erc721Address);
    //   if (token.dst_address) {
    //     await this.stores.userSecret.updateBalanceForSymbol(token.display_props.symbol);
    //
    //     this.stores.userSecret.snip20Address = token.dst_address;
    //     this.stores.userSecret.snip20Balance = this.stores.userSecret.balanceToken[token.src_coin];
    //     this.stores.userSecret.snip20BalanceMin = this.stores.userSecret.balanceTokenMin[token.src_coin];
    //   }
    // }
  };

  @action public reset() {
    Object.assign(this, defaults);
  }
}
