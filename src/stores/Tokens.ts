import { ITokenInfo } from './interfaces';
import { IStores } from './index';
import * as services from 'services';
import { ListStoreConstructor } from './core/ListStoreConstructor';

export class Tokens extends ListStoreConstructor<ITokenInfo> {
  constructor(stores: IStores) {
    super(stores, () => services.getTokensInfo({ page: 0, size: 1000 }), {
      pollingInterval: 30000,
      isLocal: true,
      paginationData: { pageSize: 100 },
      sorter: 'totalLockedUSD, asc',
      //sorter: 'none',
      //sorters: {}
      sorters: {
        totalLockedUSD: 'asc',
      },
    });
  }

  getTokenBySymbol(symbol: string): ITokenInfo {
    return this.allData?.find(token => token.symbol.toLowerCase() === symbol.toLowerCase());
  }

  getTokenByAddress(address: string): ITokenInfo {
    return this.allData?.find(token => token.address.toLowerCase() === address.toLowerCase());
  }
}
