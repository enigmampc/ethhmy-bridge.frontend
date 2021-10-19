import { INetworkBridgeHealth } from './interfaces';
import { IStores } from './index';
import * as services from '../services';
import { ListStoreConstructor } from './core/ListStoreConstructor';

export class SignerHealthStore extends ListStoreConstructor<INetworkBridgeHealth> {
  constructor(stores: IStores) {
    super(stores, () => services.getSignerHealth(), {
      pollingInterval: 30000,
      isLocal: false,
      sorter: 'none',
      sorters: {},
    });
  }
}
