import * as React from 'react';
import HeadShake from 'react-reveal/HeadShake';
import { Box } from 'grommet';
import { Text, Title, Icon } from 'components/Base';
import Loader from 'react-loader-spinner';
import * as styles from './styles.styl';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { unlockToken, wrongNetwork } from 'utils';
import { Icon as IconUI } from 'semantic-ui-react';
import cogoToast from 'cogo-toast';
import { NETWORKS } from '../../blockchain-bridge';
import PopupExample from './HealthPopup';
import HealthPopup from './HealthPopup';

export const createNotification = (type: 'success' | 'error', msg: string, hideAfterSec: number = 120) => {
  if (type === 'error') {
    msg = msg.replaceAll('Failed to decrypt the following error message: ', '');
    msg = msg.replace(/\. Decryption error of the error message:.+?/, '');
  }

  const { hide } = cogoToast[type](msg, {
    position: 'top-right',
    hideAfter: hideAfterSec,
    onClick: () => {
      hide();
    },
  });
  // NotificationManager[type](undefined, msg, closesAfterMs);
};

export const createViewingKey = async (user: any, callback?: Function) => {
  try {
    //console.log(user.chainId, user.snip20Address);
    await user.keplrWallet.suggestToken(user.chainId, user.snip20Address);
    callback(true);
  } catch (error) {
    console.log(error);
    callback(false);
  }
};

export const ViewingKeyIcon = (props: { user: any; callback?: Function }) => {
  return (
    <Box
      onClick={() => {
        createViewingKey(props.user, props.callback);
      }}
    >
      🔍
    </Box>
  );
};

export const TokenLocked = (props: { user: any; onFinish: Function }) => {
  return (
    <HeadShake bottom>
      <Box direction="column">
        <Text bold color="#c5bb2e">
          Warning
        </Text>
        <Text margin={{ top: 'xxsmall', bottom: 'xxsmall' }}>
          SecretTokens are privacy tokens. In order to see your token balance, you will need to{' '}
          <span
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
            onClick={async () => {
              createViewingKey(props.user, props.onFinish);
            }}
          >
            create a viewing key.
          </span>
        </Text>
      </Box>
    </HeadShake>
  );
};

export const WrongNetwork = (props: { networkSelected: NETWORKS }) => {
  return (
    <HeadShake bottom>
      <Box direction="column">
        <Text bold color="#c5bb2e">
          Wrong Network
        </Text>
        <Text margin={{ top: 'xxsmall', bottom: 'xxsmall' }}>
          It seems your Metamask Wallet is connected to the wrong network!{' '}
          {props.networkSelected === NETWORKS.BSC && (
            <span>
              If you are trying to use Binance Smart Chain please make sure you have it added on your wallet as
              explained
              <a
                style={{ textDecoration: 'none', color: '#00BFFF', marginLeft: 5 }}
                href="https://academy.binance.com/en/articles/connecting-metamask-to-binance-smart-chain"
                target="_blank"
              >
                here
              </a>
            </span>
          )}
        </Text>
      </Box>
    </HeadShake>
  );
};

export enum Signer {
  figment,
  bharvest,
  citadel,
  enigma,
  staked,
}

export const signerToString = (signer: Signer): string => {
  switch (signer) {
    case Signer.bharvest:
      return 'B-Harvest';
    case Signer.citadel:
      return 'Citadel.One';
    case Signer.enigma:
      return 'SCRT Labs';
    case Signer.figment:
      return 'Figment';
    case Signer.staked:
      return 'Staked';
  }
};

export const signerAddresses = {
  [NETWORKS.ETH]: {
    '0xd76c427fc6e48fc94d1c62e0a23c4bf07a22a3fb': Signer.bharvest,
    '0xcc3040b283ff0df84073a5a446d88d10ea329460': Signer.citadel,
    '0x9d06d59677b412c48f5f8546b45b9ea694a99698': Signer.enigma,
    '0x42194527ddccaee189313d77458ae491fa41256a': Signer.staked,
    '0x189fbd54bd7194cd4e49cbc067e92cfd6dc8281d': Signer.figment,
  },
  [NETWORKS.BSC]: {
    '0xd76c427fc6e48fc94d1c62e0a23c4bf07a22a3fb': Signer.bharvest,
    '0xcc3040b283ff0df84073a5a446d88d10ea329460': Signer.citadel,
    '0x08e54c84d61e9db2ed7ea53e2216276d75b5b426': Signer.enigma,
    '0x42194527ddccaee189313d77458ae491fa41256a': Signer.staked,
    '0x189fbd54bd7194cd4e49cbc067e92cfd6dc8281d': Signer.figment,
  },
};

