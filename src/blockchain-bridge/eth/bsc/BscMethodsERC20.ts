import { EthMethodsERC20 } from '../EthMethodsERC20';
import { EIP1559Gas, getGasPrice } from '../helpers';
import { BigNumber } from 'bignumber.js';

export class BscMethodsERC20 extends EthMethodsERC20 {
  getGasPrice = async (): Promise<EIP1559Gas | BigNumber> => {
    return await getGasPrice(this.web3);
  };
}
