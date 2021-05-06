import BigNumber from 'bignumber.js';
import { getFeeForExecute } from '../../blockchain-bridge';
import { AsyncSender } from '../../blockchain-bridge/scrt/asyncSender';
import { FlexRowSpace } from 'components/Swap/FlexRowSpace';
import React from 'react';
import { render } from 'react-dom';
import Loader from 'react-loader-spinner';
import { ExecuteResult, SigningCosmWasmClient } from 'secretjs';
import { Button, Container, Icon, Message, Popup } from 'semantic-ui-react';
import { useStores } from 'stores';
import { canonicalizeBalance, displayHumanizedBalance, humanizeBalance } from 'utils/formatNumber';
import { getNativeBalance, storeTxResultLocally, unlockJsx } from './utils';
import { UserStoreEx } from 'stores/UserStore';
import { Tokens } from 'stores/Tokens';
import { SwapTokenMap } from './types/SwapToken';

export class Cashback extends React.Component<
  {
    user: UserStoreEx;
    secretjsSender: AsyncSender;
    refreshBalances: CallableFunction;
    balances;
    tokens: Tokens;
    allTokens: SwapTokenMap;
    notify: (type: 'success' | 'error' | 'errorWithHash', msg: string, closesAfterMs?: number, txHash?: string) => void;
  },
  { loadingSwap: boolean; cbRatio: number | JSX.Element }
