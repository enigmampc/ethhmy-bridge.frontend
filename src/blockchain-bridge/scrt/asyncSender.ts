import { SigningCosmWasmClient } from 'secretjs';
import { Coin, StdFee } from 'secretjs/types/types';
import retry from 'async-await-retry';

export class AsyncSender extends SigningCosmWasmClient {
  asyncExecute = async (
    contractAddress: string,
    handleMsg: object,
    memo?: string,
    transferAmount?: readonly Coin[],
    fee?: StdFee,
  ) => {
    try {
      const tx = await this.execute(contractAddress, handleMsg, memo, transferAmount, fee);
      //const options = { limit: 10, delay: 6000, firstAttemptDelay: 3000 };

      const res = await retry(
        () => {
          return this.restClient.txById(tx.transactionHash);
        },
        null,
        { retriesMax: 5, interval: 6000 },
      );

      console.log(`yay! ${JSON.stringify(res)}`);
      return {
        ...res,
        transactionHash: tx.transactionHash,
      };
    } catch (e) {
      console.error(`failed to broadcast tx: ${e}`);
      throw new Error(`Failed to broadcast transaction: Network error`);
    }
  };
}
