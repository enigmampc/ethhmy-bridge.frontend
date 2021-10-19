import * as React from 'react';
import { Box } from 'grommet';
import { observer } from 'mobx-react';
import { EXCHANGE_STEPS } from '../../stores/Exchange';
import { Base } from './steps/base';
import { OperationsPanel } from './steps/operationsPanel';
import { ERC721ApprovalModal } from './steps/erc20approval';
import { SwapConfirmation } from './steps/swapConfirmation';
import { CheckTransaction } from './steps/checkTransaction';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';
import { useStores } from '../../stores';

export const Exchange = observer(() => {
  const { exchange, userMetamask } = useStores();

  React.useEffect(() => {
    if (exchange) {
      exchange.setNetwork(userMetamask.network);
      exchange.setMainnet(userMetamask.mainnet);
    }
  }, [userMetamask.network, userMetamask.mainnet]);

  return (
    <Box fill direction="column" style={{ position: 'relative' }}>
      <Base />
      {exchange.step.id === EXCHANGE_STEPS.APPROVE_CONFIRMATION && <ERC721ApprovalModal />}
      {exchange.step.id === EXCHANGE_STEPS.CONFIRMATION && <SwapConfirmation />}
      {exchange.step.id === EXCHANGE_STEPS.CHECK_TRANSACTION && <CheckTransaction />}
      <div style={{zIndex: 2}}>
        <OperationsPanel />
      </div>
    </Box>
  );
});
