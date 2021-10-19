import {
  INetworkBridgeHealth,
  IOperation,
  ISignerHealth,
  ISwap,
  ITokenInfo,
} from '../stores/interfaces';
import * as agent from 'superagent';
import { SwapStatus } from '../constants';
import { NETWORKS } from '../blockchain-bridge';

const availableNetworks = [NETWORKS.ETH]; //, NETWORKS.PLSM , NETWORKS.BSC

const BACKENDS = {
  [NETWORKS.ETH]: process.env.BACKEND_URL,
  [NETWORKS.BSC]: process.env.BSC_BACKEND_URL,
  [NETWORKS.PLSM]: process.env.PLSM_BACKEND_URL,
};

const duplexUrl = url => {
  return `${process.env.BACKEND_DUPLEX_SERVICES}${url}`;
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

// export const getTokenLimits = async (): Promise<{ content: ITokenLimits[] }> => {
//   const url = duplexUrl(`tokenlimit`);
//
//   const res = await agent.get<{ body: ITokenLimits }>(url);
//
//   let resp = res.body;
//
//   return { content: [resp] };
// };

export const getSwaps = async (params: any): Promise<{ content: ISwap[] }> => {
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

  for (const network of availableNetworks) {
    urls.push(backendUrl(network, '/tokens/'));
  }

  let tokens = await Promise.all([
    ...urls.map(url => {
      return agent.get<{ body: { tokens: ITokenInfo[] } }>(url, params);
    }),
  ]);

  const tokenArray: ITokenInfo[] = tokens.flatMap(t => t.body.tokens);
  try {
    let content = tokenArray
      .filter(t => (process.env.TEST_COINS ? true : !t.display_props?.hidden));

    return { content };
  } catch (e) {
    console.error(e);
    return { content: undefined };
  }
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
