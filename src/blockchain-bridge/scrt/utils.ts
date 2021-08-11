import { decode } from 'bech32';
import { ExecuteResult } from 'secretjs';
import { StdFee } from 'secretjs/types/types';
import { EXCHANGE_MODE, TOKEN } from '../../stores/interfaces';
import { NETWORKS } from '../eth/networks';

const HRP = 'secret';

export const swapContractAddress = (network: NETWORKS): string => {
  switch (network) {
    case NETWORKS.ETH:
      return process.env.SCRT_SWAP_CONTRACT;
    case NETWORKS.BSC:
      return process.env.BSC_SCRT_SWAP_CONTRACT;
    case NETWORKS.PLSM:
      return process.env.PLSM_SWAP_CONTRACT;
    default:
      throw new Error('Swap contract address undefined');
  }
};

export const getScrtAddress = (address: string): string => {
  try {
    const decoded = decode(address, 46);
    return decoded.prefix === HRP ? address : '';
  } catch {
    return '';
  }
};

export const validateBech32Address = (address: string): boolean => {
  return getScrtAddress(address) !== '';
};

export function extractValueFromLogs(txResult: ExecuteResult, key: string, lastValue?: boolean): string {
  const wasmLogsReadonly = txResult?.logs[0]?.events?.find(e => e.type === 'wasm')?.attributes;
  let wasmLogs = Array.from(wasmLogsReadonly ?? []);

  if (lastValue) {
    wasmLogs = wasmLogs.reverse();
  }

  return wasmLogs?.find(a => a.key === key)?.value;
}

const gasPriceUscrt = 0.25;
export function getFeeForExecute(gas: number): StdFee {
  return {
    amount: [{ amount: String(Math.floor(gas * gasPriceUscrt) + 1), denom: 'uscrt' }],
    gas: String(gas),
  };
}

// todo: fix this up - proxy token
export const secretTokenName = (mode: EXCHANGE_MODE, token: TOKEN, label: string): string => {
  if (label === 'SEFI') {
    return 'SEFI';
  } else if (label === 'WSCRT') {
    return mode === EXCHANGE_MODE.FROM_SCRT ? 'SSCRT' : 'WSCRT';
  } else if (label === 'WSIENNA') {
    return mode === EXCHANGE_MODE.FROM_SCRT ? 'SIENNA' : 'WSIENNA';
  } else {
    return (mode === EXCHANGE_MODE.FROM_SCRT && token === TOKEN.ERC20 ? 'secret' : '') + label;
  }
};
