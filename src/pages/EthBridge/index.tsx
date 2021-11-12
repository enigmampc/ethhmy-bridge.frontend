import * as React from 'react';
import { useEffect } from 'react';
import { Box } from 'grommet';
import { BaseContainer, PageContainer } from 'components';
import { observer } from 'mobx-react-lite';
import { useStores } from 'stores';
import * as styles from './styles.styl';
import { Exchange } from '../Exchange';
import { Title } from 'components/Base';
import { WalletBalances } from './WalletBalances';
import { EXCHANGE_STEPS } from 'stores/Exchange';
import { Message } from 'semantic-ui-react';

export const EthBridge = observer((props: any) => {
  const { exchange, rewards, signerHealth, tokens } = useStores();
  //userMetamask
  //const [network, setNetwork] = useState<NETWORKS>(NETWORKS.ETH);

  useEffect(() => {
    rewards.init({
      isLocal: true,
      sorter: 'none',
      pollingInterval: 20000,
    });
    rewards.fetch();

    tokens.init(); //TODO

    signerHealth.init({});
    signerHealth.fetch();

    // if (props.match.params.token) {
    //   if ([TOKEN.NATIVE, TOKEN.ERC20].includes(props.match.params.token)) {
    //     exchange.setToken(props.match.params.token);
    //   }
    // }

    if (props.match.params.operationId) {
      exchange.setOperationId(props.match.params.operationId);
    }
  }, []);

  useEffect(() => {
    if (exchange.step === EXCHANGE_STEPS.CHECK_TRANSACTION && exchange.operation)
      exchange.fetchStatus(exchange.operation.id);
  }, [exchange.step]);

  // useEffect(() => {
  //   if (userMetamask.network) {
  //     exchange.setNetwork(userMetamask.network);
  //     exchange.setMainnet(userMetamask.mainnet);
  //     setNetwork(userMetamask.network);
  //   }
  // }, [userMetamask.network, userMetamask.mainnet, exchange]);

  return (
    <BaseContainer>
      <PageContainer>
        <Box direction="row" wrap={true} fill justify="between" align="start">
          <Box fill direction="column" align="center" justify="center" className={styles.base}>
            <Message info>
              <Message.Header>
                Bridge has been disabled for the Supernova upgrade. See you all on the other side!
              </Message.Header>
              <Message.Content>
                Maintenance has been extended to ensure compatibility with Supernova and to add support for EIP-1559. We
                hope to be back up by Nov 14th. Thank you for your patience
              </Message.Content>
              {/* <Message.Content>
                We are excited to announce the launch of the Secret Monero Bridge on mainnet! Read more about it{' '}
                <a
                  href="https://scrt.network/blog/secret-monero-bridge-is-live-on-mainnet"
                  style={{ textDecoration: 'underline' }}
                  target="_blank"
                  rel="noreferrer"
                >
                  here
                </a>
              </Message.Content> */}
            </Message>
            {/*<Message info>*/}
            {/*  <Message.Header>ETH bridge maintenance has been completed, and bridge is back up!</Message.Header>*/}
            {/*</Message>*/}
            {/*<Message info>*/}
            {/*  <Message.Header>Warning</Message.Header>*/}
            {/*  <Message.Content>*/}
            {/*    <p>*/}
            {/*      {*/}
            {/*        'There are ongoing issues when bridging SCRT->ETH. We are working on restoring service. Thank you for your patience'*/}
            {/*      }*/}
            {/*    </p>*/}

            {/*    /!*    <p>Binance-pegged assets from Binance Smart Chain are different than assets coming from Ethereum.</p>*!/*/}
            {/*    /!*    <p>You will not be able to directly withdraw BSC assets to Ethereum, or vice-versa</p>*!/*/}
            {/*    /!*    <p>Assets can be converted using SecretSwap</p>*!/*/}
            {/*  </Message.Content>*/}
            {/*  /!*  <p></p>*!/*/}
            {/*  /!*  /!*<Message.Header>Known Issues</Message.Header>*!/*!/*/}
            {/*  /!*  /!*<Message.Content>*!/*!/*/}
            {/*  /!*  /!*  <p>*!/*!/*/}
            {/*  /!*  /!*    Some users may experience issues with viewing keys when using Chromium v91 browsers (Chrome, Brave,*!/*!/*/}
            {/*  /!*  /!*    Edge) - make sure extension site access is set to "On all sites"*!/*!/*/}
            {/*  /!*  /!*  </p>*!/*!/*/}
            {/*  /!*  /!*</Message.Content>*!/*!/*/}
            {/*</Message>*/}
            {/*<Message success>*/}
            {/*  <p>No current issues </p>*/}
            {/*</Message>*/}
            <Box className={styles.headerBridge} fill margin={{ bottom: 'medium', top: 'large' }}>
              <Title bold>Secret Bridge</Title>
              <WalletBalances />
            </Box>
            <Exchange />
          </Box>
        </Box>
      </PageContainer>
    </BaseContainer>
  );
});
