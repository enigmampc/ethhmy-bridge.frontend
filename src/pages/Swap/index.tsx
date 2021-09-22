import React, { useEffect } from 'react';
import { Box } from 'grommet';
import * as styles from '../FAQ/faq-styles.styl';
import { PageContainer } from 'components/PageContainer';
import { BaseContainer } from 'components/BaseContainer';
import { useStores } from 'stores';
import { fixUnlockToken, sleep, unlockToken } from 'utils';
import { UserStoreEx } from 'stores/UserStore';
import { observer } from 'mobx-react';
import { SwapTab } from './SwapTab';
import { ProvideTab } from './ProvideTab';
import { WithdrawTab } from './WithdrawTab';
import { BigNumber } from 'bignumber.js';
import { getNativeBalance, unlockJsx, wrongViewingKey } from './utils';
import { BetaWarning } from '../../components/Swap/BetaWarning';
import { SwapFooter } from './Footer';
import { GetSnip20Params } from '../../blockchain-bridge';
import { loadTokensFromList } from './LocalTokens/LoadTokensFromList';
import { ISecretSwapPair, ITokenInfo } from '../../stores/interfaces';
import { Tokens } from '../../stores/Tokens';
import { getSymbolsFromPair } from '../../blockchain-bridge/scrt/swap';
import { SwapToken, SwapTokenMap, TokenMapfromITokenInfo } from './types/SwapToken';
import LocalStorageTokens from '../../blockchain-bridge/scrt/CustomTokens';
import cogoToast from 'cogo-toast';
import { pairIdFromTokenIds, PairMap, SwapPair } from './types/SwapPair';
import { KeplrButton } from '../../components/Secret/KeplrButton';
import { NativeToken, Token } from './types/trade';
import { SecretSwapPairs } from 'stores/SecretSwapPairs';
import Graph from 'node-dijkstra';
import { SecretSwapPools } from 'stores/SecretSwapPools';

export const SwapPageWrapper = observer(() => {
  window.location.href = 'https://app.secretswap.io/swap';

  // SwapPageWrapper is necessary to get the user store from mobx 🤷‍♂️
  let { user, tokens, secretSwapPairs, secretSwapPools } = useStores();

  useEffect(() => {
    secretSwapPairs.init({
      isLocal: true,
      sorter: 'none',
      pollingInterval: 60000,
    });
    secretSwapPairs.fetch();

    if (process.env.ENV !== 'DEV') {
      tokens.init();

      secretSwapPools.init({
        isLocal: true,
        sorter: 'none',
        pollingInterval: 20000,
      });
      secretSwapPools.fetch();
    }
  }, []);

  if (process.env.ENV === 'DEV') {
    tokens = { allData: JSON.parse(process.env.AMM_TOKENS) } as Tokens;
    secretSwapPairs = { allData: JSON.parse(process.env.AMM_PAIRS) } as SecretSwapPairs;
    secretSwapPools = null;
  }

  return <SwapRouter user={user} tokens={tokens} pairs={secretSwapPairs} pools={secretSwapPools} />;
});

export class SwapRouter extends React.Component<
  {
    user: UserStoreEx;
    tokens: Tokens;
    pairs: SecretSwapPairs;
    pools: SecretSwapPools;
  },
  {
    allTokens: SwapTokenMap;
    balances: { [symbol: string]: BigNumber | JSX.Element };
    pairs: PairMap;
    selectedPair: SwapPair | undefined;
    selectedToken0: string;
    selectedToken1: string;
    queries: string[];
    routerSupportedTokens: Set<string>;
    routerOnline: boolean;
    routingGraph: { [token0: string]: { [token1: string]: number } };
    selectedPairRoutes: string[][];
    keplrConnected: boolean;
  }
