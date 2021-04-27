import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Box } from 'grommet';
import { BaseContainer, PageContainer } from 'components';
import { observer } from 'mobx-react-lite';
import { useStores } from 'stores';
import * as styles from '../EthBridge/styles.styl';
// import { IColumn, Table } from '../../components/Table';
// import { ERC20Select } from '../Exchange/ERC20Select';
import EarnRow from '../../components/Earn/EarnRow';
import { rewardsDepositKey, rewardsKey } from '../../stores/UserStore';
import {
  displayHumanizedBalance,
  divDecimals,
  fixUnlockToken,
  humanizeBalance,
  sleep,
  truncateAddressString,
  unlockToken,
} from '../../utils';
import { InfoModalEarn } from '../../components/InfoModalEarn';
import EarnInfoBox from '../../components/Earn/EarnInfoBox';
import { IRewardPool, ITokenInfo } from '../../stores/interfaces';
import Loader from 'react-loader-spinner';
import { Text } from 'components/Base';
import { notify } from '../Earn';
import * as thisStyles from './styles.styl';
import cn from 'classnames';
import { ethMethodsSefi, web3 } from '../../blockchain-bridge/eth';
import { CheckClaimModal } from '../../components/Earn/ClaimToken/CheckClaim';
import { claimErc, claimScrt } from '../../components/Earn/ClaimToken/utils';
import { unlockJsx, wrongViewingKey } from 'pages/Swap/utils';
import BigNumber from 'bignumber.js';

function SefiBalance(props: { address: string; sefiBalance: string | JSX.Element; isEth?: boolean }) {
  const src_img = props.isEth ? '/static/eth.png' : '/static/scrt.svg';

  return (
    <div className={cn(thisStyles.balanceContainer)}>
      <img className={styles.imgToken} style={{ height: 18 }} src={src_img} alt={'scrt'} />
      <button className={cn(thisStyles.balanceButton)}>
        <Text>{truncateAddressString(props.address, 10)}</Text>
      </button>
      <div className={cn(thisStyles.balanceAmount)}>
        {props.sefiBalance ? (
          <Text>
            {props.sefiBalance} {'SEFI'}
          </Text>
        ) : (
          <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />
        )}
      </div>
    </div>
  );
}

interface RewardData {
  reward: IRewardPool;
  token: ITokenInfo;
}

