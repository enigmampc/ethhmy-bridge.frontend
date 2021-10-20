import * as React from 'react';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react';

import { Button, Icon, Text } from 'components/Base';
import * as styles from '../styles.styl';
import { Box } from 'grommet';
import Web3 from 'web3';
import * as bech32 from 'bech32';
import { divDecimals, sleep, unlockToken } from 'utils';
import { EXCHANGE_MODE, ITokenInfo, TOKEN } from 'stores/interfaces';
import { Form, Input, NumberInput } from 'components/Form';
import { ERC20Select } from '../ERC20Select';
import { NetworkSelect } from '../NetworkSelect';
import { AuthWarning } from '../../../components/AuthWarning';
import { Exchange, EXCHANGE_STEPS } from '../../../stores/Exchange';
import Loader from 'react-loader-spinner';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';
import HeadShake from 'react-reveal/HeadShake';
import ProgressBar from '@ramonak/react-progress-bar';
import {
  HealthStatus,
  HealthStatusDetailed,
  Signer,
  signerAddresses,
  TokenLocked,
  ViewingKeyIcon,
  WrongNetwork,
} from '../utils';
import { formatSymbol, wrongNetwork } from '../../../utils';
import { ISignerHealth } from '../../../stores/interfaces';
import { useStores } from '../../../stores';
import { getNetworkFee } from '../../../blockchain-bridge/eth/helpers';
import { toInteger } from 'lodash';
import cogoToast from 'cogo-toast';
import { UserStoreEx } from '../../../stores/UserStore';
import { UserStoreMetamask } from '../../../stores/UserStoreMetamask';
import { chainProps, chainPropToString } from '../../../blockchain-bridge/eth/chainProps';
import { EXTERNAL_NETWORKS, NETWORKS } from '../../../blockchain-bridge';
import { EXTERNAL_LINKS } from '../../../blockchain-bridge/eth/networks';
import { Header, Modal, Button as SemanticButton, Icon as SemanticIcon } from 'semantic-ui-react';

interface Errors {
  amount: string;
  token: any;
  address: string;
}

type BalanceAmountInterface = {
  minAmount: string;
  maxAmount: string;
};

export type BalanceInterface = {
  eth: BalanceAmountInterface;
  scrt: BalanceAmountInterface;
};

export const notify = (type: 'success' | 'error', msg: string, hideAfterSec: number = 10) => {
  const { hide } = cogoToast[type](msg, {
    position: 'top-right',
    hideAfter: hideAfterSec,
    onClick: () => {
      hide();
    },
  });
};

const disableBridge = {
  [EXCHANGE_MODE.FROM_SCRT]: {
    [NETWORKS.ETH]: true,
    [NETWORKS.BSC]: false,
  },
  [EXCHANGE_MODE.TO_SCRT]: {
    [NETWORKS.ETH]: true,
    [NETWORKS.BSC]: false,
  },
};

const validateTokenInput = (token: any) => {
  if (!token || !token.symbol) return 'This field is required.';
  return '';
};

const validateAmountInput = (value: string, minAmount: any, maxAmount: any) => {
  if (!value || !value.trim() || Number(value) <= 0) return 'This field is required.';
  if (Number(value) < Number(minAmount)) return 'Below the minimum amount.';
  if (Number(value) > Number(maxAmount) || !Number(maxAmount)) return 'Exceeded the maximum amount.';

  return '';
};

const validateAddressInput = (mode: EXCHANGE_MODE, value: string) => {
  if (!value) return 'Field required.';
  if (mode === EXCHANGE_MODE.FROM_SCRT) {
    const web3 = new Web3();
    if (!web3.utils.isAddress(value) || !web3.utils.checkAddressChecksum(value)) return 'Not a valid Ethereum Address.';
  }
  if (mode === EXCHANGE_MODE.TO_SCRT) {
    if (!value.startsWith('secret')) return 'Not a valid Secret Address.';

    try {
      bech32.decode(value);
    } catch (error) {
      return 'Not a valid Secret Address.';
    }
  }
  return '';
};

