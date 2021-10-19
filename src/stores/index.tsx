import RouterStore from 'stores/RouterStore';
import { ActionModalsStore } from './ActionModalsStore';
import { UserStoreMetamask } from './UserStoreMetamask';
import { Exchange } from './Exchange';
import { Swaps } from './Swaps';
import { Tokens } from './Tokens';
import { createStoresContext } from './create-context';
import { SignerHealthStore } from './SignerHealthStore';
import { DuplexServicesStore } from './DuplexServicesStore';
import { UserStoreSecret } from './UserStoreNft';

export interface IStores {
  routing?: RouterStore;
  actionModals?: ActionModalsStore;
  userSecret?: UserStoreSecret;
  userMetamask?: UserStoreMetamask;
  exchange?: Exchange;
  swaps?: Swaps;
  tokens?: Tokens;
  signerHealth?: SignerHealthStore;
  duplexServices?: DuplexServicesStore;
}

const stores: IStores = {};

stores.routing = new RouterStore();
stores.exchange = new Exchange(stores);
stores.swaps = new Swaps(stores);
stores.tokens = new Tokens(stores);
stores.actionModals = new ActionModalsStore();
stores.userSecret = new UserStoreSecret(stores);
stores.userMetamask = new UserStoreMetamask(stores);
stores.signerHealth = new SignerHealthStore(stores);
stores.duplexServices = new DuplexServicesStore(stores);

if (!process.env.production) {
  window.stores = stores;
}

const { StoresProvider, useStores } = createStoresContext<typeof stores>();
export { StoresProvider, useStores };

export default stores;
