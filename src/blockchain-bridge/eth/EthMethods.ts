import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { EIP1559Gas, ethToWei, getEIP1559Prices } from './helpers';
import { BigNumber } from 'bignumber.js';

export interface IEthMethodsInitParams {
  web3: Web3;
  ethManagerContract: Contract;
}

export class EthMethods {
  public web3: Web3;
  private ethManagerContract: Contract;

  constructor(params: IEthMethodsInitParams) {
    this.web3 = params.web3;
    this.ethManagerContract = params.ethManagerContract;
  }

  getGasPrice = async (): Promise<EIP1559Gas | BigNumber> => {
    return await getEIP1559Prices();
  };

  swapEth = async (userAddr, amount, sendTxCallback?) => {
    // @ts-ignore
    const accounts = await ethereum.enable();

    const secretAddrHex = this.web3.utils.fromAscii(userAddr);
    // TODO: add validation

    const estimateGas = await this.ethManagerContract.methods.swap(secretAddrHex).estimateGas({
      value: ethToWei(amount),
      from: accounts[0],
    });

    const gasLimit = Math.max(estimateGas + estimateGas * 0.2, Number(process.env.ETH_GAS_LIMIT));
    //let eip1559gas = await getEIP1559Prices();

    //console.log(`${JSON.stringify(eip1559gas)}`);

    const gasPrices = await this.getGasPrice();

    if (gasPrices instanceof EIP1559Gas) {
      this.ethManagerContract.methods
        .swap(secretAddrHex)
        .send({
          value: ethToWei(amount),
          from: accounts[0],
          gas: gasLimit.toString(),
          //maxFeePerGas: GWeiToWei(eip1559gas.maxFeePerGas),
          //maxPriorityFeePerGas: GWeiToWei(eip1559gas.maxPriorityFeePerGas),
          // maxFeePerGas: gasPrices.maxFeePerGas.toString(),
          // maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas.toString(),
          //gasPrice: await getGasPrice(this.web3),
        })
        .on('transactionHash', function(hash) {
          sendTxCallback({ hash });
        })
        .then(function(receipt) {
          sendTxCallback({ receipt });
        })
        .catch(function(error) {
          sendTxCallback({ error });
        });
    } else {
      this.ethManagerContract.methods
        .swap(secretAddrHex)
        .send({
          value: ethToWei(amount),
          from: accounts[0],
          gas: gasLimit.toString(),
          // maxFeePerGas: GWeiToWei(eip1559gas.maxFeePerGas),
          // maxPriorityFeePerGas: GWeiToWei(eip1559gas.maxPriorityFeePerGas),
          gasPrice: gasPrices.toString(),
        })
        .on('transactionHash', function(hash) {
          sendTxCallback({ hash });
        })
        .then(function(receipt) {
          sendTxCallback({ receipt });
        })
        .catch(function(error) {
          sendTxCallback({ error });
        });
    }
  };

  checkEthBalance = async addr => {
    return await this.web3.eth.getBalance(addr);
  };
}