const getBalance = async (
  exchange: Exchange,
  userMetamask: UserStoreMetamask,
  user: UserStoreEx,
  isLocked: boolean,
  token: ITokenInfo,
): Promise<BalanceInterface> => {
  const eth = { minAmount: '0', maxAmount: '0' };
  const scrt = { minAmount: '0', maxAmount: '0' };

  const ethSwapFee = await getNetworkFee(Number(process.env.SWAP_FEE));
  const swapFeeUsd = ethSwapFee * userMetamask.getNetworkTokenPrice();
  const swapFeeToken = ((swapFeeUsd / Number(token.price)) * 0.9).toFixed(`${toInteger(token.price)}`.length);

  const src_coin = exchange.transaction.tokenSelected.src_coin;
  console.log(`${src_coin} ${userMetamask.balanceToken[src_coin]}`);
  const src_address = exchange.transaction.tokenSelected.src_address;
  eth.maxAmount = userMetamask.balanceToken[src_coin]
    ? divDecimals(userMetamask.balanceToken[src_coin], token.decimals)
    : wrongNetwork;
  eth.minAmount = userMetamask.balanceTokenMin[src_coin] || '0';
  scrt.maxAmount = user.balanceToken[src_coin] || '0';
  scrt.minAmount = `${Math.max(Number(swapFeeToken), Number(token.display_props.min_from_scrt))}` || '0';
  if (src_address === 'native') {
    eth.maxAmount = userMetamask.isCorrectNetworkSelected() ? userMetamask.nativeBalance || '0' : wrongNetwork;
    eth.minAmount = userMetamask.nativeBalanceMin || '0';
  }

  if (isLocked) {
    scrt.maxAmount = unlockToken;
  }

  return { eth, scrt };
};

function isNativeToken(selectedToken) {
  return selectedToken.src_address === 'native';
}

