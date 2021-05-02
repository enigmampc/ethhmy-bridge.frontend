import { Redeem } from '../../../blockchain-bridge/scrt';
import React, { useState } from 'react';
import { SigningCosmWasmClient } from 'secretjs';
import cn from 'classnames';
import * as styles from './styles.styl';
import { Button } from 'semantic-ui-react';
import { useStores } from 'stores';
import { AsyncSender } from '../../../blockchain-bridge/scrt/asyncSender';

const ClaimButton = (props: {
  secretjs: AsyncSender;
  contract: string;
  available: string;
  symbol: string;
  notify: Function;
  rewardsToken?: string;
}) => {
  const { user } = useStores();
  const [loading, setLoading] = useState<boolean>(false);
  return (
    <Button
      loading={loading}
      className={cn(styles.button, 'blue', 'basic', 'circular')}
      disabled={typeof props.available === 'undefined' || props.available === '0'}
      onClick={async () => {
        setLoading(true);
        try {
          await Redeem({
            secretjs: props.secretjs,
            address: props.contract,
            amount: '0',
          });

          props.notify('success', `Claimed ${props.available} s${props.symbol}`);
        } catch (reason) {
          props.notify('error', `Failed to claim: ${reason}`);
          console.error(`Failed to claim: ${reason}`);
        }
        await Promise.all([
          await user.updateBalanceForSymbol(props.symbol),
          await user.updateBalanceForSymbol(props.rewardsToken || 'sSCRT'),
          await user.refreshRewardsBalances(props.rewardsToken),
        ]);
        setLoading(false);
      }}
    >
      Claim Rewards
    </Button>
  );
};

export default ClaimButton;
