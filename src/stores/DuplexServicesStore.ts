import { ITokenLimits } from './interfaces';
import { IStores } from './index';
import * as services from 'services';
import { ListStoreConstructor } from './core/ListStoreConstructor';
import { divDecimals } from '../utils';

export class DuplexServicesStore extends ListStoreConstructor<ITokenLimits> {
  constructor(stores: IStores) {
    super(stores, services.getTokenLimits, {
      pollingInterval: 20000,
      isLocal: true,
      //paginationData: { pageSize: 10 },
      sorter: 'created_on, desc',
    });
  }

  getLocked(symbol: string): string {
    if (this.allData.length > 0) {
      return divDecimals(this.allData[0]?.UST.locked, 18);
    }
    return '0';
  }

  getLimit(symbol: string): string {
    if (this.allData.length > 0) {
      return this.allData[0]?.UST.limit;
    }
    return '5000000';
  }
}
