import cn from 'classnames';
import * as styles from './styles.styl';
import ClaimButton from './ClaimButton';
import React, { useEffect, useState } from 'react';
import ScrtTokenBalance from '../ScrtTokenBalance';
import { UserStoreEx } from '../../../stores/UserStore';

const ClaimBox = (props: {
  rewardsContract: string;
  userStore: UserStoreEx;
  available: string;
  symbol: string;
  notify?: Function;
  rewardsToken?: string;
}) => {
  return (
    <div className={cn(styles.claimBox)}>
      <ClaimButton
        secretjs={props.userStore.secretjsSend}
        contract={props.rewardsContract}
        available={props.available}
        symbol={props.symbol}
        notify={props.notify}
        rewardsToken={props.rewardsToken}
      />
    </div>
  );
};

export default ClaimBox;
