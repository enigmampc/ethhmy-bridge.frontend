import { IOperation, IRewardPool, ISecretSwapPair, ISignerHealth, ISwap, ITokenInfo } from '../stores/interfaces';
import * as agent from 'superagent';
import { SwapStatus } from '../constants';

const backendUrl = url => {
  return `${process.env.BACKEND_URL}${url}`;
};

export const createOperation = async params => {
  const url = backendUrl(`/operations`);

  const res = await agent.post<IOperation>(url, params);

  return res.body;
};

export const updateOperation = async (id: string, transactionHash: string) => {
  const url = backendUrl(`/operations/${id}`);

  const res = await agent.post<IOperation>(url, { transactionHash });

  return res.body;
};

export const getStatus = async (params): Promise<SwapStatus> => {
  const url = backendUrl(`/operations/${params.id}`);

  const res = await agent.get<IOperation>(url);

  if (res.body.swap) {
    return SwapStatus[SwapStatus[res.body.swap.status]];
  } else {
    return SwapStatus[SwapStatus[res.body.operation.status]];
  }
};

export const getOperation = async (params): Promise<{ operation: IOperation; swap: ISwap }> => {
  const url = backendUrl(`/operations/${params.id}`);

  const res = await agent.get<{ body: { operation: IOperation; swap: ISwap } }>(url);

  return res.body;
};

export const getSwap = async (id): Promise<IOperation> => {
  const url = backendUrl(`/swaps/${id}`);

  const res = await agent.get<{ body: IOperation }>(url);

  return res.body;
};

export const getOperations = async (params: any): Promise<{ content: ISwap[] }> => {
  const url = backendUrl('/swaps/');

  const res = await agent.get<{ body: ISwap[] }>(url, params);

  const content = res.body.swaps;

  return { content: content };
};

export const getTokensInfo = async (params: any): Promise<{ content: ITokenInfo[] }> => {
  const url = backendUrl('/tokens/');

  const res = await agent.get<{ body: { tokens: ITokenInfo[] } }>(url, params);

  const content = res.body.tokens
    .filter(t => (process.env.TEST_COINS ? t : !t.display_props.hidden))
    .map(t => {
      if (t.display_props.proxy) {
        t.display_props.proxy_address = t.dst_address;
        t.dst_address = process.env.SSCRT_CONTRACT;
        t.display_props.proxy_symbol = 'WSCRT';
        //t.display_props.symbol = t.name;
      }

      return t;
    });

  return { ...res.body, content };
};

export const getSecretSwapPairs = async (params: any): Promise<{ content: ISecretSwapPair[] }> => {
  const url = backendUrl('/secretswap_pairs/');

  const res = await agent.get<{ body: ISecretSwapPair[] }>(url, params);

  const content = res.body.pairs;

  return { content: content };
};

export const getSignerHealth = async (): Promise<{ content: ISignerHealth[] }> => {
  const url = backendUrl('/signer_health/');

  const res = await agent.get<{ body: { health: ISignerHealth[] } }>(url, {});

  const content = res.body.health;

  return { content: content };
};

export const getRewardsInfo = async (params: any): Promise<{ content: IRewardPool[] }> => {
  const url = backendUrl('/rewards/');

  const res = await agent.get<{ body: { tokens: IRewardPool[] } }>(url, params);

  const content = res.body.pools;

  return { ...res.body, content };
};