export const SeFiPage = observer(() => {
  const { user, tokens, rewards, userMetamask } = useStores();

  const [filteredTokens, setFilteredTokens] = useState<ITokenInfo[]>([]);

  const [sefiBalance, _setSefiBalance] = useState<string | JSX.Element>('');

  function setSefiBalance(balance: string) {
    if (balance === unlockToken) {
      balance = unlockJsx({
        onClick: async () => {
          await user.keplrWallet.suggestToken(user.chainId, process.env.SCRT_GOV_TOKEN_ADDRESS);
          await user.updateBalanceForSymbol('SEFI');
          setSefiBalance(user.balanceToken['SEFI']);
        },
      });
      _setSefiBalance(balance);
    } else if (balance === fixUnlockToken) {
      _setSefiBalance(wrongViewingKey);
    } else {
      _setSefiBalance(balance);
    }
  }

  async function addSefiToWatchlist() {
    try {
      // wasAdded is a boolean. Like any RPC method, an error may be thrown.
      const wasAdded = await web3.currentProvider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20', // Initially only supports ERC20, but eventually more!
          options: {
            address: process.env.ETH_GOV_TOKEN_ADDRESS, // The address that the token is at.
            symbol: 'SEFI', // A ticker symbol or shorthand, up to 5 chars.
            decimals: 6, // The number of decimals in the token
            image: 'https://pbs.twimg.com/profile_images/1361712479546474498/1a3370iV_400x400.jpg', // A string url of the token logo
          },
        },
      });

      if (wasAdded) {
        notify('success', 'SeFi in on your watchlist on Metamask');
      }
    } catch (error) {
      notify('error', `Failed to add SeFi to the watchlist on Metamask: ${error}`);
      console.log(`Failed to add SeFi to the watchlist on Metamask: ${error}`);
    }
  }

  const [sefiBalanceErc, setSefiBalanceErc] = useState<string>(undefined);

  const [rewardsData, setRewardsData] = useState<RewardData[]>([]);

  useEffect(() => {
    const asyncWrapper = async () => {
      while (rewards.isPending) {
        await sleep(100);
      }
      const mappedRewards = rewards.allData
        .filter(rewards => filteredTokens.find(element => element.dst_address === rewards.inc_token.address))
        .map(reward => {
          return { reward, token: filteredTokens.find(element => element.dst_address === reward.inc_token.address) };
        });

      setRewardsData(mappedRewards);
    };
    asyncWrapper().then(() => {});
  }, [filteredTokens, rewards, rewards.data]);

  const testSetTokens = useCallback(() => {
    const asyncWrapper = async () => {
      if (tokens.allData.length > 0) {
        await sleep(500);
        setFilteredTokens(tokens.tokensUsageSync('LPSTAKING'));
      }
    };
    asyncWrapper();
  }, [tokens, tokens.allData]);

  useEffect(() => {
    testSetTokens();
  }, [testSetTokens]);

  useEffect(() => {
    (async () => {
      if (userMetamask.ethAddress) {
        const balanceResult = await ethMethodsSefi.checkGovBalance(userMetamask.ethAddress);

        const asBigNumber = new BigNumber(balanceResult);
        if (asBigNumber.isNaN()) {
          setSefiBalanceErc(balanceResult);
        } else {
          setSefiBalanceErc(displayHumanizedBalance(humanizeBalance(asBigNumber, 6), null, 6));
        }
      }
    })();
  }, [userMetamask, userMetamask.ethAddress]);

  useEffect(() => {
    const refreshSefi = async () => {
      // if (filteredTokens.length <= 0) {
      //   return;
      // }
      while (!user.secretjs || tokens.isPending) {
        await sleep(100);
      }
      await user.updateBalanceForSymbol('SEFI');
      //await Promise.all(filteredTokens.map(token => user.updateBalanceForSymbol(token.display_props.symbol)));
      setSefiBalance(user.balanceToken['SEFI']);
    };

    refreshSefi().then(() => {});
  }, []);

  useEffect(() => {
    rewards.init({
      isLocal: true,
      sorter: 'none',
      pollingInterval: 20000,
    });
    rewards.fetch();
    tokens.init();
  }, []);

  return (
    <BaseContainer>
      <PageContainer>
        <Box direction="row" wrap={true} fill={true} justify="center" align="start">
          <Box direction="column" align="center" justify="center" style={{ marginTop: '10px' }}>
            <EarnInfoBox type={'LPSTAKING'} />

            <div
              style={{
                width: '1000px',
                padding: '20px',
                backgroundColor: 'transparent',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  borderRadius: '10px',
                  width: '45%',
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '5px',
                }}
              >
                <SefiBalance address={user.address} sefiBalance={sefiBalance} />
                <CheckClaimModal
                  secretjs={user.secretjs}
                  address={user.address}
                  isEth={false}
                  loadingBalance={!user.address}
                  onClick={async () => {
                    try {
                      await claimScrt(user.secretjsSend, user.address);
                      notify('success', 'Claimed SeFi successfully!');
                    } catch (e) {
                      console.error(`failed to claim ${e}`);
                      notify('error', 'Failed to claim SeFi!');
                    } finally {
                      await user.updateBalanceForSymbol('SEFI');
                      setSefiBalance(user.balanceToken['SEFI']);
                    }
                  }}
                />
                {/*<ClaimTokenErc />*/}
                {/*<ClaimTokenScrt />*/}
              </div>

              <div
                style={{
                  borderRadius: '10px',
                  marginLeft: '200px',
                  width: '45%',
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '5px',
                }}
              >
                <SefiBalance address={userMetamask.ethAddress} sefiBalance={sefiBalanceErc} isEth={true} />
                <CheckClaimModal
                  address={userMetamask.ethAddress}
                  isEth={true}
                  loadingBalance={!userMetamask.ethAddress}
                  onClick={async () => {
                    try {
                      await addSefiToWatchlist();
                      await claimErc();
                      notify('success', 'Claimed SeFi successfully!');
                    } catch (e) {
                      console.error(`failed to claim ${e}`);
                      notify('error', 'Failed to claim SeFi!');
                    }
                  }}
                />
                {/*<ClaimTokenErc />*/}
                {/*<ClaimTokenScrt />*/}
              </div>
            </div>
          </Box>
          <Box direction="column" align="center" justify="center" className={styles.base}>
            {rewardsData
              .slice()
              .sort((a, b) => {
                /* SEFI first */
                if (a.reward.inc_token.symbol === 'SEFI') {
                  return -1;
                }

                return 0;
              })
              .filter(rewardToken => (process.env.TEST_COINS ? true : !rewardToken.reward.hidden))
              .map(rewardToken => {
                if (Number(rewardToken.reward.deadline) < 2_000_000) {
                  return null;
                }

                const rewardsToken = {
                  rewardsContract: rewardToken.reward.pool_address,
                  lockedAsset: rewardToken.reward.inc_token.symbol,
                  lockedAssetAddress: rewardToken.token.dst_address,
                  totalLockedRewards: divDecimals(
                    Number(rewardToken.reward.total_locked) * Number(rewardToken.reward.inc_token.price),
                    rewardToken.reward.inc_token.decimals,
                  ),
                  rewardsDecimals: String(rewardToken.reward.rewards_token.decimals),
                  rewards: user.balanceRewards[rewardsKey(rewardToken.reward.inc_token.symbol)],
                  deposit: user.balanceRewards[rewardsDepositKey(rewardToken.reward.inc_token.symbol)],
                  balance: user.balanceToken[rewardToken.token.src_coin],
                  decimals: rewardToken.token.decimals,
                  name: rewardToken.token.name,
                  price: String(rewardToken.reward.inc_token.price),
                  rewardsPrice: String(rewardToken.reward.rewards_token.price),
                  display_props: rewardToken.token.display_props,
                  remainingLockedRewards: rewardToken.reward.pending_rewards,
                  deadline: Number(rewardToken.reward.deadline),
                  rewardsSymbol: 'SEFI',
                };

                return (
                  <EarnRow
                    notify={notify}
                    key={rewardToken.reward.inc_token.symbol}
                    userStore={user}
                    token={rewardsToken}
                    callToAction="Earn SeFi"
                  />
                );
              })}
          </Box>
        </Box>
        <InfoModalEarn />
      </PageContainer>
    </BaseContainer>
  );
});
