import {
  IClaimProofDocument,
  INetworkBridgeHealth,
  IOperation,
  IRewardPool,
  ISecretSwapPair,
  ISecretSwapPool,
  ISecretToken,
  ISignerHealth,
  ISwap,
  ITokenInfo,
  tokenFromSecretToken,
} from '../stores/interfaces';
import * as agent from 'superagent';
import { SwapStatus } from '../constants';
import { ProxyTokens } from '../blockchain-bridge/eth/proxyTokens';
import { networkFromToken, NETWORKS } from '../blockchain-bridge';

const availableNetworks = [NETWORKS.ETH, NETWORKS.BSC]; //, NETWORKS.PLSM

const BACKENDS = {
  [NETWORKS.ETH]: process.env.BACKEND_URL,
  [NETWORKS.BSC]: process.env.BSC_BACKEND_URL,
  [NETWORKS.PLSM]: process.env.PLSM_BACKEND_URL,
};

const backendUrl = (network: NETWORKS, url) => {
  return `${BACKENDS[network]}${url}`;
};

export const getSushiPool = async (address: String) => {
  const res = await agent.get<any>(process.env.SUSHI_API).query({ address });
  return res.body;
};

export const createOperation = async (network: NETWORKS, params) => {
  const url = backendUrl(network, `/operations`);

  const res = await agent.post<IOperation>(url, params);

  return res.body;
};

export const updateOperation = async (network: NETWORKS, id: string, transactionHash: string) => {
  const url = backendUrl(network, `/operations/${id}`);

  const res = await agent.post<IOperation>(url, { transactionHash });

  return res.body;
};

export const getStatus = async (params): Promise<SwapStatus> => {
  const url = backendUrl(params.network, `/operations/${params.id}`);

  const res = await agent.get<IOperation>(url);

  if (res.body.swap) {
    return SwapStatus[SwapStatus[res.body.swap.status]];
  } else {
    return SwapStatus[SwapStatus[res.body.operation.status]];
  }
};

export const getOperation = async (network: NETWORKS, params): Promise<{ operation: IOperation; swap: ISwap }> => {
  const url = backendUrl(network, `/operations/${params.id}`);

  const res = await agent.get<{ body: { operation: IOperation; swap: ISwap } }>(url);

  return res.body;
};

export const getSwap = async (network: NETWORKS, id: string): Promise<IOperation> => {
  const url = backendUrl(network, `/swaps/${id}`);

  const res = await agent.get<{ body: IOperation }>(url);

  return res.body;
};

export const getOperations = async (params: any): Promise<{ content: ISwap[] }> => {
  //const url = backendUrl(params.network, '/swaps/');

  const urls = [];
  for (const network of availableNetworks) {
    urls.push(backendUrl(network, '/swaps/'));
  }

  let res = await Promise.all([
    ...urls.map(url => {
      return agent.get<{ body: { swaps: ISwap[] } }>(url, params);
    }),
  ]);

  //const res = await agent.get<{ body: ISwap[] }>(url, params);
  const swapArray: ISwap[] = res
    .flatMap(t => t.body.swaps)
    .sort((a, b) => {
      return a.created_on > b.created_on ? -1 : 1;
    });
  // const content = res.body.swaps;

  return { content: swapArray };
};

