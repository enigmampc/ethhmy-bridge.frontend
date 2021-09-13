import { EXCHANGE_MODE } from 'stores/interfaces';

// todo: fix this up - proxy token
export const formatSymbol = (mode: EXCHANGE_MODE, symbol: string) => {
  if (!symbol || symbol.trim() === '') {return '';}
  let value = symbol;
  value = mode === EXCHANGE_MODE.TO_SCRT ? symbol : `s${symbol}`;
  if (symbol === 'SSCRT') {value = mode === EXCHANGE_MODE.TO_SCRT ? 'WSCRT' : `sSCRT`;}
  if (symbol === 'SIENNA') {value = mode === EXCHANGE_MODE.TO_SCRT ? 'WSIENNA' : `SIENNA`;}
  return value;
};
