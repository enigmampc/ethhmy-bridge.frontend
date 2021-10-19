import { NETWORKS } from '../blockchain-bridge';
import { SwapStatus } from '../constants';

export enum EXCHANGE_MODE {
  TO_SCRT = 'eth_to_scrt',
  FROM_SCRT = 'scrt_to_eth',
}

export enum TOKEN {
  // NATIVE = 'eth',
  ERC721 = 'erc721',
  S20 = 'secret20',
  //DUPLEX = 'duplex',
}

export interface ISwap {
  src_tx_hash: string
  src_network: string
  src_coin: string
  amount: string
  status: SwapStatus
  unsigned_tx: string
  dst_tx_hash: string
  dst_network: string
  dst_coin: string
  dst_address: string
  created_on: Date
  updated_on: Date
  sequence: number

}

export interface IOperation {
  transactionHash: string;
  id: string;
  type: EXCHANGE_MODE;
  token: TOKEN;
  status: SwapStatus;
  token_id: string;
  fee: number;
  ethAddress: string;
  timestamp: number;
  erc20Address?: string;
  swap?: ISwap;
  symbol?: string;
  image?: string;
}

// export enum ACTION_TYPE {
//   // ETH_TO_ONE
//   'lockToken' = 'lockToken',
//   'mintTokenRollback' = 'mintTokenRollback',
//
//   // ONE_TO_ETH
//   'unlockToken' = 'unlockToken',
//   'unlockTokenRollback' = 'unlockTokenRollback',
// }

export interface ITokenInfo {
  address: any;
  name: string;
  symbol: string;
  display_props: {
    image: string;
    label: string;
    hidden: boolean;
    is_secret_only?: boolean;
  };
}

export interface INetworkBridgeHealth {
  network: NETWORKS;
  health: ISignerHealth[];
}

export interface ISignerHealth {
  signer: string;
  health: boolean;
  updated_on: Date;
  to_scrt: boolean;
  from_scrt: boolean;
}