export const getTokensInfo = async (params: any): Promise<{ content: ITokenInfo[] }> => {
  let urls = [];
  //let secretTokenUrls = [];
  // fuck typescript Enums
  for (const network of availableNetworks) {
    urls.push(backendUrl(network, '/tokens/'));
  }
  //secretTokenUrls.push(backendUrl(NETWORKS.ETH, '/secret_tokens/'));
  //console.log(`urls: ${JSON.stringify(urls)}`);
  //console.log(`secretTokenUrls: ${JSON.stringify(secretTokenUrls)}`);
  //const secretTokenListUrl = backendUrl('/secret_tokens/');

  let tokens = await Promise.all([
    ...urls.map(url => {
      return agent.get<{ body: { tokens: ITokenInfo[] } }>(url, params);
    }),
  ]);

  // let secretTokens = await Promise.all(
  //   secretTokenUrls.map(secretTokenListUrl => {
  //     return agent.get<{ body: { tokens: ISecretToken[] } }>(secretTokenListUrl, params);
  //   }),
  // );

  const tokenArray: ITokenInfo[] = tokens.flatMap(t => t.body.tokens);
  try {
    let content = tokenArray
      .filter(t => (process.env.TEST_COINS ? true : !t.display_props?.hidden))
      .map(t => {
        if (t.display_props.proxy) {
          t.display_props.proxy_address = t.dst_address;
          try {
            const proxyToken = ProxyTokens[t.display_props.symbol.toUpperCase()][networkFromToken(t)];
            t.dst_address = proxyToken.token;
            t.display_props.proxy_symbol = proxyToken.proxySymbol;
          } catch (e) {
            console.log(`Failed to parse proxy token ${t?.display_props?.symbol?.toUpperCase()}`);
            return undefined;
          }
        }

        return t;
      })
      .filter(t => !!t)
      .map(t => {
        if (t.display_props?.usage === undefined) {
          t.display_props.usage = ['BRIDGE', 'REWARDS', 'SWAP'];
        }
        //t.display_props.symbol = t.display_props.symbol.split('(')[0];
        return t;
      });
    // const secretTokenArray: ISecretToken[] = secretTokens.flatMap(t => t.body.tokens);
    //
    // let sTokens = secretTokenArray.map(t => {
    //   return tokenFromSecretToken(t);
    // });
    //
    // content.push(...sTokens);

    return { content };
  } catch (e) {
    console.error(e);
    return { content: undefined };
  }
};

export const getSecretSwapPairs = async (params: any): Promise<{ content: ISecretSwapPair[] }> => {
  const url = backendUrl(NETWORKS.ETH, '/secretswap_pairs/');

  const res = await agent.get<{ body: ISecretSwapPair[] }>(url, params);

  const content = res.body.pairs;

  return { content: content };
};

export const getSecretSwapPools = async (params: any): Promise<{ content: ISecretSwapPool[] }> => {
  const url = backendUrl(NETWORKS.ETH, '/secretswap_pools/');

  const res = await agent.get<{ body: ISecretSwapPool[] }>(url, params);

  const content = res.body.pools;

  return { content: content };
};

export const getSignerHealth = async (): Promise<{ content: INetworkBridgeHealth[] }> => {
  // const url = backendUrl(NETWORKS.ETH, '/signer_health/');

  let urls = [];

  for (const network of availableNetworks) {
    urls.push({ network: network, url: backendUrl(network, '/signer_health/') });
  }

  let healthResponses = await Promise.all([
    ...urls.map(async url => {
      return { network: url.network, result: await agent.get<{ body: { health: ISignerHealth[] } }>(url.url, {}) };
    }),
  ]);

  // const content = Object.assign(
  //   {},
  //   ...
  // );

  const content = healthResponses.map(response => {
    return { network: response.network, health: response.result.body.health };
  });

  return { content: content };
};

export const getRewardsInfo = async (params: any): Promise<{ content: IRewardPool[] }> => {
  const url = backendUrl(NETWORKS.ETH, '/rewards/');

  const res = await agent.get<{ body: { tokens: IRewardPool[] } }>(url, params);

  const content = res.body.pools;

  return { ...res.body, content };
};

export const getEthProof = async (addr: string): Promise<{ proof: IClaimProofDocument }> => {
  const url = backendUrl(NETWORKS.ETH, `/proof/eth/${addr.toLowerCase()}`);
  const res = await agent.get<{ body: IClaimProofDocument }>(url);

  return res.body;
};

export const getScrtProof = async (addr): Promise<{ proof: IClaimProofDocument }> => {
  const url = backendUrl(NETWORKS.ETH, `/proof/scrt/${addr.toLowerCase()}`);

  const res = await agent.get<{ body: IClaimProofDocument }>(url);

  return res.body;
};
