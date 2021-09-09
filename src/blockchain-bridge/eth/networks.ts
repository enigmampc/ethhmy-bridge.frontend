export const enum NETWORKS {
  ETH = 'ETH',
  BSC = 'BSC',
  PLSM = 'PLSM',
  XMR = 'XMR',
}

export const EXTERNAL_NETWORKS = ['XMR'];

export const EXTERNAL_LINKS = {
  XMR: 'https://ipfs.io/ipfs/QmNRrLDhKGZCSXAZcPU1cBTaLouhWnTi5kfWUzJB4nJbzA',
};

export const networkFromToken = (token: { src_network: string; dst_network?: string }): NETWORKS => {
  switch (token.src_network.toLowerCase().replace(/\s/g, '')) {
    case 'ethereum':
      return NETWORKS.ETH;
    case 'binancesmartchain':
      return NETWORKS.BSC;
    case 'plasm':
      return NETWORKS.PLSM;
    case 'secret':
      if (token?.dst_network && token?.dst_network !== 'secret') {
        return networkFromToken({ src_network: token.dst_network });
      } else {
        return undefined;
      }
    default:
      throw new Error(`Invalid network: ${token.src_network}`);
  }
};

export const networkFromSymbol = (symbol: string): NETWORKS => {
  switch (symbol.toUpperCase().replace(/\s/g, '')) {
    case 'ETH':
      return NETWORKS.ETH;
    case 'BSC':
      return NETWORKS.BSC;
    case 'PLM':
      return NETWORKS.PLSM;
    case 'SCRT':
      return undefined;
    default:
      throw new Error(`Invalid network: ${symbol}`);
  }
};
