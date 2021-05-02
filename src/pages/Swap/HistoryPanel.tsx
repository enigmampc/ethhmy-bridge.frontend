import BigNumber from 'bignumber.js';
import React from 'react';
import { SigningCosmWasmClient } from 'secretjs';
import { Accordion, Button, Container, Divider, Header, Image } from 'semantic-ui-react';
import { CSSProperties } from 'styled-components';
import { displayHumanizedBalance, humanizeBalance } from 'utils';
import { FlexRowSpace } from '../../components/Swap/FlexRowSpace';
import { SwapTokenMap } from './types/SwapToken';
import { SwapPair } from './types/SwapPair';
import Loader from 'react-loader-spinner';
import { UserStoreEx } from 'stores/UserStore';
import { User } from 'components/Base/components/Icons/tsx_svg_icons';

interface HistoryTx {
  id: number;
  from: string;
  sender: string;
  receiver: string;
  coins: { denom: string; amount: string };
}

interface TransferHistory {
  transfer_history: {
    txs: HistoryTx[];
  };
}

export class HistoryPanel extends React.Component<
  {
    lpTokenSymbol: string;
    tokens: SwapTokenMap;
    balances: { [symbol: string]: BigNumber | JSX.Element };
    user: UserStoreEx;
    secretjs: SigningCosmWasmClient;
    selectedPair: SwapPair;
    notify: (type: 'success' | 'error', msg: string, closesAfterMs?: number) => void;
    getBalance: CallableFunction;
    onCloseTab: CallableFunction;
  },
  {
    isLoading: boolean;
    withdrawPercentage: number;
    isActive: boolean;
    isLoadingBalance: boolean;
  }
> {
  state = {
    isLoading: false,
    withdrawPercentage: 0,
    isActive: false,
    isLoadingBalance: false,
  };

  getSwapsHistoryForToken = async (token: string, pair: SwapPair): Promise<HistoryTx[]> => {
    const viewingKey = this.props.user.keplrWallet.getSecret20ViewingKey(this.props.user.chainId, token);

    const history: TransferHistory = await this.props.secretjs.queryContractSmart(token, {
      transfer_history: {
        key: viewingKey,
        address: this.props.user.address,
        page: 0,
        page_size: 1000,
      },
    });

    return history.transfer_history.txs
      .filter(tx => [tx.from, tx.receiver, tx.sender].includes(pair.contract_addr))
      .sort((a, b) => a.id - b.id);
  };

  render() {
    let [symbolA, symbolB] = [
      this.props.selectedPair.asset_infos[0].symbol,
      this.props.selectedPair.asset_infos[1].symbol,
    ];

    let selectedPair = this.props.selectedPair;
    if (symbolB === 'sSCRT') {
      selectedPair = new SwapPair(
        symbolB,
        selectedPair.asset_infos[1].info,
        symbolA,
        selectedPair.asset_infos[0].info,
        selectedPair.contract_addr,
        selectedPair.liquidity_token,
        selectedPair.pair_identifier,
      );

      symbolB = symbolA;
      symbolA = 'sSCRT';
    }
    if (selectedPair.pair_identifier.includes(process.env.SSCRT_CONTRACT)) {
      const tokenB = selectedPair.pair_identifier.split('/').filter(a => a !== process.env.SSCRT_CONTRACT);
      selectedPair.pair_identifier = `${process.env.SSCRT_CONTRACT}/${tokenB}`;
    }

    const [tokenA, tokenB] = selectedPair.assetIds();

    const decimalsA = this.props.tokens.get(tokenA)?.decimals;
    const decimalsB = this.props.tokens.get(tokenB)?.decimals;

    const balanceANumber = new BigNumber(this.props.balances[tokenA] as any);
    let balanceA: string | JSX.Element;
    if (balanceANumber.isNaN()) {
      balanceA = this.props.balances[tokenA] as JSX.Element;
    } else {
      balanceA = displayHumanizedBalance(humanizeBalance(balanceANumber, decimalsA));
    }

    const balanceBNumber = new BigNumber(this.props.balances[tokenB] as any);
    let balanceB: string | JSX.Element;
    if (balanceBNumber.isNaN()) {
      balanceB = this.props.balances[tokenB] as JSX.Element;
    } else {
      balanceB = displayHumanizedBalance(humanizeBalance(balanceBNumber, decimalsB));
    }

    const getLogo = (address: string) => (
      <Image
        src={this.props.tokens.get(address)?.logo}
        avatar
        style={{
          boxShadow: 'rgba(0, 0, 0, 0.075) 0px 6px 10px',
          borderRadius: '24px',
          maxHeight: '24px',
          maxWidth: '24px',
        }}
      />
    );

    const rowStyle: CSSProperties = {
      display: 'flex',
      padding: '0.5em 0 0 0',
    };

    return (
      <Container
        style={{
          padding: '1rem',
          borderRadius: '20px',
          border: '1px solid rgb(247, 248, 250)',
          backgroundColor: 'white',
        }}
      >
        <Accordion fluid>
          <Accordion.Title
            active={this.state.isActive}
            onClick={async () =>
              this.setState({ isActive: !this.state.isActive }, async () => {
                if (this.state.isActive) {
                  this.setState({ isLoadingBalance: true });
                  // get balances and subscribe for events for this pair
                  await this.props.getBalance(selectedPair);

                  if (this.props.balances[tokenA] instanceof BigNumber) {
                    const history = await this.getSwapsHistoryForToken(tokenA, selectedPair);
                    //console.log(history);
                  }
                  if (this.props.balances[tokenB] instanceof BigNumber) {
                    //console.log('here');
                  }

                  this.setState({ isLoadingBalance: false });
                } else {
                  // unsubscribe
                  this.props.onCloseTab(selectedPair);
                }
              })
            }
          >
            <div
              style={{
                display: 'flex',
              }}
            >
              {getLogo(tokenA)}
              {getLogo(tokenB)}
              <strong
                style={{
                  margin: 'auto',
                }}
              >
                {selectedPair.humanizedSymbol()}
              </strong>
              <FlexRowSpace />
            </div>
          </Accordion.Title>
          <Accordion.Content active={this.state.isActive}>
            {this.state.isLoadingBalance ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Loader type="ThreeDots" color="#00BFFF" height="0.5em" />
              </div>
            ) : null}
            <div hidden={this.state.isLoadingBalance}>
              <div style={rowStyle}>
                <span style={{ margin: 'auto' }}>{symbolA}</span>
                <FlexRowSpace />
                <span style={{ margin: 'auto', paddingRight: '0.3em' }}>{balanceA}</span>
                {getLogo(tokenA)}
              </div>
              <div style={rowStyle}>
                <span style={{ margin: 'auto' }}>{symbolB}</span>
                <FlexRowSpace />
                <span style={{ margin: 'auto', paddingRight: '0.3em' }}>{balanceB}</span>
                {getLogo(tokenB)}
              </div>
              <Divider horizontal>
                <Header as="h4">Swaps</Header>
              </Divider>
            </div>
          </Accordion.Content>
        </Accordion>
      </Container>
    );
  }
}
