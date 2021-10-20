import { Box, BoxProps } from 'grommet';
import * as styles from './styles.styl';
import { Text } from 'components/Base/components/Text';
import * as React from 'react';
import { TOKEN } from 'stores/interfaces';
import { observer } from 'mobx-react';
import { useStores } from '../../stores';
import { formatWithSixDecimals } from '../../utils';
import { networkFromToken, NETWORKS } from '../../blockchain-bridge';

// export const OperationType = (props: { type: EXCHANGE_MODE }) => {
//   return (
//     <Box
//       direction={props.type === EXCHANGE_MODE.TO_SCRT ? 'row' : 'row-reverse'}
//       align="center"
//       className={cn(styles.operationType)}
//       margin={{ left: '20px' }}
//     >
//       <Box direction="row" align="center">
//         <img className={styles.imgToken} style={{ height: 20 }} src="/static/eth.svg" />
//         <Text size="medium">ETH</Text>
//       </Box>
//       <Box direction="row" margin={{ horizontal: 'xsmall' }} align="center">
//         <img src="/static/right.svg" />
//       </Box>
//       <Box direction="row" align="center">
//         <img className={styles.imgToken} style={{ height: 18 }} src="/static/scrt.svg" />
//         <Text size="medium">ONE</Text>
//       </Box>
//     </Box>
//   );
// };

export const Price = observer(
  (props: { value: number | string; valueUsd?: number; isEth?: boolean; boxProps?: BoxProps; token?: string }) => {
    const { userSecret, userMetamask } = useStores();

    const tokenName = props.token || (props.isEth ? userMetamask.getCurrencySymbol() : 'SCRT');
    const valueUsd = props.valueUsd
      ? props.valueUsd
      : Number(props.value) * (props.isEth ? userMetamask.getNetworkPrice() : userSecret.scrtRate);
    return (
      <Box direction="column" align="end" justify="center" pad={{ right: 'medium' }} {...props.boxProps}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 3 }}>{`${props.value} ${tokenName}`}</Text>
        <Text size="xsmall" color="rgba(102, 102, 102, 0.9)">
          ${formatWithSixDecimals(valueUsd)}
        </Text>
      </Box>
    );
  },
);

interface IERC20TokenProps {
  network: NETWORKS;
  value: TOKEN;
  erc20Address?: string;
}

interface ISecretTokenProps {
  value: TOKEN;
  secretAddress?: string;
}

interface ITokenParams {
  type: TOKEN;
  amount: string | number;
  address?: string;
}

export const FormatWithDecimals = observer((props: ITokenParams) => {
  const { tokens, userMetamask } = useStores();
  const { type, amount, address } = props;

  if (type === TOKEN.ERC721 || type === TOKEN.S20) {
    const token = tokens.allData.find(t => t.address.toLowerCase() === address.toLowerCase());

    if (token) {
      return (
        <Box>
          {token.address}-{amount}
        </Box>
      );
    }
  }
  return <Box>{amount}</Box>;
});

export const ERC20Token = observer((props: IERC20TokenProps) => {
  const { tokens } = useStores();
  const { value, erc20Address } = props;

  let tokenName = '';
  let tokenImage = '';

  if (value === TOKEN.ERC721) {
    const token = tokens.allData.find(
      t => t.address.toLowerCase() === erc20Address.toLowerCase() && networkFromToken(token) === props.network,
    );

    if (token && token.display_props) {
      token.display_props.proxy_symbol
        ? (tokenName = token.display_props.proxy_symbol)
        : (tokenName = token.display_props.symbol);
      tokenImage = token.display_props.image;
    }
  }

  return (
    <Box direction="row" justify="start" align="center" style={{ marginTop: 4 }}>
      <img className={styles.imgToken} src={tokenImage} />
      {tokenName}
    </Box>
  );
});

export const SecretToken = observer((props: ISecretTokenProps) => {
  const { tokens, userMetamask } = useStores();
  const { value, secretAddress } = props;

  let tokenName = '';
  let tokenImage = '';
  if (value === TOKEN.ERC721 || value === TOKEN.S20) {
    const token = tokens.allData.find(
      t =>
        t.address?.toLowerCase() === secretAddress.toLowerCase() ||
        t.name?.toLowerCase() === secretAddress.toLowerCase(),
    );

    if (token && token.display_props) {
      tokenName = token.symbol;
      tokenImage = `${token.display_props.image.split('.')[0]}-scrt.png`;
    }
  }

  return (
    <Box direction="row" justify="start" align="center" style={{ marginTop: 4 }}>
      <img className={styles.imgToken} src={tokenImage} />
      {tokenName}
    </Box>
  );
});
