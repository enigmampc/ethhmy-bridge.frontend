import { DepositRewards } from '../../../blockchain-bridge/scrt';
import React, { useState } from 'react';
import { valueToDecimals } from '../../../utils';
import cn from 'classnames';
import * as styles from './styles.styl';
import { Button } from 'semantic-ui-react';
import { unlockToken } from '../../../utils';

// todo: add failed toast or something
const EarnButton = ({ props, value, changeValue, togglePulse, setPulseInterval }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const amount = Number(value).toFixed(6);

  return (
    <Button
      loading={loading}
      className={cn(styles.button, 'ui', 'blue', 'basic', 'button', 'circular')}
      disabled={Number(value) === 0 || isNaN(value)}
      onClick={async () => {
        setLoading(true);
        await DepositRewards({
          secretjs: props.userStore.secretjsSend,
          recipient: props.token.rewardsContract,
          address: props.token.lockedAssetAddress,
          // maximum precision for the contract is 6 decimals
          amount: valueToDecimals(amount, props.token.decimals),
        })
          .then(_ => {
            changeValue({
              target: {
                value: '0.0',
              },
            });

            props.notify('success', `Staked ${amount} s${props.token.display_props.symbol} in the rewards contract`);
            if (props.token.deposit === unlockToken) {
              togglePulse();
              const interval = setInterval(togglePulse, 700);
              setPulseInterval(interval);
            }
          })
          .catch(reason => {
            props.notify('error', `Failed to deposit: ${reason}`);
            console.log(`Failed to deposit: ${reason}`);
          });
        await Promise.all([
          props.userStore.refreshRewardsBalances(props.token.display_props.symbol),
          props.userStore.refreshTokenBalance(props.token.display_props.symbol),
        ]);
        setLoading(false);
      }}
    >
      Earn
    </Button>
  );
};

export default EarnButton;