> {
  private symbolUpdateHeightCache: { [symbol: string]: number } = {};
  private ws: WebSocket;
  private pairRefreshInterval;

  constructor(props: { user: UserStoreEx; tokens: Tokens; pairs: SecretSwapPairs; pools: SecretSwapPools }) {
    super(props);
    this.state = {
      allTokens: new Map<string, SwapToken>(),
      balances: {},
      pairs: new Map<string, SwapPair>(),
      selectedPair: undefined,
      selectedToken0: process.env.SSCRT_CONTRACT,
      selectedToken1: '',
      queries: [],
      routerSupportedTokens: new Set(),
      routerOnline: false,
      routingGraph: {},
      selectedPairRoutes: [],
      keplrConnected: undefined,
    };
  }

  onHashChange = () => {
    this.forceUpdate();
  };

  symbolFromAddress = (identifier: string) => {
    return this.state.allTokens.get(identifier)?.symbol;
  };

  async componentDidUpdate(previousProps, prevState) {
    if (previousProps.tokens.allData.length !== this.props.tokens.allData.length) {
      console.log('updated pairs');
      await this.updateTokens();
    }

    if (previousProps.pairs.allData.length !== this.props.pairs.allData.length) {
      console.log('updated pairs');
      await this.updatePairs();
    }

    const newBalances = {};
    let updateState = false;
    const { selectedToken0, selectedToken1 } = this.state;

    // this happens 3 times since setting state takes time (or maybe because componentDidUpdate gets called 3 times when
    // keplr connects. Either way this should be fine as it doesn't happen very often
    if (this.props.user.secretjs && prevState.keplrConnected === false) {
      newBalances[selectedToken0] = await this.refreshTokenBalance(selectedToken0);
      newBalances[selectedToken1] = await this.refreshTokenBalance(selectedToken1);
      this.setState(currentState => ({ balances: { ...currentState.balances, ...newBalances }, keplrConnected: true }));
    }

    if (selectedToken0 !== prevState.selectedToken0 && selectedToken0 !== prevState.selectedToken1) {
      updateState = true;
      newBalances[selectedToken0] = await this.refreshTokenBalance(selectedToken0);
    }

    if (selectedToken1 !== prevState.selectedToken0 && selectedToken1 !== prevState.selectedToken1) {
      updateState = true;
      newBalances[selectedToken1] = await this.refreshTokenBalance(selectedToken1);
    }

    if (updateState) {
      this.setState(currentState => ({ balances: { ...currentState.balances, ...newBalances } }));
    }
  }

  async componentDidMount() {
    window.onhashchange = this.onHashChange;
    window.addEventListener('storage', this.updateTokens);
    window.addEventListener('updatePairsAndTokens', this.updatePairs);

    await this.updateTokens();

    while (this.props.pairs.isPending || this.props.tokens.isPending) {
      await sleep(100);
    }

    let sScrtBalance: { [symbol: string]: BigNumber | JSX.Element } = {
      [process.env.SSCRT_CONTRACT]: new BigNumber('0'),
    };
    let keplrConnected = false;
    // wait for 1 second before deciding that Keplr won't connect
    for (let i = 0; i < 10; i++) {
      if (this.props.user.secretjs) {
        sScrtBalance = { [process.env.SSCRT_CONTRACT]: await this.refreshTokenBalance(process.env.SSCRT_CONTRACT) };
        keplrConnected = true;
        break;
      }
      await sleep(100);
    }

    this.setState({ balances: { ...this.state.balances, ...sScrtBalance }, keplrConnected });
    await this.updatePairs();

    if (process.env.ENV !== 'DEV') {
      while (this.state.pairs.size === 0) {
        await sleep(200);
      }
      this.pairRefreshInterval = setInterval(this.reloadPairData(), 1000);
    }

    while (true) {
      try {
        const routerSupportedTokens: Set<string> = new Set(
          await this.props.user.secretjs.queryContractSmart(process.env.AMM_ROUTER_CONTRACT, {
            supported_tokens: {},
          }),
        );
        routerSupportedTokens.add('uscrt');
        this.setState({ routerSupportedTokens, routerOnline: true }, this.updateRoutingGraph);
        return;
      } catch (error) {
        console.log('Retrying to get supported tokens from router');
        await sleep(3000);
      }
    }
  }

  private reloadPairData() {
    return () => {
      const balances = {};
      for (const pool of this.props.pools.allData) {
        let id0: string;
        let id1: string;
        if ('native_token' in pool.assets[0].info) {
          id0 = pool.assets[0].info.native_token.denom;
        } else {
          id0 = pool.assets[0].info.token.contract_addr;
        }
        if ('native_token' in pool.assets[1].info) {
          id1 = pool.assets[1].info.native_token.denom;
        } else {
          id1 = pool.assets[1].info.token.contract_addr;
        }

        const pair = this.state.pairs.get(`${id0}${SwapPair.id_delimiter}${id1}`);

        if (!pair) {
          // pairs or tokens aren't loaded yet
          continue;
        }

        if (
          !new BigNumber(this.state.balances[`${pair.liquidity_token}-total-supply`] as any).isEqualTo(
            new BigNumber(pool.total_share),
          )
        ) {
          balances[`${pair.liquidity_token}-total-supply`] = new BigNumber(pool.total_share);
        }

        const pool0 = `${id0}-${pair.identifier()}`;
        const pool0Amount = new BigNumber(pool.assets[0].amount);

        if (!new BigNumber(this.state.balances[pool0] as any).isEqualTo(pool0Amount)) {
          balances[pool0] = pool0Amount;
        }

        const pool1 = `${id1}-${pair.identifier()}`;
        const pool1Amount = new BigNumber(pool.assets[1].amount);

        if (!new BigNumber(this.state.balances[pool1] as any).isEqualTo(pool1Amount)) {
          balances[pool1] = pool1Amount;
        }
      }
      if (Object.keys(balances).length > 0) {
        this.setState(currentState => ({ balances: { ...currentState.balances, ...balances } }));
      }
    };
  }

  private async refreshBalances({ pair, tokens, height }: { tokens: string[]; pair?: SwapPair; height?: number }) {
    if (!height) {
      height = await this.props.user.secretjs.getHeight();
    }

    //console.log(`Hello from refreshBalances for height: ${height}`);
    const tokenBalances = (
      await Promise.all(
        tokens.map(async s => {
          return { [s]: await this.refreshTokenBalance(s, height) };
        }),
      )
    ).reduce((balances, value) => {
      return { ...balances, ...value };
    }, {});

    // these will return a list of promises, which we will flatten then map to a single object
    const balanceTasks = [];
    if (pair) {
      balanceTasks.push(this.refreshLpTokenBalance(pair));
      if (process.env.ENV === 'DEV') {
        balanceTasks.push(this.refreshPoolBalance(pair));
      }
    }

    //console.log('refreshing balances..');

    const results = await Promise.all([...balanceTasks]);

    //console.log(`balances: ${JSON.stringify(results)}`);

    // flatten array to a single object
    const newObject = Object.assign(
      {},
      ...results.flat().map(item => ({ [Object.keys(item)[0]]: Object.values(item)[0] })),
    );

    this.setState(currentState => ({
      balances: {
        ...currentState.balances,
        ...newObject,
        ...tokenBalances,
      },
    }));

    return newObject;
  }

  private async refreshPoolBalance(pair: SwapPair) {
    const balances = [];

    if (process.env.ENV === 'DEV') {
      try {
        let res: {
          assets: Array<{ amount: string; info: Token | NativeToken }>;
          total_share: string;
        } = await this.props.user.secretjs.queryContractSmart(pair.contract_addr, {
          pool: {},
        });

        const amount0 = new BigNumber(res.assets[0].amount);
        const amount1 = new BigNumber(res.assets[1].amount);
        if ('native_token' in res.assets[0].info) {
          balances.push({
            [`${res.assets[0].info.native_token.denom}-${pair.identifier()}`]: amount0,
          });
        } else {
          balances.push({
            [`${res.assets[0].info.token.contract_addr}-${pair.identifier()}`]: amount0,
          });
        }
        if ('native_token' in res.assets[1].info) {
          balances.push({
            [`${res.assets[1].info.native_token.denom}-${pair.identifier()}`]: amount1,
          });
        } else {
          balances.push({
            [`${res.assets[1].info.token.contract_addr}-${pair.identifier()}`]: amount1,
          });
        }
      } catch (error) {
        this.notify('error', `Error getting pools' balances for ${pair.identifier()}: ${error.message}`);
      }
    }

    return balances;
  }

  private async refreshTokenBalance(tokenIdentifier: string, height?: number): Promise<JSX.Element | BigNumber> {
    if (height && height <= this.symbolUpdateHeightCache[tokenIdentifier]) {
      //console.log(`${tokenSymbol} already fresh for height ${height}`);
      return undefined;
    }

    if (height) {
      this.symbolUpdateHeightCache[tokenIdentifier] = height;
    }

    let userBalance; //balance.includes(unlockToken)

    if (tokenIdentifier === 'uscrt') {
      userBalance = await getNativeBalance(this.props.user.address, this.props.user.secretjs);
      //this.props.user.balanceSCRT = userBalance.toString();
      return userBalance;
    }

    let balance = await this.props.user.getSnip20Balance(tokenIdentifier);

    userBalance = this.displayedBalance(balance, tokenIdentifier);

    return userBalance;
  }

  private displayedBalance(balance: string, tokenIdentifier: string) {
    if (balance === unlockToken) {
      return unlockJsx({
        onClick: async () => {
          await this.props.user.keplrWallet.suggestToken(this.props.user.chainId, tokenIdentifier);
          // TODO trigger balance refresh if this was an "advanced set" that didn't
          // result in an on-chain transaction
        },
      });
    } else if (balance === fixUnlockToken) {
      return wrongViewingKey;
    } else {
      return new BigNumber(balance);
    }
  }

  private async refreshLpTokenBalance(pair: SwapPair) {
    let returnBalances = [];

    const pairSymbol = pair.identifier();
    console.log('Refresh LP token for', pairSymbol);
    // update my LP token balance
    const lpTokenSymbol = `LP-${pairSymbol}`;
    const lpTokenAddress = pair.liquidity_token;
    if (process.env.ENV === 'DEV') {
      let lpTotalSupply = new BigNumber(0);
      try {
        const result = await GetSnip20Params({
          address: pair.liquidity_token,
          secretjs: this.props.user.secretjs,
        });
        lpTotalSupply = new BigNumber(result.total_supply);
        returnBalances.push({
          [`${lpTokenAddress}-total-supply`]: lpTotalSupply,
        });
      } catch (error) {
        console.error(`Error trying to get LP token total supply of ${pairSymbol}`, pair, error);
        return [];
      }
    }

    let balanceResult = await this.props.user.getSnip20Balance(lpTokenAddress);
    let lpBalance;
    if (balanceResult === unlockToken) {
      balanceResult = unlockJsx({
        onClick: async () => {
          await this.props.user.keplrWallet.suggestToken(this.props.user.chainId, lpTokenAddress);
          // TODO trigger balance refresh if this was an "advanced set" that didn't
          // result in an on-chain transaction
          await this.refreshLpTokenBalance(pair);
        },
      });
      lpBalance = balanceResult;
    } else if (balanceResult === fixUnlockToken) {
      lpBalance = wrongViewingKey;
    } else {
      lpBalance = new BigNumber(balanceResult);
    }

    returnBalances.push({
      [lpTokenSymbol]: lpBalance,
    });

    return returnBalances;
  }

  async componentWillUnmount() {
    //this.props.user.websocketInit();

    // if (this?.ws) {
    //   while (this.ws.readyState === WebSocket.CONNECTING) {
    //     await sleep(100);
    //   }
    //
    //   if (this.ws.readyState === WebSocket.OPEN) {
    //     this.ws.close(1000 /* Normal Closure */, 'See ya');
    //   }
    // }
    if (process.env.ENV !== 'DEV') {
      clearInterval(this.pairRefreshInterval);
    }
    window.onhashchange = null;
    window.removeEventListener('storage', this.updateTokens);
    window.removeEventListener('updatePairsAndTokens', this.updatePairs);
  }

  updateTokens = async () => {
    //console.log(...this.props.tokens.allData);
    const tokens: ITokenInfo[] = [...(await this.props.tokens.tokensUsage('SWAP'))];

    // convert to token map for swap
    const swapTokens: SwapTokenMap = TokenMapfromITokenInfo(tokens); // [...TokenMapfromITokenInfo(tokens), ...loadTokensFromList('secret-3')];

    // load custom tokens
    const customTokens = LocalStorageTokens.get();
    customTokens.forEach(t => {
      swapTokens.set(t.identifier, t);
    });

    //load hardcoded tokens (scrt, atom, etc.)
    for (const t of loadTokensFromList(this.props.user.chainId || process.env.CHAIN_ID)) {
      swapTokens.set(t.identifier, t);
    }

    this.setState({ allTokens: swapTokens });
    if (!this.state.routerOnline) {
      this.setState(
        { routerSupportedTokens: new Set(swapTokens.keys()), routerOnline: false },
        this.updateRoutingGraph,
      );
    }

    return swapTokens;
  };

  setCurrentPair = async (token0: string, token1: string) => {
    const selectedPair: SwapPair = this.state.pairs.get(pairIdFromTokenIds(token0, token1));

    while (Object.keys(this.state.routingGraph).length === 0) {
      await sleep(100);
    }

    const routes: string[][] = [];
    // if (!selectedPair) {
    let graph = JSON.parse(JSON.stringify(this.state.routingGraph)); // deep copy
    try {
      while (true) {
        const dijkstra = new Graph(graph);
        const route: string[] = dijkstra.path(token0, token1) ?? [];

        if (route.length < 2) {
          break;
        }
        routes.push(route);

        delete graph[route[0]][route[1]];
        delete graph[route[1]][route[0]];
      }
    } catch (e) {
      console.error('Error computing selectedPairRoutes:', e.message);
    }
    // }

    this.setState({
      selectedPair: selectedPair,
      selectedPairRoutes: routes,
    });

    //this.refreshBalances({ tokens: [token0, token1], pair: selectedPair });
  };

  updatePairs = async () => {
    // gather tokens from our list, and from local storage
    const tokens = await this.updateTokens();

    while (this.props.pairs.allData.length === 0) {
      await sleep(100);
    }

    let pairs: ISecretSwapPair[] = Array.from(this.props.pairs.allData);
    // filter all pairs that aren't known tokens
    pairs = pairs.filter(p => {
      const pairSymbols = getSymbolsFromPair(p);
      for (const s of pairSymbols) {
        if (!tokens.has(s)) {
          return false;
        }
      }

      return !(pairSymbols.includes('uscrt') && !pairSymbols.includes(process.env.SSCRT_CONTRACT));
    });

    const newPairs: PairMap = new Map<string, SwapPair>();

    for (const p of pairs) {
      try {
        const newPair = SwapPair.fromPair(p, tokens);
        newPairs.set(newPair.identifier(), newPair);
        newPairs.set(
          newPair
            .identifier()
            .split(SwapPair.id_delimiter)
            .reverse()
            .join(SwapPair.id_delimiter),
          newPair,
        );
      } catch (error) {
        console.error(error);
      }
    }

    this.setState({ pairs: newPairs }, this.updateRoutingGraph);
  };

  updateRoutingGraph = () => {
    const { pairs, routerSupportedTokens } = this.state;

    const graph = {};
    for (const pair of new Set(pairs.values())) {
      const [token0, token1] = pair.assetIds();
      if (!routerSupportedTokens.has(token0) || !routerSupportedTokens.has(token1)) {
        continue;
      }

      if (!(token0 in graph)) {
        graph[token0] = {};
      }
      if (!(token1 in graph)) {
        graph[token1] = {};
      }

      graph[token0][token1] = 1;
      graph[token1][token0] = 1;
    }

    this.setState({ routingGraph: graph });
  };

  notify(type: 'success' | 'error' | 'errorWithHash', msg: string, hideAfterSec: number = 120, txHash?: string) {
    let cogoType: string = type;
    if (type === 'error') {
      msg = msg.replaceAll('Failed to decrypt the following error message: ', '');
      msg = msg.replace(/\. Decryption error of the error message:.+?/, '');
    }

    let onClick = () => {
      hide();
    };
    if (type === 'errorWithHash') {
      cogoType = 'warn';
      onClick = () => {
        const url = `https://secretnodes.com/secret/chains/secret-3/transactions/${txHash}`;
        const win = window.open(url, '_blank');
        win.focus();
        hide();
      };
    }

    const { hide } = cogoToast[cogoType](msg, {
      position: 'top-right',
      hideAfter: hideAfterSec,
      onClick,
    });
    // NotificationManager[type](undefined, msg, closesAfterMs);
  }

  render() {
    const isSwap = window.location.hash === '#Swap';
    const isProvide = window.location.hash === '#Provide';
    const isWithdraw = window.location.hash === '#Withdraw';
    const isPools = window.location.hash === '#Pool';
    const isHistory = window.location.hash === '#History';

    if (!isSwap && !isProvide && !isWithdraw && !isPools && !isHistory) {
      window.location.hash = 'Swap';
      return <></>;
    }

    return (
      <BaseContainer>
        <PageContainer>
          <Box
            className={styles.faqContainer}
            pad={{ horizontal: 'large', top: 'large' }}
            style={{ alignItems: 'center' }}
          >
            <Box
              style={{
                maxWidth: '420px',
                minWidth: '420px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
              pad={{ bottom: 'medium' }}
            >
              <KeplrButton />
              {isSwap && (
                <SwapTab
                  user={this.props.user}
                  secretjs={this.props.user.secretjs}
                  secretjsSender={this.props.user.secretjsSend}
                  tokens={this.state.allTokens}
                  balances={this.state.balances}
                  selectedPair={this.state.selectedPair}
                  selectedToken0={this.state.selectedToken0}
                  selectedToken1={this.state.selectedToken1}
                  selectedPairRoutes={this.state.selectedPairRoutes}
                  notify={this.notify}
                  onSetTokens={async (token0, token1) => await this.onSetTokens(token0, token1)}
                  refreshPools={this.refreshBalances}
                  secretAddress={this.props.user.address}
                  pairs={this.state.pairs}
                  isLoadingSupportedTokens={!this.state.routerOnline}
                />
              )}
              {isProvide && (
                <ProvideTab
                  user={this.props.user}
                  secretjs={this.props.user.secretjs}
                  secretjsSender={this.props.user.secretjsSend}
                  tokens={this.state.allTokens}
                  balances={this.state.balances}
                  pairs={this.state.pairs}
                  selectedPair={this.state.selectedPair}
                  selectedToken0={this.state.selectedToken0}
                  selectedToken1={this.state.selectedToken1}
                  notify={this.notify}
                  onSetTokens={async (token0, token1) => await this.onSetTokens(token0, token1)}
                />
              )}
              {isWithdraw && (
                <WithdrawTab
                  user={this.props.user}
                  secretjs={this.props.user.secretjs}
                  secretjsSender={this.props.user.secretjsSend}
                  tokens={this.state.allTokens}
                  balances={this.state.balances}
                  pairs={this.state.pairs}
                  notify={this.notify}
                  updateToken={async (pair: SwapPair) => {
                    //this.registerPairQueries(pair);
                    await this.refreshBalances({
                      pair,
                      tokens: pair.assetIds(),
                    });
                  }}
                  onCloseTab={pair => {
                    //this.unSubscribePair(pair);
                  }}
                />
              )}
              {/* {isHistory && (
                <HistoryTab
                  user={this.props.user}
                  secretjs={this.props.user.secretjs}
                  tokens={this.state.allTokens}
                  balances={this.state.balances}
                  pairs={this.state.pairs}
                  notify={this.notify}
                  updateToken={async (pair: SwapPair) => {
                    this.registerPairQueries(pair);
                    await this.refreshBalances({
                      pair,
                      tokens: pair.assetIds(),
                    });
                  }}
                  onCloseTab={pair => {
                    this.unSubscribePair(pair);
                  }}
                />
              )} */}
            </Box>
            <SwapFooter />
            <BetaWarning secretjs={this.props.user.secretjsSend} />
          </Box>
        </PageContainer>
      </BaseContainer>
    );
  }

  private onSetTokens = async (token0, token1) => {
    this.setState(currentState => ({
      ...currentState,
      selectedToken0: token0,
      selectedToken1: token1,
    }));
    if (token0 && token1) {
      await this.setCurrentPair(token0, token1);
    }
  };
}
