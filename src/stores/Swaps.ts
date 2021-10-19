import { ISwap } from './interfaces';
import { IStores } from './index';
import * as services from 'services';
import { ListStoreConstructor } from './core/ListStoreConstructor';

export class Swaps extends ListStoreConstructor<ISwap> {
  constructor(stores: IStores) {
    super(stores, services.getSwaps, {
      pollingInterval: 20000,
      isLocal: true,
      //paginationData: { pageSize: 10 },
      sorter: 'created_on, desc',
    });
  }
}
