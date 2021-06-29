import * as React from 'react';
import { useEffect, useState } from 'react';
import * as styles from '../styles.styl';
import { formatSymbol } from '../../../utils';

import { observer } from 'mobx-react';
import { Icon, Text } from 'components/Base';
import { Box } from 'grommet';

import { EXCHANGE_STEPS } from '../../../stores/Exchange';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';
import { useStores } from '../../../stores';
import { EXCHANGE_MODE } from 'stores/interfaces';
import Fade from 'react-reveal/Fade';

export const OperationsPanel = observer(() => {
  const { exchange } = useStores();
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    exchange.operations = exchange.getLocalstorageOperations() || []
  }, []);

  if (!exchange.operations || exchange.operations.length <= 0) {
    return null
  }

  return (
    <Box className={styles.operationsPanel} direction="column">
      <Box>
        <Fade left>
          <Box className={styles.operationsHeader} direction="row" style={{ position: 'relative' }} onClick={() => { setOpen(!open) }}>
            <Box className={styles.operationsImage}>
              <img src="/static/operations.svg" />
            </Box>
            <Box margin={{ left: 'large' }} >
              <Text size="medium" bold>Transactions Panel</Text>
            </Box>
          </Box>
        </Fade>
      </Box>


      {open && <Fade duration={300} bottom>
        <Box direction="column" className={styles.operationsContainer}>
          {exchange.operations.slice().reverse().map((operation, index) => {

            return <Box key={index} direction="row" justify="between" fill align="center"
              onClick={() => {
                exchange.setOperationId(operation.id);
                //routing.push(`/operations/${operation.id}`)
                exchange.stepNumber = EXCHANGE_STEPS.CHECK_TRANSACTION
              }}>
              <Box direction="row" align="center">
                <img src={operation.tokenImage} width={20} />
                <Box margin={{ left: 'xxsmall' }} >
                  <Text bold size="small" style={{ width: 60, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {operation.amount}</Text>
                </Box>
              </Box>
              <Box align="center" direction="row" margin={{ right: 'xmsmall' }}>
                <Box margin={{ right: 'xxsmall' }}>
                  <Text style={{ maxWidth: 51, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} bold size="xsmall" color="#4b4b4b">{formatSymbol(
                    operation.mode === EXCHANGE_MODE.TO_SCRT ? EXCHANGE_MODE.TO_SCRT : EXCHANGE_MODE.FROM_SCRT,
                    operation.fromToken,
                  )}
                  </Text>
                </Box>
                <Icon size="10" glyph="Right" />
                <Box margin={{ left: 'xxsmall' }}>
                  <Text style={{ maxWidth: 60, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} bold size="xsmall" color="#4b4b4b">
                    {formatSymbol(
                      operation.mode === EXCHANGE_MODE.TO_SCRT ? EXCHANGE_MODE.FROM_SCRT : EXCHANGE_MODE.TO_SCRT,
                      operation.toToken,
                    )}
                  </Text>
                </Box>

                <Box justify="center" align="center" margin={{ left: 'small' }} onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  exchange.removeLocalstorageOperation(operation.id)
                }}>
                  <Icon size="10" glyph="Close" />
                </Box>
              </Box>

            </Box>
          })}
        </Box>
      </Fade>}

    </Box>


  );
});
