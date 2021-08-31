import { NETWORKS } from './networks';

export interface PROXY_CONTRACT {
  contract: string;
  symbol: string;
}

export const ProxyTokens = {
  WSCRT: {
    [NETWORKS.ETH]: {
      proxy: process.env.WSCRT_PROXY_CONTRACT_ETH,
      token: process.env.SSCRT_CONTRACT,
      proxySymbol: 'WSCRT',
    },
    [NETWORKS.BSC]: {
      proxy: process.env.WSCRT_PROXY_CONTRACT_BSC,
      token: process.env.SSCRT_CONTRACT,
      proxySymbol: 'WSCRT',
    },
    [NETWORKS.PLSM]: {
      proxy: undefined,
      token: undefined,
    },
  },
  SSCRT: {
    [NETWORKS.ETH]: {
      proxy: process.env.WSCRT_PROXY_CONTRACT_ETH,
      token: process.env.SSCRT_CONTRACT,
      proxySymbol: 'WSCRT',
      secretSymbol: 'SSCRT',
    },
    [NETWORKS.BSC]: {
      proxy: process.env.WSCRT_PROXY_CONTRACT_BSC,
      token: process.env.SSCRT_CONTRACT,
      proxySymbol: 'WSCRT',
      secretSymbol: 'SSCRT',
    },
    [NETWORKS.PLSM]: {
      proxy: undefined,
      token: undefined,
    },
  },
  SIENNA: {
    [NETWORKS.ETH]: {
      proxy: process.env.SIENNA_PROXY_CONTRACT_ETH,
      token: process.env.SIENNA_CONTRACT,
      proxySymbol: 'WSIENNA',
      secretSymbol: 'SIENNA',
    },
    [NETWORKS.BSC]: {
      proxy: process.env.SIENNA_PROXY_CONTRACT_BSC,
      token: process.env.SIENNA_CONTRACT,
      proxySymbol: 'SIENNA',
      secretSymbol: 'SIENNA',
    },
    [NETWORKS.PLSM]: {
      proxy: undefined,
      token: undefined,
    },
  },
};

export const proxyContracts: PROXY_CONTRACT[] = [
  { contract: process.env.WSCRT_PROXY_CONTRACT_ETH, symbol: 'SSCRT' },
  { contract: process.env.WSCRT_PROXY_CONTRACT_BSC, symbol: 'SSCRT' },
  { contract: process.env.SIENNA_PROXY_CONTRACT_ETH, symbol: 'SIENNA' },
  { contract: process.env.SIENNA_PROXY_CONTRACT_BSC, symbol: 'SIENNA' },
];
