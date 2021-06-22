import * as React from 'react';
import { useEffect, useState } from 'react';
import { Box } from 'grommet';
import { observer } from 'mobx-react-lite';
import { useStores } from 'stores';
import { Select, Text } from 'components/Base';
import { EXCHANGE_MODE, ITokenInfo } from 'stores/interfaces';
import { networkFromToken } from '../../blockchain-bridge';

// todo: fix this up - proxy token
const selectTokenText = (mode: string, token: ITokenInfo) => {
  if (token.display_props.symbol === 'SEFI') {
    return `SEFI`;
  }
  if (mode === EXCHANGE_MODE.FROM_SCRT && !token.display_props.proxy) {
    return `secret${token.display_props.symbol}`;
  } else if (mode !== EXCHANGE_MODE.FROM_SCRT && !token.display_props.proxy) {
    return `${token.display_props.symbol}`;
  } else if (mode === EXCHANGE_MODE.FROM_SCRT) {
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
  const [erc20, setERC20] = useState(userMetamask.erc20Address);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [snip20, setSnip20] = useState('');
  const [custom, setCustom] = useState(false);
  const [filteredTokens, setFilteredTokens] = useState<ITokenInfo[]>([]);

  // useEffect(() => {}, [token]);

  //const bridgeTokens = tokens.tokensUsageSync('BRIDGE');

  useEffect(() => {
    const bridgeTokens = tokens.tokensUsageSync('BRIDGE');
    if (bridgeTokens?.length) {
      setFilteredTokens(
        bridgeTokens.filter(value => {
          return networkFromToken(value) === userMetamask.network;
        }),
      );
    }
  }, [tokens.allData, userMetamask.network]);

  return (
    <Box direction="column">
      <Box direction="row" align="center" justify="between">
        <Text size="large" bold>
          {/*{exchange.mode === EXCHANGE_MODE.FROM_SCRT ? 'SecretToken' : 'Ethereum Asset'}*/}
          Token
        </Text>
      </Box>

      <Box style={{ marginTop: 8 }}>
        <Select
          options={filteredTokens
            .slice()
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
