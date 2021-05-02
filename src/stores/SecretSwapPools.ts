import { ISecretSwapPool } from './interfaces';
import { IStores } from './index';
import * as services from '../services';
import { ListStoreConstructor } from './core/ListStoreConstructor';

export class SecretSwapPools extends ListStoreConstructor<ISecretSwapPool> {
  constructor(stores: IStores) {
    super(stores, () => services.getSecretSwapPools({ page: 0, size: 1000 }), {
      pollingInterval: 10000,
      isLocal: true,
      paginationData: { pageSize: 1000 },
      sorter: 'none',
      sorters: {},
    });
  }
}
