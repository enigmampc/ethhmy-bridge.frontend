import * as React from 'react';
import { useEffect, useState } from 'react';
import { Box } from 'grommet';
import { observer } from 'mobx-react-lite';
import { useStores } from 'stores';
import { Button, Select, Text } from 'components/Base';
import { EXCHANGE_MODE, ITokenInfo } from 'stores/interfaces';

// todo: fix this up - proxy token
const selectTokenText = (mode: string, token: ITokenInfo) => {
  if (token.display_props.symbol === 'SEFI') {
    return `Secret Finance Token (SeFi)`;
  }
  if (mode === EXCHANGE_MODE.SCRT_TO_ETH && !token.display_props.proxy) {
    return `secret${token.display_props.symbol}`;
  } else if (mode !== EXCHANGE_MODE.SCRT_TO_ETH && !token.display_props.proxy) {
    return `${token.display_props.symbol}`;
  } else if (mode === EXCHANGE_MODE.SCRT_TO_ETH) {
    if (token.display_props.symbol === 'SIENNA') {
      return 'SIENNA';
    }
    return `secret${token.display_props.label}`;
  } else {
    return `${token.name}`;
  }
};

export const ERC20Select = observer((props: { onSelectToken?: Function; value: string }) => {
  const { userMetamask, exchange, tokens } = useStores();

  // useEffect(() => {}, [token]);

  const bridgeTokens = tokens.tokensUsageSync('BRIDGE');

  return (
    <Box direction="column">
      <Box direction="row" align="center" justify="between">
        <Text size="large" bold>
          {exchange.mode === EXCHANGE_MODE.SCRT_TO_ETH ? 'SecretToken' : 'Ethereum Asset'}
        </Text>
      </Box>

      <Box style={{ marginTop: 8 }}>
        <Select
          options={bridgeTokens
            .sort((a, b) =>
              /* SCRT first */
              a.display_props.symbol.toLowerCase().includes('scrt') ? -1 : 1,
            )
            .sort((a, b) =>
              /* SEFI first */
              a.display_props.symbol.toLowerCase().includes('sefi') ? -1 : 1,
            )
            .map(token => ({
              ...token,
              image: token.display_props.image,
              text: selectTokenText(exchange.mode, token),
              value: token.src_address,
            }))}
          value={props.value}
          onChange={async value => {
            props.onSelectToken(value);
          }}
          placeholder="Select your token"
        />
      </Box>
    </Box>
  );
});
