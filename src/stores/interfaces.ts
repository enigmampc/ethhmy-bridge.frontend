import { NativeToken, Token } from 'pages/Swap/types/trade';
import { SwapStatus } from '../constants';

export enum EXCHANGE_MODE {
  ETH_TO_SCRT = 'eth_to_scrt',
  SCRT_TO_ETH = 'scrt_to_eth',
}

export enum TOKEN {
  ETH = 'eth',
  ERC20 = 'erc20',
  S20 = 'secret20',
}

export enum ACTION_TYPE {
  // ETH_TO_ONE
  'getHRC20Address' = 'getHRC20Address',
  'approveEthManger' = 'approveEthManger',
  'lockToken' = 'lockToken',
  'waitingBlockNumber' = 'waitingBlockNumber',
  'mintToken' = 'mintToken',
  'mintTokenRollback' = 'mintTokenRollback',

  // ONE_TO_ETH
  'approveHmyManger' = 'approveHmyManger',
  'burnToken' = 'burnToken',
  'waitingBlockNumberHarmony' = 'waitingBlockNumberHarmony',
  'unlockToken' = 'unlockToken',
  'unlockTokenRollback' = 'unlockTokenRollback',
}

export enum STATUS {
  ERROR = 'error',
  SUCCESS = 'success',
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
}

export interface IAction {
  id: string;
  type: ACTION_TYPE;
  status: STATUS;
  transactionHash: string;
  error: string;
  message: string;
  timestamp: number;
  payload: any;
}

export interface IOperation {
  transactionHash: string;
  id: string;
  type: EXCHANGE_MODE;
  token: TOKEN;
  status: SwapStatus;
  amount: number;
  fee: number;
  ethAddress: string;
  oneAddress: string;
  actions: Array<IAction>;
  timestamp: number;
  erc20Address?: string;
  swap?: ISwap;
  symbol?: string;
  image?: string;
}

export interface ISwap {
  dst_coin: string;
  dst_network: string;
  dst_tx_hash: string;
  amount: number;
  dst_address: string;
  src_address?: string;
  src_coin: string;
  src_network: string;
  src_tx_hash: string;
  created_on: Date;
  status: number;
}

export interface ITokenInfo {
  dst_coin: any;
  price: string;
  name: string;
  symbol: string;
  decimals: string;
  src_address: string;
  src_network: string;
  dst_address: string;
  dst_network: string;
  src_coin: string;
  totalLocked: string;
  totalLockedNormal: string;
  totalLockedUSD: string;
  display_props: {
    image: string;
    label: string;
    symbol: string;
    min_to_scrt: string;
    min_from_scrt: string;
    hidden: boolean;
    proxy?: string;
    proxy_symbol?: string;
    proxy_address?: string;
    is_secret_only?: boolean;
    usage: TOKEN_USAGE[];
  };
}

export type TOKEN_USAGE = 'BRIDGE' | 'REWARDS' | 'LPSTAKING' | 'SWAP';

export interface ISecretToken {
  name: string;
  address: string;
  decimals: number;
  price: string;
  usage: TOKEN_USAGE[];
  id: string;
  hidden: boolean;
  display_props: {
    image: string;
    label: string;
    symbol: string;
  };
}

export const tokenFromSecretToken = (sToken: ISecretToken): ITokenInfo => {
  const { name, price, decimals, display_props } = sToken;

  return {
    src_coin: sToken.id,
    name,
    price,
    decimals: decimals.toString(),
    display_props: {
      ...display_props,
      hidden: sToken.hidden,
      min_from_scrt: '',
      min_to_scrt: '',
      is_secret_only: true,
      usage: sToken.usage,
    },
    dst_address: sToken.address,
    dst_coin: undefined,
    dst_network: '',
    src_address: '',
    src_network: '',
    symbol: sToken.id,
    totalLocked: '',
    totalLockedNormal: '',
    totalLockedUSD: '',
  };
};

export interface IRewardPool {
  pool_address: string;
  inc_token: {
    symbol: string;
    address: string;
    decimals: number;
    price: number;
  };
  rewards_token: {
    symbol: string;
    address: string;
    decimals: number;
    price: number;
  };
  total_locked: string;
  pending_rewards: string;
  deadline: string;
  hidden?: boolean;
}

export interface ISecretSwapPair {
  asset_infos: Array<Token | NativeToken>;
  contract_addr: string;
  liquidity_token: string;
  token_code_hash: string;
  asset0_volume: string;
  asset1_volume: string;
  factory: {
    address: string;
    code_hash: string;
  };
}

export interface TokenPool {
  info: {
    token: {
      contract_addr: string;
      token_code_hash: string;
      viewing_key: string;
    };
  };
  amount: string;
}

export interface NativeTokenPool {
  info: {
    native_token: {
      denom: string;
    };
  };
  amount: string;
}
export interface ISecretSwapPool {
  assets: Array<TokenPool | NativeTokenPool>;
  total_share: string;
}

export interface ISignerHealth {
  signer: string;
  health: boolean;
  updated_on: Date;
  to_scrt: boolean;
  from_scrt: boolean;
}

export interface IClaimProofDocument {
  user: string;
  index: number;
  amount: string;
  proof: [String];
}
