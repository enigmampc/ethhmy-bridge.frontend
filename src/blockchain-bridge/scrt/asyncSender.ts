import { SigningCosmWasmClient } from 'secretjs';
import { Coin, StdFee } from 'secretjs/types/types';
import retry from 'async-await-retry';
import { sleep } from '../utils';

class CustomError extends Error {
  public txHash: string;
}

export class AsyncSender extends SigningCosmWasmClient {
  asyncExecute = async (
    contractAddress: string,
    handleMsg: object,
    memo?: string,
    transferAmount?: readonly Coin[],
    fee?: StdFee,
  ) => {
    let tx;
    try {
      tx = await this.execute(contractAddress, handleMsg, memo, transferAmount, fee);
    } catch (e) {
      console.error(`failed to broadcast tx: ${e}`);
      throw new CustomError('Failed to broadcast transaction: Network error');
    }

    try {
      // optimistic
      await sleep(3000);
      const res = await retry(
        () => {
          return this.restClient.txById(tx.transactionHash);
        },
        null,
        { retriesMax: 5, interval: 6000 },
      );

      //console.log(`yay! ${JSON.stringify(res)}`);
      return {
        ...res,
        transactionHash: tx.transactionHash,
      };
    } catch (e) {
      console.error(`failed to broadcast tx: ${e}`);
      let error = new CustomError(`Timed out while waiting for transaction`);
      error.txHash = tx.transactionHash;
      throw error;
    }
  };
}
