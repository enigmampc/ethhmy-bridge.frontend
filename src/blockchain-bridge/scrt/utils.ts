import { decode } from 'bech32';
import { ExecuteResult } from 'secretjs';
import { StdFee } from 'secretjs/types/types';
import { EXCHANGE_MODE, TOKEN } from '../../stores/interfaces';

const HRP = 'secret';

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
    return mode === EXCHANGE_MODE.SCRT_TO_ETH ? 'SSCRT' : 'WSCRT';
  } else if (label === 'WSIENNA') {
    return mode === EXCHANGE_MODE.SCRT_TO_ETH ? 'SIENNA' : 'WSIENNA';
  } else {
    return (mode === EXCHANGE_MODE.SCRT_TO_ETH && token === TOKEN.ERC20 ? 'secret' : '') + label;
  }
};
