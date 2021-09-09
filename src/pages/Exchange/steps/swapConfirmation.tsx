import * as React from 'react';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Button, Icon, Text, Title } from 'components/Base';
import { Modal } from 'semantic-ui-react';
import { Box } from 'grommet';
import * as styles from '../styles.styl';
import { EXCHANGE_MODE } from 'stores/interfaces';
import { EXCHANGE_STEPS } from '../../../stores/Exchange';
import Loader from 'react-loader-spinner';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';
import { Price } from '../../Explorer/Components';
import { formatSymbol, formatWithSixDecimals, truncateAddressString, unlockToken } from 'utils';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useStores } from '../../../stores';
import { createNotification, TokenLocked } from '../utils';
import HeadShake from 'react-reveal/HeadShake';
import Jump from 'react-reveal/Jump';
import { chainProps, chainPropToString } from '../../../blockchain-bridge/eth/chainProps';

type NetworkTemplateInterface = {
  image: string;
  symbol: string;
  amount: number;
};

const renderNetworkTemplate = (template: NetworkTemplateInterface, justify: any) => (
  <Box
    justify={justify}
    fill
    pad="xsmall"
    direction="row"
    align="center"
    style={{ borderRadius: 10, backgroundColor: '#c3ecdb', height: 44 }}
  >
    {template.image && <img src={template.image} style={{ width: 20, marginRight: 10 }} alt={template.symbol} />}
    {template.symbol && (
      <Text bold color="#30303D" size="small">
        {formatWithSixDecimals(template.amount)}
      </Text>
    )}
    <Text bold margin={{ left: 'xxsmall' }} color="#235a58" size="small">
      {template.symbol}
    </Text>
  </Box>
);

