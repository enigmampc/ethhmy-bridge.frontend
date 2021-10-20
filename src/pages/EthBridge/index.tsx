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
  const { exchange, signerHealth, tokens } = useStores();
  //userMetamask
  //const [network, setNetwork] = useState<NETWORKS>(NETWORKS.ETH);

  useEffect(() => {
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
            {/*<Message success>*/}
            {/*  <Message.Header>The bridge to Monero is now live!</Message.Header>*/}
            {/*  <Message.Content>*/}
            {/*    We are excited to announce the launch of the Secret Monero Bridge on mainnet! Read more about it{' '}*/}
            {/*    <a*/}
            {/*      href="https://scrt.network/blog/secret-monero-bridge-is-live-on-mainnet"*/}
            {/*      style={{ textDecoration: 'underline' }}*/}
            {/*      target="_blank"*/}
            {/*      rel="noreferrer"*/}
            {/*    >*/}
            {/*      here*/}
            {/*    </a>*/}
            {/*    /!*To get support, report bugs or suggestions you can use{' '}*!/*/}
            {/*    /!*<a*!/*/}
            {/*    /!*  href="https://discord.gg/7t7PqPZFJq"*!/*/}
            {/*    /!*  style={{ textDecoration: 'underline' }}*!/*/}
            {/*    /!*  target="_blank"*!/*/}
            {/*    /!*  rel="noreferrer"*!/*/}
            {/*    /!*>*!/*/}
            {/*    /!*  Discord*!/*/}
            {/*    /!*</a>{' '}*!/*/}
            {/*    /!*or{' '}*!/*/}
            {/*    /!*<a*!/*/}
            {/*    /!*  href="https://t.me/SCRTCommunity"*!/*/}
            {/*    /!*  style={{ textDecoration: 'underline' }}*!/*/}
            {/*    /!*  target="_blank"*!/*/}
            {/*    /!*  rel="noreferrer"*!/*/}
            {/*    /!*>*!/*/}
            {/*    /!*  Telegram*!/*/}
            {/*    /!*</a>*!/*/}
            {/*  </Message.Content>*/}
            {/*</Message>*/}
            {/*<Message info>*/}
            {/*  <Message.Header>Warning</Message.Header>*/}
            {/*  <Message.Content>*/}
            {/*    <p>Binance-pegged assets from Binance Smart Chain are different than assets coming from Ethereum.</p>*/}
            {/*    <p>You will not be able to directly withdraw BSC assets to Ethereum, or vice-versa</p>*/}
            {/*    <p>Assets can be converted using SecretSwap</p>*/}
            {/*  </Message.Content>*/}
            {/*  <p></p>*/}
            {/*  /!*<Message.Header>Known Issues</Message.Header>*!/*/}
            {/*  /!*<Message.Content>*!/*/}
            {/*  /!*  <p>*!/*/}
            {/*  /!*    Some users may experience issues with viewing keys when using Chromium v91 browsers (Chrome, Brave,*!/*/}
            {/*  /!*    Edge) - make sure extension site access is set to "On all sites"*!/*/}
            {/*  /!*  </p>*!/*/}
            {/*  /!*</Message.Content>*!/*/}
            {/*</Message>*/}
            {/*<Message success>*/}
            {/*  <p>No current issues </p>*/}
            {/*</Message>*/}
            <Box className={styles.headerBridge} fill margin={{ bottom: 'medium', top: 'large' }}>
              <Title bold color="#BAD2F2">
                {' '}
              </Title>
              <WalletBalances />
            </Box>
            <Exchange />
          </Box>
        </Box>
      </PageContainer>
    </BaseContainer>
  );
});