export const Base = observer(() => {
  const [open, setOpen] = useState<boolean>(false);
  const [externalUrl, setExternalUrl] = useState<string>('');
  const { user, userMetamask, actionModals, exchange, tokens } = useStores();
  const [errors, setErrors] = useState<Errors>({ token: '', address: '', amount: '' });
  const [selectedToken, setSelectedToken] = useState<any>({});
  const [isTokenLocked, setTokenLocked] = useState<boolean>(false);
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [warningAmount, setWarningAmount] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [metamaskNetwork, setMetamaskNetwork] = useState<NETWORKS>(NETWORKS.ETH);

  const defaultBalance: BalanceInterface = {
    eth: { minAmount: '', maxAmount: '' },
    scrt: { minAmount: '', maxAmount: '' },
  };
  const [balance, setBalance] = useState<BalanceInterface>(defaultBalance);
  const [onSwap, setSwap] = useState<boolean>(false);
  const [toApprove, setToApprove] = useState<boolean>(false);
  const [readyToSend, setReadyToSend] = useState<boolean>(false);
  const [toSecretHealth, setToSecretHealth] = useState<HealthStatusDetailed>(undefined);
  const [fromSecretHealth, setFromSecretHealth] = useState<HealthStatusDetailed>(undefined);

  const { signerHealth } = useStores();

  useEffect(() => {
    const testRateLimit = async () => {
      try {
        while (!user.secretjs) {
          await sleep(100);
        }
        await user.secretjs.getBlock();
      } catch (e) {
        console.log(e?.message);
        if (e?.message.includes('(')) {
          let error = JSON.parse(e.message.split('(')[0]);
          if (error?.statusCode === 429) {
            notify(
              'error',
              error?.message || 'This IP address has performed too many requests. Please wait 60 seconds and try again',
            );
          }
          console.log(error?.statusCode);
          if (error?.statusCode === 403) {
            notify(
              'error',
              `You have hit the daily quota of requests allowed. ${error?.message || 'Try again in 24 hours'}`,
            );
          }
        }
      }
    };
    testRateLimit();
  }, []);

  useEffect(() => {
    const signers: ISignerHealth[] = signerHealth.allData.find(health => health.network === userMetamask.network)
      ?.health;

    if (!signers?.length) {
      return;
    }

    const parseHealth = (signers: ISignerHealth[], direction: EXCHANGE_MODE): Record<Signer, HealthStatus> => {
      let healthStatus = {
        [Signer.staked]: undefined,
        [Signer.citadel]: undefined,
        [Signer.bharvest]: undefined,
        [Signer.enigma]: undefined,
        [Signer.figment]: undefined,
      };

      for (const signer of signers) {
        // note: We don't currently support multiple leader accounts for different networks
        // if we want to make the leader address change on a different network we need to add
        // it here
        const updatedonTimestamp = new Date(signer.updated_on).getTime();
        healthStatus[signerAddresses[metamaskNetwork][signer.signer.toLowerCase()]] = {
          time: updatedonTimestamp,
          status:
            new Date().getTime() - updatedonTimestamp < 1000 * 60 * 5 &&
            (direction === EXCHANGE_MODE.FROM_SCRT ? signer.from_scrt : signer.to_scrt),
        };
      }

      return healthStatus;
    };

    setFromSecretHealth(parseHealth(signers, EXCHANGE_MODE.FROM_SCRT));

    setToSecretHealth(parseHealth(signers, EXCHANGE_MODE.TO_SCRT));
    // setFromSecretHealth(
    //   parseHealth(
    //     userMetamask.getLeaderAddress(),
    //     signers.filter(s => s.from_scrt),
    //   ),
    // );
    // setToSecretHealth(
    //   parseHealth(
    //     userMetamask.getLeaderAddress(),
    //     signers.filter(s => s.to_scrt),
    //   ),
    // );
  }, [signerHealth.allData, userMetamask.network]);

  useEffect(() => {
    setSelectedToken(exchange.transaction.tokenSelected);
  }, [exchange.transaction.tokenSelected]);

  useEffect(() => {
    const fromNetwork = exchange.mode === EXCHANGE_MODE.TO_SCRT ? 'eth' : 'scrt'; //userMetamask.getCurrencySymbol();
    const min = balance[fromNetwork].minAmount;
    const max = balance[fromNetwork].maxAmount;
    setMinAmount(min);
    setMaxAmount(max);
    if (exchange.transaction.amount && Number(min) >= 0 && Number(max) >= 0) {
      const error = validateAmountInput(exchange.transaction.amount, min, max);
      setErrors({ ...errors, amount: error });
    }
  }, [exchange.mode, balance]);

  useEffect(() => {
    if (exchange.step.id === EXCHANGE_STEPS.BASE && exchange.transaction.tokenSelected.value) {
      onSelectedToken(exchange.transaction.tokenSelected.value);
    }
  }, [exchange.step.id]);

  useEffect(() => {
    const selectNetwork = async () => {
      if (userMetamask.network) {
        await onSelectNetwork(userMetamask.network);
      }
    };
    selectNetwork();
  }, [userMetamask.network, userMetamask.chainId, userMetamask.ethAddress]);

  useEffect(() => {
    if (
      Number(exchange.transaction.amount) > 0 &&
      selectedToken.symbol === userMetamask.getCurrencySymbol() &&
      exchange.mode === EXCHANGE_MODE.TO_SCRT &&
      exchange.transaction.amount >= maxAmount
    ) {
      setWarningAmount(
        `Remember to leave some ${chainPropToString(
          chainProps.currency_symbol,
          userMetamask.network || NETWORKS.ETH,
        )} behind to pay for network fees`,
      );
    } else {
      setWarningAmount('');
    }
  }, [exchange.transaction.amount, maxAmount, selectedToken, exchange.mode]);

  useEffect(() => {
    const approve =
      exchange.mode === EXCHANGE_MODE.TO_SCRT &&
      !exchange.isTokenApproved &&
      exchange.transaction.erc20Address !== '' &&
      !isNativeToken(selectedToken);

    setToApprove(approve);
    if (approve) {
      setProgress(1);
    }
  }, [selectedToken, exchange.mode, exchange.isTokenApproved, exchange.transaction.erc20Address]);

  useEffect(() => {
    if (
      exchange.isTokenApproved &&
      !toApprove &&
      exchange.mode === EXCHANGE_MODE.TO_SCRT &&
      !isNativeToken(selectedToken)
    ) {
      setProgress(2);
    }
  }, [selectedToken, toApprove, exchange.isTokenApproved, exchange.mode]);

  useEffect(() => {
    const address =
      exchange.mode === EXCHANGE_MODE.FROM_SCRT ? exchange.transaction.ethAddress : exchange.transaction.scrtAddress;
    const value =
      errors.token === '' &&
      errors.amount === '' &&
      errors.address === '' &&
      exchange.transaction.amount !== '' &&
      selectedToken !== '' &&
      address !== '' &&
      !toApprove;

    setReadyToSend(value);
  }, [
    toApprove,
    errors,
    exchange.transaction.amount,
    selectedToken,
    exchange.mode,
    exchange.transaction.ethAddress,
    exchange.transaction.scrtAddress,
  ]);

  const onSelectedToken = async value => {
    const token = (await tokens.tokensUsage('BRIDGE', userMetamask.network)).find(t => t.src_address === value);
    setProgress(0);
    const newerrors = errors;
    setBalance({
      eth: { minAmount: 'loading', maxAmount: 'loading' },
      scrt: { minAmount: 'loading', maxAmount: 'loading' },
    });

    if (isNativeToken(token)) {
      exchange.setToken(TOKEN.NATIVE);
      user.snip20Address = token.dst_address;
    } else {
      exchange.setToken(TOKEN.ERC20);
    }

    if (token.display_props.symbol !== exchange.transaction.tokenSelected.symbol) {
      exchange.transaction.amount = '';
      newerrors.amount = '';
    }
    exchange.transaction.confirmed = false;
    exchange.transaction.tokenSelected = {
      symbol: token.display_props.symbol,
      value: value,
      image: token.display_props.image,
      src_coin: token.src_coin,
      src_address: token.src_address,
    };

    if (token.display_props.proxy) {
      exchange.transaction.tokenSelected.symbol = token.display_props.proxy_symbol;
    }

    if (!isNativeToken(token)) {
      exchange.transaction.erc20Address = value;
      await exchange.checkTokenApprove(value);
    }

    const update = async () => {
      const amount = user.balanceToken[token.src_coin];
      const isLocked = amount === unlockToken;

      while (userMetamask.balancesLoading) {
        await sleep(50);
      }

      const balance = await getBalance(exchange, userMetamask, user, isLocked, token);

      setBalance(balance);
      setTokenLocked(amount === unlockToken);
      setErrors(newerrors);
    };

    newerrors.token = '';
    setTokenLocked(false);

    try {
      if (token.src_address !== 'native') {
        await userMetamask.setToken(value, tokens);
      }
      await user.updateBalanceForSymbol(token.display_props.symbol);
      await update();
    } catch (e) {
      await update();
    }
  };

  const onSelectNetwork = async (network: NETWORKS) => {
    if (EXTERNAL_NETWORKS.includes(network)) {
      setExternalUrl(EXTERNAL_LINKS[network]);
      setOpen(true);
    } else {
      userMetamask.setNetwork(network);
      setMetamaskNetwork(network);
      exchange.clear();
      setErrors({ token: '', address: '', amount: '' });
      setProgress(0);
      setTokenLocked(false);
      if (!location.pathname.startsWith('/operations')) exchange.stepNumber = EXCHANGE_STEPS.BASE;
      await onSelectedToken('native');
    }
  };

  const onClickHandler = async (callback: () => void) => {
    if (!user.isAuthorized) {
      if (exchange.mode === EXCHANGE_MODE.FROM_SCRT) {
        if (!user.isKeplrWallet) {
          return actionModals.open(() => <AuthWarning />, {
            title: '',
            applyText: 'Got it',
            closeText: '',
            noValidation: true,
            width: '500px',
            showOther: true,
            onApply: () => {
              return Promise.resolve();
            },
          });
        } else {
          await user.signIn();
        }
      }
    }

    if (!userMetamask.isAuthorized && exchange.mode === EXCHANGE_MODE.TO_SCRT) {
      if (!userMetamask.isAuthorized) {
        return await userMetamask.signIn(true);
      }
    }

    callback();
  };

  return (
    <Box fill direction="column" background="transparent">
      <Box
        fill
        direction="row"
        justify="around"
        pad="xlarge"
        background="#f5f5f5"
        style={{ zIndex: 1, position: 'relative' }}
      >
        <HeadShake spy={onSwap} delay={0}>
          <NetworkSelect
            value={metamaskNetwork}
            secret={exchange.mode === EXCHANGE_MODE.FROM_SCRT}
            balance={balance}
            toSecretHealth={toSecretHealth}
            fromSecretHealth={fromSecretHealth}
            onChange={network => onSelectNetwork(network.id || network.value)}
          />
        </HeadShake>
        <Box
          style={{ margin: '0 16', position: 'absolute', left: 'Calc(50% - 60px)' }}
          className={styles.reverseButton}
        >
          <Icon
            size="60"
            glyph="Reverse"
            onClick={async () => {
              exchange.transaction.amount = '';
              setErrors({ token: '', address: '', amount: '' });
              setSwap(!onSwap);
              setProgress(0);

              exchange.mode === EXCHANGE_MODE.TO_SCRT
                ? exchange.setMode(EXCHANGE_MODE.FROM_SCRT)
                : exchange.setMode(EXCHANGE_MODE.TO_SCRT);
            }}
          />
        </Box>
        <HeadShake spy={onSwap} delay={0}>
          <NetworkSelect
            value={metamaskNetwork}
            secret={exchange.mode === EXCHANGE_MODE.TO_SCRT}
            balance={balance}
            toSecretHealth={toSecretHealth}
            fromSecretHealth={fromSecretHealth}
            onChange={network => onSelectNetwork(network.id || network.value)}
          />
        </HeadShake>
      </Box>
      <Box fill direction="column" className={styles.exchangeContainer}>
        <Form data={exchange.transaction} {...({} as any)}>
          <Box className={styles.baseContainer}>
            <Box className={styles.baseRightSide} gap="2px">
              <Box width="100%" margin={{ right: 'medium' }} direction="column">
                <ERC20Select value={selectedToken.value} onSelectToken={value => onSelectedToken(value)} />
                <Box style={{ minHeight: 20 }} margin={{ top: 'medium' }} direction="column">
                  {errors.token && (
                    <HeadShake>
                      <Text color="red">{errors.token}</Text>
                    </HeadShake>
                  )}
                </Box>
              </Box>
              <Box direction="column" width="100%">
                <Text bold size="large">
                  Amount
                </Text>
                <Box
                  direction="row"
                  style={{ height: 46, borderRadius: 4, border: 'solid 1px #E7ECF7', marginTop: 8 }}
                  fill
                  justify="between"
                  align="center"
                >
                  <Box width="40%" style={{ flex: 1 }}>
                    <NumberInput
                      name="amount"
                      type="decimal"
                      precision="18"
                      delimiter="."
                      placeholder="0"
                      margin={{ bottom: 'none' }}
                      value={exchange.transaction.amount}
                      className={styles.input}
                      style={{ borderColor: 'transparent', height: 44 }}
                      onChange={async value => {
                        exchange.transaction.amount = value;
                        const error = validateAmountInput(value, minAmount, maxAmount);
                        setErrors({ ...errors, amount: error });
                      }}
                    />
                  </Box>

                  <Box direction="row" align="center" justify="end">
                    <Box className={styles.maxAmountInput} direction="row">
                      <Text bold margin={{ right: 'xxsmall' }}>
                        /
                      </Text>
                      {maxAmount === 'loading' ? (
                        <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />
                      ) : maxAmount === unlockToken ? (
                        <ViewingKeyIcon user={user} />
                      ) : (
                        <Text bold className={styles.maxAmountInput}>
                          {maxAmount}
                        </Text>
                      )}
                    </Box>

                    <Button
                      margin={{ left: 'xsmall', right: 'xsmall' }}
                      bgColor="#DEDEDE"
                      pad="xxsmall"
                      onClick={() => {
                        if (maxAmount === unlockToken || maxAmount === wrongNetwork) return;
                        if (validateAmountInput(maxAmount, minAmount, maxAmount)) return;
                        exchange.transaction.amount = maxAmount;
                      }}
                    >
                      <Text size="xxsmall" bold>
                        MAX
                      </Text>
                    </Button>
                  </Box>
                </Box>
                <Box margin={{ top: 'xxsmall' }} direction="row" align="center" justify="between">
                  <Box direction="row">
                    <Text bold size="small" color="#00ADE8" margin={{ right: 'xxsmall' }}>
                      Minimum:
                    </Text>
                    {minAmount === 'loading' ? (
                      <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />
                    ) : (
                      <Text size="small" color="#748695">
                        {`${minAmount} ${formatSymbol(exchange.mode, selectedToken.symbol)}`}
                      </Text>
                    )}
                  </Box>
                  {exchange.transaction.tokenSelected.value && (
                    <Box margin={{ right: 'xxsmall' }}>
                      <Icon
                        size="15"
                        glyph="Refresh"
                        onClick={async () => {
                          onSelectedToken(exchange.transaction.tokenSelected.value);
                        }}
                      />
                    </Box>
                  )}
                </Box>

                <Box style={{ minHeight: 38 }} margin={{ top: 'medium' }} direction="column">
                  {errors.amount && (
                    <HeadShake bottom>
                      <Text margin={{ bottom: 'xxsmall' }} color="red">
                        {errors.amount}
                      </Text>
                    </HeadShake>
                  )}
                  {warningAmount && (
                    <HeadShake bottom>
                      <Text color="#97a017">{warningAmount}</Text>
                    </HeadShake>
                  )}
                </Box>
              </Box>
            </Box>

            <Box className={styles.addressInput}>
              {((exchange.mode === EXCHANGE_MODE.FROM_SCRT && userMetamask.isAuthorized) ||
                (exchange.mode === EXCHANGE_MODE.TO_SCRT && user.isAuthorized)) && (
                <Box
                  style={{
                    fontWeight: 'bold',
                    right: 0,
                    top: 0,
                    position: 'absolute',
                    color: 'rgb(0, 173, 232)',
                    textAlign: 'right',
                  }}
                  onClick={() => {
                    if (exchange.mode === EXCHANGE_MODE.FROM_SCRT) {
                      exchange.transaction.ethAddress = userMetamask.ethAddress;
                      setErrors({ ...errors, address: validateAddressInput(exchange.mode, userMetamask.ethAddress) });
                    } else {
                      exchange.transaction.scrtAddress = user.address;
                      setErrors({ ...errors, address: validateAddressInput(exchange.mode, user.address) });
                    }
                  }}
                >
                  Use my address
                </Box>
              )}

              <Input
                label={
                  exchange.mode === EXCHANGE_MODE.FROM_SCRT
                    ? `Destination ${userMetamask.getCurrencySymbol()} Address`
                    : 'Destination Secret Address'
                }
                name={exchange.mode === EXCHANGE_MODE.FROM_SCRT ? 'ethAddress' : 'scrtAddress'}
                style={{ width: '100%' }}
                className={styles.input}
                margin={{ bottom: 'none' }}
                placeholder="Receiver address"
                value={
                  exchange.mode === EXCHANGE_MODE.FROM_SCRT
                    ? exchange.transaction.ethAddress
                    : exchange.transaction.scrtAddress
                }
                onChange={value => {
                  if (exchange.mode === EXCHANGE_MODE.FROM_SCRT) exchange.transaction.ethAddress = value;
                  if (exchange.mode === EXCHANGE_MODE.TO_SCRT) exchange.transaction.scrtAddress = value;
                  const error = validateAddressInput(exchange.mode, value);
                  setErrors({ ...errors, address: error });
                }}
              />
              <Box style={{ minHeight: 20 }} margin={{ top: 'medium' }} direction="column">
                {errors.address && (
                  <HeadShake>
                    <Text color="red">{errors.address}</Text>
                  </HeadShake>
                )}
              </Box>
            </Box>
          </Box>
        </Form>

        <Box direction="row" style={{ padding: '0 32 24 32', height: 120 }} justify="between" align="end">
          <Box style={{ maxWidth: '50%' }}>
            {isTokenLocked && (
              <TokenLocked
                user={user}
                onFinish={value => {
                  setTokenLocked(!value);
                  onSelectedToken(exchange.transaction.tokenSelected.value);
                }}
              />
            )}
            {userMetamask.chainId && !userMetamask.isCorrectNetworkSelected() && (
              <WrongNetwork networkSelected={metamaskNetwork} />
            )}
          </Box>
          <Box direction="column">
            {progress > 0 && (
              <Box direction="row" align="center" margin={{ left: '75', bottom: 'small' }} fill>
                <Text
                  className={styles.progressNumber}
                  style={{ background: progress === 2 ? '#00ADE888' : '#00ADE8' }}
                >
                  1
                </Text>
                <ProgressBar
                  height="4"
                  width="220"
                  bgColor={'#00BFFF'}
                  completed={progress * 50}
                  isLabelVisible={false}
                />
                <Text className={styles.progressNumber} style={{ background: progress === 1 ? '#E4E4E4' : '#00ADE8' }}>
                  2
                </Text>
              </Box>
            )}

            <Box direction="row">
              {exchange.mode === EXCHANGE_MODE.TO_SCRT && selectedToken.symbol !== '' && !isNativeToken(selectedToken) && (
                <Button
                  disabled={exchange.tokenApprovedLoading || !toApprove}
                  bgColor={'#00ADE8'}
                  color={'white'}
                  style={{ minWidth: 180, height: 48 }}
                  onClick={() => {
                    const tokenError = validateTokenInput(selectedToken);
                    setErrors({ ...errors, token: '' });
                    if (tokenError) return setErrors({ ...errors, token: tokenError });

                    if (exchange.step.id === EXCHANGE_STEPS.BASE) onClickHandler(exchange.step.onClickApprove);
                  }}
                >
                  {exchange.tokenApprovedLoading ? (
                    <Loader type="ThreeDots" color="#00BFFF" height="15px" width="2em" />
                  ) : exchange.isTokenApproved ? (
                    'Approved!'
                  ) : (
                    'Approve'
                  )}
                </Button>
              )}

              <Button
                disabled={!readyToSend || disableBridge[exchange.mode][userMetamask.network]}
                margin={{ left: 'medium' }}
                bgColor={!toApprove ? '#00ADE8' : '#E4E4E4'}
                color={!toApprove ? 'white' : '#748695'}
                style={{ minWidth: 300, height: 48 }}
                onClick={() => {
                  if (exchange.step.id === EXCHANGE_STEPS.BASE) {
                    onClickHandler(exchange.step.onClickSend);
                  }
                }}
              >
                {exchange.mode === EXCHANGE_MODE.TO_SCRT
                  ? 'Bridge to Secret Network'
                  : `Bridge to ${userMetamask.getNetworkFullName()}`}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
      <Modal
        basic
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}
        open={open}
        size="small"
        trigger={<div />}
      >
        <Header icon>
          <SemanticIcon name="external alternate" />
          Leave Secret Bridge
        </Header>
        <Modal.Content>
          <p>You are now leaving the Secret Bridge to: {externalUrl}.</p>
          <p>
            We take no responsibility for any page, content, actions or consequences on 3rd party sites. Please use
            caution and good judgement when using any crypto application.
          </p>
        </Modal.Content>
        <Modal.Actions>
          <SemanticButton basic color="red" inverted onClick={() => setOpen(false)}>
            <SemanticIcon name="remove" /> Take me back
          </SemanticButton>
          <SemanticButton
            color="blue"
            inverted
            onClick={() => {
              setOpen(false);

              const win = window.open(externalUrl, '_blank');
              win.focus();
            }}
          >
            <SemanticIcon name="checkmark" /> Continue
          </SemanticButton>
        </Modal.Actions>
      </Modal>
    </Box>
  );
});
