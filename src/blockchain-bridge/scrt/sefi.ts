import { ExecuteResult, SigningCosmWasmClient } from 'secretjs';
import { getScrtProof } from 'services';

export const isClaimedSefiRewardsScrt = async (params: {
  secretjs: SigningCosmWasmClient;
  index: number;
}): Promise<boolean> => {
  const { secretjs, index } = params;
  console.log(index);
  try {
    let resp = await secretjs.queryContractSmart(process.env.SCRT_DIST_TOKEN_ADDRESS, {
      is_claimed: { index: index.toString() },
    });

    return resp;
  } catch (e) {
    console.log(e);
    throw Error('Address does not exist');
  }
};

export const ClaimAirdrop = async (params: {
  secretjs: SigningCosmWasmClient;
  address: string;
}): Promise<ExecuteResult> => {
  const { secretjs, address } = params;
  const proof = (await getScrtProof(address)).proof;

  let execMsg = {
    index: proof.index.toString(),
    address: address,
    amount: parseInt(proof.amount, 16).toString(),
    proof: proof.proof.map(p => p.substring(2)), // map to remove the '0x's
  };

  let result = await secretjs.execute(process.env.SCRT_DIST_TOKEN_ADDRESS, {
    claim: execMsg,
  });

  return result;
};
