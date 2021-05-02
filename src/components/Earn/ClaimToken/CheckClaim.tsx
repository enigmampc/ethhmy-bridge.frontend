// todo: handle properly
import { observer } from 'mobx-react';
import { claimInfoErc, ClaimInfoResponse, claimInfoScrt } from './utils';
import React, { useState } from 'react';
import cn from 'classnames';
import { Button, Modal } from 'semantic-ui-react';
import { ExitIcon } from '../../../ui/Icons/ExitIcon';
import { IsValid } from '../../../pages/Swap/TokenSelector/IsValid';
import { divDecimals, sleep } from '../../../utils';
import { CosmWasmClient, SigningCosmWasmClient } from 'secretjs';
import Loader from 'react-loader-spinner';
import * as styles from './styles.styl';
import { FlexRowSpace } from '../../Swap/FlexRowSpace';
import { Text } from 'components/Base';
import { CopyWithFeedback } from 'components/Swap/CopyWithFeedback';
import { Spinner2 } from '../../../ui/Spinner2';
import { useStores } from 'stores';
import BigNumber from 'bignumber.js';

export const CheckClaim = (props: { isEth?: boolean; onClick?: any; loading?: boolean; title?: string }) => {
  // const { user } = useStores();
  return (
    <button className={cn(styles.checkBalance)} onClick={props.onClick} disabled={props.loading}>
      {props.loading ? (
        <Spinner2 height="20px" width="20px" color="white" style={{ marginRight: 5 }} />
      ) : (
        props.title ?? 'Claim Genesis'
      )}
    </button>
  );
};

export const CheckClaimModal = (props: {
  secretjs?: CosmWasmClient;
  address: string;
  loadingBalance?: boolean;
  isEth?: boolean;
  onClick?: any;
}) => {
  const { user, userMetamask } = useStores();

  const [open, setOpen] = React.useState<boolean>(false);

  let [claimInfo, setClaimInfo] = useState<ClaimInfoResponse>(undefined);
  let [loading, setLoading] = useState<boolean>(false);
  let [sending, setSending] = useState<boolean>(false);
  let [failed, setFailed] = useState<boolean>(false);

  // useEffect(() => {
  //   ;
  //   stuff();
  // }, [props.secretjs, props.address, props.isEth]);
  const loadClaim = async () => {
    console.log('loading claim');
    if (props.isEth) {
      if (props.address) {
        const info = await claimInfoErc(props.address);

        setClaimInfo(info);
      }
    } else {
      while (!props.secretjs) {
        await sleep(100);
      }
      if (props.address) {
        const info = await claimInfoScrt(props.secretjs, props.address).catch(() => {
          setFailed(true);
          return undefined;
        });

        setClaimInfo(info);
      }
    }
  };

  if (!props.address) {
    return (
      <CheckClaim
        title="Connect Wallet"
        onClick={() => {
          if (props.isEth) {
            userMetamask.signIn();
          } else {
            user.signIn();
          }
        }}
        isEth={props.isEth}
      />
    );
  }

  return (
    <Modal
      onClose={() => setOpen(false)}
      onOpen={async () => {
        setOpen(true);
        setLoading(true);
        try {
          await loadClaim();
        } finally {
          console.log('done loading claim');
          setLoading(false);
        }
      }}
      open={open}
      trigger={<CheckClaim loading={sending} />}
      dimmer={'blurring'}
      style={{ width: '700px', display: 'flex' }}
    >
      <Modal.Header>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Claim Genesis Balance</span>
          <span style={{ cursor: 'pointer' }} onClick={() => setOpen(false)}>
            <ExitIcon />
          </span>
        </div>
      </Modal.Header>
      <Modal.Content>
        {loading ? (
          <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />
        ) : (
          <ClaimBoxInfo
            amount={claimInfo?.amount.toString()}
            address={props.address}
            isClaimed={claimInfo?.isClaimed}
          />
        )}
      </Modal.Content>
      <Modal.Actions>
        <Button
          content={!!claimInfo ? (claimInfo?.isClaimed ? 'Already Claimed' : 'Claim') : 'Loading...'}
          labelPosition="right"
          icon="checkmark"
          onClick={async () => {
            setSending(true);
            setOpen(false);
            try {
              await props.onClick(claimInfo?.address);
            } finally {
              setSending(false);
            }
          }}
          positive
          disabled={claimInfo === undefined || claimInfo.isClaimed || claimInfo.amount.isZero()}
        />
      </Modal.Actions>
    </Modal>
  );
};

export const ClaimBoxInfo = (props: { address: string; amount?: string; isClaimed?: boolean; onClick?: any }) => {
  if (!props.address) {
    return <div style={{ display: 'flex', justifyContent: 'center' }}>Please connect wallet.</div>;
  }

  const amountAsNumber = new BigNumber(props.amount);

  const sefiAmount = divDecimals(props.amount, 6);
  if (sefiAmount === 'NaN') {
    console.error('Error getting genesis SEFI amount, got', props.amount);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <h3 className={cn(styles.tokenInfoItemsLeft)}>
          {props.address} <CopyWithFeedback text={props.address} />
        </h3>
      </div>
      <div className={cn(styles.tokenInfoRow)} onClick={props.onClick}>
        <div className={cn(styles.tokenInfoItemsLeft)}>
          <h3>{'Genesis Balance'}</h3>
        </div>
        <div className={cn(styles.tokenInfoItemsRight)}>
          <h3>
            {sefiAmount !== 'NaN' ? sefiAmount : <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />}{' '}
            {'SEFI'}
          </h3>
        </div>
      </div>
      <div className={cn(styles.tokenInfoRow)} onClick={props.onClick}>
        <div className={cn(styles.tokenInfoItemsLeft)}>
          <h3>Available for claim?</h3>
        </div>
        <div className={cn(styles.tokenInfoItemsRight)}>
          <IsValid isValid={!props.isClaimed && !amountAsNumber.isZero()} /> {props.isClaimed && 'Already claimed'}{' '}
          {amountAsNumber.isZero() && 'No claim found for this address'}
        </div>
      </div>
    </div>
  );
};
