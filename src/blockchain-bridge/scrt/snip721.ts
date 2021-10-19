import { CosmWasmClient, ExecuteResult, SigningCosmWasmClient } from 'secretjs';
import { divDecimals, unlockToken } from '../../utils';
import { StdFee } from 'secretjs/types/types';
import { AsyncSender } from './asyncSender';

export const Snip721SwapHash = (params: { address: string; token_id: string }): string => {
  return `${params.address}|${params.token_id}`;
};

export interface Snip721TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  total_supply?: string;
}

interface _TokenList {
  tokens: string[]
}

export interface Snip721GetTokensResponse {
  token_list: _TokenList
}


export const GetSnip721Params = async (params: {
  secretjs: CosmWasmClient;
  address: string;
}): Promise<Snip721TokenInfo> => {
  const { secretjs, address } = params;

  try {
    const paramsResponse = await secretjs.queryContractSmart(address, { token_info: {} });

    return {
      name: paramsResponse.token_info.name,
      symbol: paramsResponse.token_info.symbol,
      decimals: paramsResponse.token_info.decimals,
      total_supply: paramsResponse.token_info?.total_supply,
    };
  } catch (e) {
    throw Error('Failed to get info');
  }
};

export const Snip721GetTokens = async (params: {
  secretjs: CosmWasmClient;
  token: string;
  address: string;
  key: string;
}): Promise<Snip721GetTokensResponse> => {
  const { secretjs, address, token, key } = params;

  let balanceResponse;
  balanceResponse = await secretjs.queryContractSmart(token, {
    tokens: {
      owner: address,
      // viewer: "address_of_the_querier_if_different_from_owner",
      viewing_key: key,
      // limit: 10
    }
  });

  return balanceResponse;
};

export const Snip721SendToBridge = async (params: {
  secretjs: AsyncSender;
  address: string;
  token_id: string;
  msg: string;
  recipient?: string;
}): Promise<string> => {
  const tx = await Snip721Send({
    recipient: params.recipient || process.env.SCRT_SWAP_CONTRACT,
    ...params,
  });

  const txIdKvp = tx.logs[0].events[1].attributes.find(kv => kv.key === 'tx_id');
  let tx_id: string;
  if (txIdKvp && txIdKvp.value) {
    tx_id = txIdKvp.value;
  } else {
    throw new Error('Failed to get tx_id');
  }

  return tx_id;
};

export const Snip721Send = async (params: {
  secretjs: AsyncSender;
  address: string;
  token_id: string;
  msg: string;
  recipient: string;
  fee?: StdFee;
}): Promise<ExecuteResult> => {
  const { secretjs, address, token_id, msg, recipient, fee } = params;

  return await secretjs.asyncExecute(
    address,
    {
      send: {
        token_id: token_id,
        recipient,
        msg,
      },
    },
    '',
    [],
    fee,
  );
};
