import React, { useEffect, useState } from 'react';
import * as styles from './styles.styl';
import cn from 'classnames';
import { observer } from 'mobx-react';
import { useStores } from '../../../stores';
import { claimErc, claimInfoErc, ClaimInfoResponse, claimInfoScrt, claimScrt } from './utils';
import BigNumber from 'bignumber.js';
import { divDecimals, sleep } from '../../../utils';
import Loader from 'react-loader-spinner';

// todo: handle properly
export const ClaimTokenScrt = observer(() => {
  const { user } = useStores();
  return (
    <ClaimTokenButton
      text={'Claim SeFi SCRT'}
      onClick={async () => {
        try {
          await claimScrt(user.secretjsSend, user.address);
          console.log('success in claim');
        } catch (e) {
          console.error('failed to claim');
        }
      }}
    />
  );
});

// todo: handle properly
export const ClaimTokenErc = () => {
  return (
    <ClaimTokenButton
      text={'Claim My SeFi on ETH!'}
      onClick={async () => {
        try {
          await claimErc();
          console.log('success in claim');
        } catch (e) {
          console.error(`failed to claim ${e}`);
        }
      }}
    />
  );
};

function ClaimInfoDisplay(props: { failed?: boolean; address: string; claimed: boolean; claimAmount: BigNumber }) {
  return !props.address ? (
    <>{props?.failed ? <>failed</> : <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />}</>
  ) : (
    <div>
      {'Claim Info'}
      <div>
        {'Address: '} {props.address}
      </div>
      <div>
        {'IsClaimed: '} {props.claimed ? 'True' : 'False'}
      </div>
      <div>
        {'Amount: '} {divDecimals(props.claimAmount.toString(), 6)}
      </div>
    </div>
  );
}

export const ClaimInfoScrt = observer(() => {
  const { user } = useStores();

  let [claimInfo, setClaimInfo] = useState<ClaimInfoResponse>(undefined);
  let [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    const stuff = async () => {
      while (!user.secretjs) {
        await sleep(100);
      }
      if (user.address) {
        const info = await claimInfoScrt(user.secretjs, user.address).catch(() => {
          setFailed(true);
          return undefined;
        });

        setClaimInfo(info);
      }
    };

    stuff();
  }, [user.address]);

  return (
    <ClaimInfoDisplay
      failed={failed}
      address={claimInfo?.address}
      claimed={claimInfo?.isClaimed}
      claimAmount={claimInfo?.amount}
    />
  );
});

export const ClaimInfoErc = () => {
  const { userMetamask } = useStores();

  let [failed, setFailed] = useState<boolean>(false);
  let [claimInfo, setClaimInfo] = useState<ClaimInfoResponse>(undefined);

  useEffect(() => {
    const stuff = async () => {
      if (userMetamask.ethAddress) {
        const info = await claimInfoErc(userMetamask.ethAddress);

        setClaimInfo(info);
      }
    };
    stuff();
  }, [userMetamask.ethAddress]);

  return (
    <ClaimInfoDisplay
      failed={failed}
      address={claimInfo?.address}
      claimed={claimInfo?.isClaimed}
      claimAmount={claimInfo?.amount}
    />
  );
};

const ClaimTokenButton = (props: { text: string; onClick: any }) => {
  return (
    <button className={cn(styles.button)} onClick={props.onClick}>
      {props.text}
    </button>
  );
};