> {
  constructor(props) {
    super(props);

    const cashbackAddr = 'secret1g022tjrppardjmal2e7jx2jljvgnkzatxfhtht';
    const sefiAddr = 'secret12q2c5s5we5zn9pq43l0rlsygtql6646my0sqfm';

    this.state = {
      loadingSwap: false,
      cbRatio: undefined,
    };

    setTimeout(() => {
      this.calcRatio(this.props.user, this.props.tokens, sefiAddr, cashbackAddr).then(ratio => {
        console.log('################## ratio');
        this.setState({
          cbRatio: ratio,
        });
      });
    }, 5000);
    setInterval(() => {
      this.calcRatio(this.props.user, this.props.tokens, sefiAddr, cashbackAddr).then(ratio => {
        console.log('################## ratio');
        this.setState({
          cbRatio: ratio,
        });
      });
    }, 5000);
  }

  extractError(result: any) {
    if (result?.raw_log && result.raw_log.includes('Operation fell short of expected_return')) {
      return 'Swap fell short of expected return (slippage error)';
    }
    if (result?.raw_log) {
      return result.raw_log;
    }
    console.error(result);
    return `Unknown error`;
  }

  async calcRatio(user: UserStoreEx, tokens: Tokens, sefi: string, cashback: string): Promise<number> {
    try {
      const masterAddr = 'secret13hqxweum28nj0c53nnvrpd23ygguhteqggf852';

      const secretjs = user.secretjs;

      let result = await secretjs.queryContractSmart(cashback, { token_info: {} });
      const cbTotalSuppply = parseInt(result.token_info.total_supply);

      result = await secretjs.queryContractSmart(cashback, { reward_balance: {} });
      const cbRewardBalance = parseInt(result.reward_balance.balance);

      const block = (await user.secretjs.getBlock()).header.height;
      result = await secretjs.queryContractSmart(masterAddr, {
        pending: {
          spy_addr: cashback,
          block,
        },
      });
      const cbPendingRewards = parseInt(result.pending.amount);

      // Not working on testnet
      // const sefiUSD = parseInt(tokens.allData.find(t => t.display_props.symbol === 'SEFI').price);
      // const scrtUSD = parseInt(tokens.allData.find(t => t.display_props.symbol === 'SSCRT').price);

      return (((cbRewardBalance + cbPendingRewards) * 0.2) / (cbTotalSuppply * 3.8 * 0.003)) * 100;
    } catch (e) {
      console.log(e);
      return undefined;
    }
  }

  render() {
    const cashbackAddr = 'secret1g022tjrppardjmal2e7jx2jljvgnkzatxfhtht';
    const sefiAddr = 'secret12q2c5s5we5zn9pq43l0rlsygtql6646my0sqfm';
    const cashbackBalance = this.props.balances[cashbackAddr];
    const sefiBalance = this.props.balances[sefiAddr];

    // if (this.state.cbRatio === undefined) {
    //   this.calcRatio(this.props.user, this.props.tokens, sefiAddr, cashbackAddr).then(ratio => {
    //     this.setState({
    //       cbRatio: ratio,
    //     });
    //   });
    // }

    return (
      // <div style={{ paddingLeft: '1000px', paddingRight: '1000px' }}>
      <div style={{ width: '500px', marginBottom: '1rem' }}>
        <Container
          style={{
            padding: '1rem',
            borderRadius: '20px',
            border: '1px solid rgb(247, 248, 250)',
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              textAlign: 'center',
            }}
          >
            <h4>
              Cashback Beta
              <Popup
                trigger={
                  <Icon
                    name="help"
                    circular
                    size="tiny"
                    style={{
                      marginLeft: '0.5rem',
                      verticalAlign: 'middle',
                    }}
                  />
                }
                position="top center"
              >
                <Popup.Content style={{ width: '500px' }}>
                  Hello secret beta testers 🤫 This is a temporary proof of concept. Thanks for trying this out!
                  <ul>
                    <li>
                      You will accumulate CSHBK just by using Secret Swap.{' '}
                      <strong>Currently on testnet the only pair that will give you cashback is sSCRT/SCRT.</strong>
                    </li>
                    <li>
                      It will work even if the swapping route takes you through the sSCRT/SCRT pair along the route.
                    </li>
                    <li>Once you got CSHBK, you can convert it to SEFI.</li>
                  </ul>
                </Popup.Content>
              </Popup>
            </h4>
          </div>
          <br></br>
          <div
            style={{
              display: 'flex',
            }}
          >
            <span
              style={{
                fontWeight: 500,
                fontSize: '14px',
                color: 'rgb(86, 90, 105)',
              }}
            >
              <div style={{ display: 'flex' }}>
                {'CSHBK Balance: '}
                {(() => {
                  if (cashbackBalance === undefined) {
                    return (
                      <>
                        <span style={{ marginRight: '0.5em' }} />
                        <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" style={{ margin: 'auto' }} />
                      </>
                    );
                  }

                  if (JSON.stringify(cashbackBalance).includes('View')) {
                    return cashbackBalance;
                  }

                  if (this.props.allTokens.size > 0) {
                    return displayHumanizedBalance(
                      humanizeBalance(
                        new BigNumber(cashbackBalance as BigNumber),
                        this.props.allTokens.get(cashbackAddr).decimals,
                      ),
                      BigNumber.ROUND_DOWN,
                    );
                  }
                  return undefined;
                })()}
              </div>
            </span>
            <FlexRowSpace />
            <span
              style={{
                fontWeight: 500,
                fontSize: '14px',
                color: 'rgb(86, 90, 105)',
              }}
            >
              <div style={{ display: 'flex' }}>
                {'SEFI Balance: '}
                {(() => {
                  if (sefiBalance === undefined) {
                    return (
                      <>
                        <span style={{ marginRight: '0.5em' }} />
                        <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" style={{ margin: 'auto' }} />
                      </>
                    );
                  }

                  if (JSON.stringify(sefiBalance).includes('View')) {
                    return sefiBalance;
                  }

                  if (this.props.allTokens.size > 0) {
                    return displayHumanizedBalance(
                      humanizeBalance(
                        new BigNumber(sefiBalance as BigNumber),
                        this.props.allTokens.get(sefiAddr).decimals,
                      ),
                      BigNumber.ROUND_DOWN,
                    );
                  }
                  return undefined;
                })()}
              </div>
            </span>
          </div>
          <br></br>
          <div
            style={{
              textAlign: 'center',
            }}
          >
            <Popup
              trigger={
                <Button
                  disabled={cashbackBalance == 0 || isNaN(cashbackBalance)}
                  loading={this.state.loadingSwap}
                  primary={true}
                  onClick={async () => {
                    this.setState({ loadingSwap: true });
                    const { decimals } = this.props.allTokens.get(cashbackAddr);
                    const humanBalance = humanizeBalance(cashbackBalance, decimals);

                    try {
                      const result = await this.props.secretjsSender.asyncExecute(
                        cashbackAddr,
                        {
                          burn: {
                            amount: cashbackBalance,
                          },
                        },
                        '',
                        [],
                        getFeeForExecute(400_000),
                      );

                      if (result?.code) {
                        const error = this.extractError(result);
                        throw new Error(error);
                      }
                      console.log(result);
                      storeTxResultLocally(result);

                      this.props.notify('success', `Converted ${humanBalance} CSHBK to SEFI!`);
                    } catch (error) {
                      console.error('Error', error);
                      const txHash = error?.txHash;
                      this.props.notify(
                        'errorWithHash',
                        `Error Converting ${humanBalance} CSHBK to SEFI
                    }: ${error.message} ${txHash ? '\nTx Hash: ' + txHash : ''}`,
                        undefined,
                        txHash,
                      );
                      return;
                    } finally {
                      this.setState({
                        loadingSwap: false,
                      });
                      await this.props.refreshBalances({ tokens: [cashbackAddr, sefiAddr] });
                    }
                  }}
                >
                  Convert CSHBK to SEFI
                </Button>
              }
              position="top center"
            >
              <Popup.Content>
                Conversion is basically burning your CSHBK to get SEFI. <br />
                <br />
                The conversion rate is based on CSHBK's total supply and accumulated SEFI rewards.
              </Popup.Content>
            </Popup>
            <br />
            Cashback Rate:{' '}
            {(() => {
              if (this.state.cbRatio === undefined) {
                return (
                  <>
                    <span style={{ marginRight: '0.5em' }} />
                    <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" style={{ margin: 'auto' }} />
                  </>
                );
              } else {
                return `${this.state.cbRatio === Infinity ? '∞' : this.state.cbRatio}%`;
              }
            })()}
            {/* {await(
              (async () => {
                const ratio = await this.calcRatio(this.props.user, this.props.tokens, sefiAddr, cashbackAddr);
                if (ratio === undefined) {
                  return (
                    <>
                      <span style={{ marginRight: '0.5em' }} />
                      <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" style={{ margin: 'auto' }} />
                    </>
                  );
                }
                return ratio.toString();
              })(),
            )} */}
          </div>
        </Container>
      </div>
    );
  }
}