export const SwapConfirmation = observer(() => {
  const { exchange, user, userMetamask } = useStores();
  const [hash, setHash] = useState<string>(null);
  const [correctNetwork, setCorrectNetwork] = useState<boolean>(true);
  const [calculated, setCalculated] = useState<number>(null);
  const [feePercentage, setFeePercentage] = useState<number>(0);
  const [isTokenLocked, setTokenLocked] = useState<boolean>(false);

  const symbol = formatSymbol(exchange.mode, exchange.transaction.tokenSelected.symbol);
  const tokenImage = exchange.transaction.tokenSelected.image;
  const amount = exchange.transaction.amount;

  const isFeeTooHigh = (): boolean => {
    return feePercentage >= 0.9;
  };

  const getFeePercentageText = (): string => {
    if (feePercentage >= 0.9) {
      return 'Cannot swap less than 90% of estimated fee';
    } else if (feePercentage >= 0.4) {
      return 'High fee estimated for this swap - Swap Anyway';
    } else {
      return 'Confirm';
    }
  };

  const getColorForFee = (): string => {
    if (feePercentage >= 0.9) {
      return '#f37373';
    } else if (feePercentage >= 0.4) {
      return '#f5e169';
    } else {
      return '#00ADE8';
    }
  };

  useEffect(() => {
    exchange.transaction.error = '';
    try {
      user.updateBalanceForSymbol(exchange.transaction.tokenSelected.symbol).then(() => {
        const balance = user.balanceToken[exchange.transaction.tokenSelected.src_coin];
        setTokenLocked(balance === unlockToken);
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    async function asyncRun() {
      setCorrectNetwork(await userMetamask.isCorrectNetworkSelected());
    }

    asyncRun();
  }, [userMetamask, userMetamask.network, userMetamask.chainId]);

  useEffect(() => {
    if (exchange.mode === EXCHANGE_MODE.TO_SCRT) {
      setHash(`${chainPropToString(chainProps.explorerUrl, exchange.network)}/tx/${exchange.txHash}`);
    }

    if (exchange.mode === EXCHANGE_MODE.FROM_SCRT) {
      setHash(`${process.env.SCRT_EXPLORER_URL}/transactions/${exchange.txHash}`);
    }
  }, [exchange.txHash]);

  useEffect(() => {
    let calculatedAmount = Number(exchange.transaction.amount) - Number(exchange.swapFeeToken);
    if (Number(calculatedAmount) < 0) {
      calculatedAmount = 0;
    }
    setCalculated(calculatedAmount);
    setFeePercentage(Number(exchange.swapFeeToken) / Number(exchange.transaction.amount));
  }, [exchange.transaction.amount, exchange.swapFeeToken]);

  const NTemplate1: NetworkTemplateInterface = {
    symbol: formatSymbol(
      exchange.mode === EXCHANGE_MODE.TO_SCRT ? EXCHANGE_MODE.TO_SCRT : EXCHANGE_MODE.FROM_SCRT,
      exchange.transaction.tokenSelected.symbol,
    ),
    amount: Number(amount),
    image: tokenImage,
  };

  const NTemplate2: NetworkTemplateInterface = {
    symbol: formatSymbol(
      exchange.mode === EXCHANGE_MODE.TO_SCRT ? EXCHANGE_MODE.FROM_SCRT : EXCHANGE_MODE.TO_SCRT,
      exchange.transaction.tokenSelected.symbol,
    ),
    amount: calculated,
    image: tokenImage,
  };

  return (
    <Modal
      onClose={() => (exchange.stepNumber = EXCHANGE_STEPS.BASE)}
      open={exchange.step.modal}
      style={{ width: '600px', display: 'flex' }}
    >
      <React.Fragment>
        <Modal.Header>
          <div style={{ padding: '12 32', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title bold>Confirm Transaction!</Title>
            <span style={{ cursor: 'pointer' }} onClick={() => (exchange.stepNumber = EXCHANGE_STEPS.BASE)}>
              <Icon size="23" glyph="Close" />
            </span>
          </div>
        </Modal.Header>
        <Modal.Content>
          <Box direction="column" fill={true} style={{ padding: '0 32' }}>
            <Box direction="row" fill={true} justify="between" align="center">
              {renderNetworkTemplate(NTemplate1, 'center')}
              <Box style={{ margin: '0 15' }}>
                <Icon size="60" glyph="Right" />
              </Box>
              {renderNetworkTemplate(NTemplate2, 'center')}
            </Box>

            <Text size="small" color="#748695" margin={{ top: 'xsmall', bottom: 'medium' }}>
              You are about to bridge{' '}
              <b>
                {amount} {symbol}
              </b>{' '}
              to <b>{exchange.mode === EXCHANGE_MODE.TO_SCRT ? 'Secret Network' : userMetamask.getNetworkFullName()}</b>
              , please be patient as the transaction may take a few minutes. You can follow each step of the transaction
              here once you confirm it!
            </Text>

            <Box direction="column">
              <Box direction="row" justify="between">
                <Text>Secret Address:</Text>
                <Box direction="row">
                  <Text size="small" style={{ fontFamily: 'monospace' }}>
                    {truncateAddressString(exchange.transaction.scrtAddress)}
                  </Text>
                  <CopyToClipboard
                    text={exchange.transaction.ethAddress}
                    onCopy={() => createNotification('success', 'Copied to Clipboard!', 2)}
                  >
                    <Icon glyph="PrintFormCopy" size="1em" color="#1c2a5e" style={{ marginLeft: 10, width: 20 }} />
                  </CopyToClipboard>
                </Box>
              </Box>
              <Box direction="row" margin={{ top: 'small' }} justify="between">
                <Text>{userMetamask.getNetworkFullName()} Address:</Text>
                <Box direction="row">
                  <Text size="small" style={{ fontFamily: 'monospace' }}>
                    {truncateAddressString(exchange.transaction.ethAddress)}
                  </Text>
                  <CopyToClipboard
                    text={exchange.transaction.ethAddress}
                    onCopy={() => createNotification('success', 'Copied to Clipboard!', 2)}
                  >
                    <Icon glyph="PrintFormCopy" size="1em" color="#1c2a5e" style={{ marginLeft: 10, width: 20 }} />
                  </CopyToClipboard>
                </Box>
              </Box>
              <Box direction="row" margin={{ top: 'small' }} justify="between">
                <Text>Amount:</Text>
                <Box direction="row">
                  <Text bold>{formatWithSixDecimals(exchange.transaction.amount)}</Text>

                  <img
                    src={exchange.transaction.tokenSelected.image}
                    style={{ marginLeft: 10 }}
                    width="20"
                    height="20"
                  />
                </Box>
              </Box>
            </Box>

            <Box style={{ height: 40 }} direction="row" justify="between" align="start" margin={{ top: 'large' }}>
              <Box direction="row" align="center">
                <img
                  style={{ marginRight: 6, width: exchange.mode === EXCHANGE_MODE.FROM_SCRT ? 15 : 12 }}
                  className={styles.imgToken}
                  src={exchange.mode === EXCHANGE_MODE.FROM_SCRT ? '/static/scrt.svg' : userMetamask.getNetworkImage()}
                />
                <Text bold size="small" color="#00ADE8">
                  {exchange.mode === EXCHANGE_MODE.FROM_SCRT ? 'Secret Network' : userMetamask.getNetworkFullName()}{' '}
                  {' Fee'}
                </Text>
              </Box>
              {exchange.isFeeLoading ? (
                <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />
              ) : (
                <Price
                  value={exchange.networkFee}
                  isEth={exchange.mode === EXCHANGE_MODE.TO_SCRT}
                  boxProps={{ pad: {} }}
                />
              )}
            </Box>

            {exchange.mode === EXCHANGE_MODE.FROM_SCRT && (
              <Box style={{ height: 40 }} direction="row" justify="between" align="start" margin={{ top: 'xsmall' }}>
                <Box className={styles.warningSign} direction="row" align="center">
                  <img style={{ marginRight: 6, width: 15, height: 15 }} src={userMetamask.getNetworkImage()} />
                  <Text bold size="small" color="#00ADE8" margin={{ right: 'xxsmall' }}>
                    {userMetamask.getNetworkFullName()} Fee (estimated)
                  </Text>
                </Box>
                {exchange.isFeeLoading ? (
                  <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />
                ) : (
                  <Price
                    value={formatWithSixDecimals(exchange.swapFeeToken)}
                    valueUsd={exchange.swapFeeUSD}
                    token={formatSymbol(EXCHANGE_MODE.TO_SCRT, exchange.transaction.tokenSelected.symbol)}
                    boxProps={{ pad: {} }}
                  />
                )}
              </Box>
            )}

            {exchange.mode === EXCHANGE_MODE.FROM_SCRT && (
              <Box style={{ height: 40 }} direction="row" align="start" margin={{ top: 'xsmall' }} justify="between">
                <Box direction="row" align="center">
                  <img
                    src={exchange.transaction.tokenSelected.image}
                    style={{ marginRight: 6, width: 15, height: 15 }}
                  />

                  <Text bold size="small" color="#00ADE8" margin={{ right: 'xxsmall' }}>
                    You will recieve
                  </Text>
                </Box>
                {!calculated ? (
                  <Loader type="ThreeDots" color="#00BFFF" height="1em" width="5em" />
                ) : (
                  <Text bold size="small" color={calculated === 0 ? '#f37373' : '#212D5E'}>
                    {formatWithSixDecimals(calculated)}{' '}
                    {formatSymbol(EXCHANGE_MODE.TO_SCRT, exchange.transaction.tokenSelected.symbol)}
                  </Text>
                )}
              </Box>
            )}

            {isTokenLocked && exchange.mode === EXCHANGE_MODE.TO_SCRT && (
              <TokenLocked user={user} onFinish={value => setTokenLocked(!value)} />
            )}

            {exchange.transaction.error && (
              <HeadShake bottom>
                <Box margin={{ top: 'xsmall' }}>
                  <Text color="red">{exchange.transaction.error}</Text>
                </Box>
              </HeadShake>
            )}

            {exchange.mode === EXCHANGE_MODE.FROM_SCRT && !correctNetwork && (
              <HeadShake bottom>
                <Box margin={{ top: 'xsmall' }}>
                  <Text color={'#a1991d'}>
                    Transaction fee is being calculated for the wrong network! Please change it accordingly on your
                    metamask.
                  </Text>
                </Box>
              </HeadShake>
            )}

            <Box fill direction="row" align="center" style={{ width: '100%' }} margin={{ top: 'large' }}>
              {!exchange.transaction.confirmed ? (
                <Button
                  className={styles.fill}
                  disabled={isFeeTooHigh()}
                  style={{
                    height: 50,
                    width: '100%',
                    background: getColorForFee(),
                    color: 'white',
                  }}
                  onClick={() => {
                    if (exchange.transaction.loading || isFeeTooHigh()) return;
                    return exchange.step.onClick();
                  }}
                >
                  {exchange.transaction.loading ? (
                    <Loader type="ThreeDots" color="#00BFFF" height="1em" width="5em" />
                  ) : (
                    getFeePercentageText()
                  )}
                </Button>
              ) : (
                <Jump>
                  <Button
                    className={styles.fill}
                    style={{ height: 50, width: 494, background: '#00ADE8', color: 'white' }}
                    onClick={() => {
                      return (exchange.stepNumber = EXCHANGE_STEPS.CHECK_TRANSACTION);
                    }}
                  >
                    Follow Transaction Status
                  </Button>
                </Jump>
              )}
            </Box>
            {exchange.mode === EXCHANGE_MODE.FROM_SCRT && (
              <Box margin={{ top: 'xsmall' }}>
                <Text color="#748695" size="xsmall">
                  You are about to move your secret tokens back to {userMetamask.getNetworkFullName()}. You will receive
                  approximately{' '}
                  <b>
                    {formatWithSixDecimals(calculated)} {symbol}
                  </b>{' '}
                  and{' '}
                  <b>
                    {formatWithSixDecimals(Number(exchange.swapFeeToken))} {symbol}
                  </b>{' '}
                  will be used to pay for {userMetamask.getNetworkFullName()} gas fees
                </Text>
              </Box>
            )}
          </Box>
        </Modal.Content>
      </React.Fragment>
    </Modal>
  );
});
