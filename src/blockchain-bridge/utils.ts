export const sleep = duration => new Promise(res => setTimeout(res, duration));

export const networkToDisplay = (name?: string) => {
  if (!name) {
    return '';
  }
  switch (name.toLowerCase().trim()) {
    case 'binancesmartchain':
      return 'Binance Smart Chain';
    case 'ethereum':
      return 'Ethereum';
    case 'secret':
      return 'Secret Network';
    case 'secret20':
      return 'Secret Network';
    default:
      return '';
  }
};