export type HealthStatus = {
  time: Date;
  status: boolean;
};

export type HealthStatusDetailed = Record<Signer, HealthStatus>;
export const SignerTypes = [Signer.figment, Signer.enigma, Signer.citadel, Signer.bharvest, Signer.staked];

export function healthFromStatus(health: HealthStatusDetailed): boolean {
  if (!health) {
    return false;
  }

  let online = 0;
  let leaderOnline = false;
  for (const k of SignerTypes) {
    if (health[k]?.status) {
      online += 1;
      if (k === Signer.enigma) {
        leaderOnline = true;
      }
    }
  }
  return online >= Number(process.env.SIG_THRESHOLD) && leaderOnline;
}

export type NetworkTemplateInterface = {
  id?: NETWORKS;
  name: string;
  wallet: string;
  image: string;
  symbol: string;
  amount: string;
  health: HealthStatusDetailed;
  networkImage: string;
};

export const NetworkTemplate = (props: { template: NetworkTemplateInterface; user: any }) => {
  let overAllHealth = healthFromStatus(props.template.health);

  return (
    <Box direction="column">
      <Box direction="row" align={'start'} margin={{ top: 'xxsmall' }}>
        <Box direction="column" style={{ marginRight: 7, minWidth: 40 }} align="center">
          <img style={{ marginBottom: 5 }} height="37" src={props.template.networkImage} alt="network image" />
        </Box>

        <Box direction="column">
          <Title bold color={'#30303D'} margin={{ bottom: 'xxsmall' }}>
            {props.template.name}
          </Title>
          <Text size="medium" bold color={'#748695'}>
            {props.template.wallet}
          </Text>
        </Box>
      </Box>
      <HealthPopup health={props.template.health}>
        <Box direction="row" align={'start'} margin={{ top: 'xxsmall' }}>
          <Box direction="column" style={{ marginRight: 7, minWidth: 40 }} align="center">
            <IconUI style={{ margin: 0 }} className={'circle'} color={overAllHealth ? 'green' : 'red'} />
          </Box>
          <Box direction="column">
            <Text size="xsmall" color={'#748695'}>
              {overAllHealth ? 'Live' : 'Down'}
            </Text>
          </Box>
        </Box>
      </HealthPopup>
      {props.template.symbol && (
        <Box
          pad="xsmall"
          direction="row"
          align={'center'}
          margin={{ top: 'xxsmall' }}
          className={styles.networktemplatetoken}
        >
          {props.template.image && (
            <img src={props.template.image} style={{ width: 20, margin: '0 5' }} alt={props.template.symbol} />
          )}
          {props.template.amount === 'loading' ? (
            <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1.5em" style={{ margin: '0 10' }} />
          ) : props.template.amount === unlockToken ? (
            <Box direction="row" style={{ margin: '0 5' }}>
              <ViewingKeyIcon user={props.user} />
            </Box>
          ) : (
            <Text bold size="medium" style={{ margin: '0 5' }}>
              <span style={{ color: props.template.amount === wrongNetwork ? '#c5bb2e' : '#30303D' }}>
                {props.template.amount}
              </span>
            </Text>
          )}
          <Text bold style={{ margin: '0 5' }} color="#748695" size="medium">
            {props.template.symbol}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export const CopyRow = (props: { label: string; value: string; rawValue: string }) => (
  <HeadShake bottom>
    <Box style={{ height: 25 }} direction="row" align="center" justify="between">
      <Text size="small" bold>
        {props.label}
      </Text>

      <Box direction="row" align="center">
        <Text>{props.value}</Text>

        <CopyToClipboard text={props.rawValue} onCopy={() => createNotification('success', 'Copied to Clipboard!', 2)}>
          <Icon glyph="PrintFormCopy" size="1em" color="#1c2a5e" style={{ marginLeft: 10, width: 20 }} />
        </CopyToClipboard>
      </Box>
    </Box>
  </HeadShake>
);
