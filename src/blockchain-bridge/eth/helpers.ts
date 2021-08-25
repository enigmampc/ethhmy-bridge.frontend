import Web3 from 'web3';
import { divDecimals, mulDecimals } from '../../utils';
import { web3 } from './index';
import * as agent from 'superagent';
const BN = require('bn.js');

export const getGasPrice = async (web3: Web3) => {
  // let gasPriceApi = 0;
  //
  // try {
  //   const info = await agent.get(`https://www.etherchain.org/api/gasPriceOracle`);
  //
  //   gasPriceApi = mulDecimals(info.body.standard, 8);
  // } catch (e) {
  //   console.error('Error get gas price');
  // }

  return new BN(await web3.eth.getGasPrice()).mul(new BN(1));
};

export const getNetworkFee = async (gas_amount: number, decimals?: number) => {
  const gasPrice = await getGasPrice(web3);
  const gasLimit = new BN(gas_amount);

  const fee = gasLimit.mul(gasPrice);

  return Number(divDecimals(fee, decimals || 18));
};

export const getDuplexNetworkFee = async (gas_amount: number, decimals?: number) => {
  let gasPriceApi = 0;

  try {
    const info = await agent.get(`https://blocknative-api.herokuapp.com/data`);

    gasPriceApi = mulDecimals(info.body.estimatedPrices[0].price, 9);
  } catch (e) {
    gasPriceApi = await getGasPrice(web3);
  }

  const gasLimit = new BN(gas_amount);

  const fee = gasLimit.mul(gasPriceApi);

  return Number(divDecimals(fee, decimals || 18));
};

export const ethToWei = (amount: string | number) => mulDecimals(amount, 18);
