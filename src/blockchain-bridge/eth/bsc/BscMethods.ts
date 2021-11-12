import { EIP1559Gas, getGasPrice } from '../helpers';
import { EthMethods } from '../EthMethods';
import { BigNumber } from 'bignumber.js';

export class BscMethods extends EthMethods {
  getGasPrice = async (): Promise<EIP1559Gas | BigNumber> => {
    return await getGasPrice(this.web3);
  };
}
