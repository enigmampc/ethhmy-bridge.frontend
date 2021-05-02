import { SigningCosmWasmClient } from 'secretjs';
import { ClaimAirdrop, ethMethodsSefi, isClaimedSefiRewardsScrt } from '../../../blockchain-bridge';
import BigNumber from 'bignumber.js';
import * as services from 'services';
import { AsyncSender } from '../../../blockchain-bridge/scrt/asyncSender';

export interface ClaimInfoResponse {
  address: string;
  amount: BigNumber;
  isClaimed: boolean;
}

export const claimScrt = async (secretjs: AsyncSender, address: string) => {
  const result = await ClaimAirdrop({ secretjs, address });

  return result;
};

export const claimErc = async () => await ethMethodsSefi.claimToken();

export const claimInfoErc = async (address): Promise<ClaimInfoResponse> => {
  const info = (await services.getEthProof(address)).proof; // getIndexFromDB

  if (!info?.index) {
    return {
      address,
      amount: new BigNumber(0),
      isClaimed: false,
    };
  }

  try {
    const isClaimed = await ethMethodsSefi.checkAvailableToClaim(info.index);
    return {
      address,
      amount: new BigNumber(info.amount),
      isClaimed,
    };
  } catch (e) {
    console.error(e);
    throw new Error('aww');
  }
};

export const claimInfoScrt = async (secretjs, address): Promise<ClaimInfoResponse> => {
  const info = (await services.getScrtProof(address)).proof; // getIndexFromDB

  if (!info?.index) {
    return {
      address,
      amount: new BigNumber(0),
      isClaimed: false,
    };
  }
  try {
    const isClaimed = await isClaimedSefiRewardsScrt({ secretjs, index: info.index });

    return {
      address,
      amount: new BigNumber(info.amount),
      isClaimed,
    };
  } catch (e) {
    console.error(e);
    throw new Error('aww');
  }
};
