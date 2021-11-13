import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { getGasPrice } from './helpers';
import { getEthProof } from '../../services';

const BN = require('bn.js');

export interface EthMethodsSefiInitParams {
  web3: Web3;
  govTokenContract: Contract;
  distributionContract: Contract;
}

export class EthMethodsSefi {
  private web3: Web3;
  private govTokenContract: Contract;
  private distributionContract: Contract;

  constructor(params: EthMethodsSefiInitParams) {
    this.web3 = params.web3;
    this.govTokenContract = params.govTokenContract;
    this.distributionContract = params.distributionContract;
  }

  claimToken = async (sendTxCallback?) => {
    // @ts-ignore
    const accounts = await ethereum.send('eth_requestAccounts');

    ////////
    const accountToClaim = accounts[0]; /*'0xe342c08eB93C1886B0c277936a2cc6B6FE5C1dB3';*/
    ////////

    const proof = (await getEthProof(accountToClaim)).proof;
    const estimateGas = await this.distributionContract.methods
      .claim(proof.index, proof.user, proof.amount, proof.proof)
      .estimateGas({
        from: accounts[0],
      });

    const gasLimit = Math.max(estimateGas + estimateGas * 0.3, Number(process.env.ETH_GAS_LIMIT));

    return await this.distributionContract.methods.claim(proof.index, proof.user, proof.amount, proof.proof).send({
      from: accounts[0],
      gas: new BN(gasLimit),
      gasPrice: await getGasPrice(this.web3),
    });
  };

  checkAvailableToClaim = async (index: Number) => {
    return await this.distributionContract.methods.isClaimed(index).call();
  };

  checkGovBalance = async (addr: string): Promise<string> => {
    try {
      return await this.govTokenContract.methods.balanceOf(addr).call();
    } catch (e) {
      return 'Wrong Network?';
    }
  };
}
