import * as React from 'react';
import { useEffect, useState, useRef } from 'react';

import { Box } from 'grommet';
import { observer } from 'mobx-react-lite';
import { useStores } from 'stores';
import { Button, Text } from 'components/Base';
import { EXCHANGE_MODE, ITokenInfo } from 'stores/interfaces';
import { chainProps, chainPropToString } from '../../blockchain-bridge/eth/chainProps';
import { NetworkTemplateInterface, NetworkTemplate, HealthStatusDetailed } from './utils';
import { formatSymbol } from '../../utils';
import { BalanceInterface } from './steps/base';
import Select, { components } from 'react-select';
import * as styles from './styles.styl';
import { NETWORKS } from '../../blockchain-bridge';

export const NetworkSelect = observer(
  (props: {
    secret: boolean;
    value: NETWORKS;
    onChange: Function;
    balance: BalanceInterface;
    toSecretHealth: HealthStatusDetailed;
    fromSecretHealth: HealthStatusDetailed;
  }) => {
    const { user, userMetamask, exchange } = useStores();
    const { secret, onChange, balance, toSecretHealth, fromSecretHealth, value } = props;

    const [networks, setNetworks] = useState<NetworkTemplateInterface[]>([]);

    const slider = useRef();

    useEffect(() => {
      if (secret) return;
      const networks = [];
      const ids = [NETWORKS.ETH, NETWORKS.BSC];
      ids.forEach(id => {
        networks.push({
          value: id,
          id,
          name: chainPropToString(chainProps.full_name, id),
          wallet: 'Metamask',
          symbol: formatSymbol(EXCHANGE_MODE.TO_SCRT, exchange.transaction.tokenSelected.symbol),
          amount: balance.eth.maxAmount,
          image: exchange.transaction.tokenSelected.image,
          health: toSecretHealth,
          networkImage: chainPropToString(chainProps.image_logo, id),
        });
      });

      setNetworks(networks);
    }, [secret, fromSecretHealth, exchange.transaction.tokenSelected, balance]);

    useEffect(() => {
      if (!slider || !slider.current) return;

      //@ts-ignore
      slider.current.slickGoTo(userMetamask.network === NETWORKS.ETH ? 0 : 1);
    }, [userMetamask.network]);

    const SecretTemplate: NetworkTemplateInterface = {
      name: 'Secret Network',
      wallet: 'Keplr',
      symbol: formatSymbol(EXCHANGE_MODE.FROM_SCRT, exchange.transaction.tokenSelected.symbol),
      amount: balance.scrt.maxAmount,
      image: exchange.transaction.tokenSelected.image,
      health: fromSecretHealth,
      networkImage: '/static/networks/secret-scrt-logo-dark.svg',
    };

    if (secret)
      return (
        <div style={{ padding: 10, minWidth: 300 }}>
          <NetworkTemplate template={SecretTemplate} user={user} />
        </div>
      );

    const SingleValue = ({ children, ...props }) => {
      return <NetworkTemplate template={props.data} user={user} />;
    };

    const Option = option => {
      return (
        <components.Option {...option} className={styles.selectOption}>
          <NetworkTemplate template={{ ...option.data, symbol: null }} user={user} />
        </components.Option>
      );
    };

    const Control = ({ children, ...props }) => {
      return (
        <components.Control {...props} className={styles.selectContainer}>
          {children}
        </components.Control>
      );
    };

    const selectedOption = networks.find(n => n.id === value);
    return (
      <Select
        styles={{
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#e0e0e0' : 'none',
          }),
          container: base => ({
            ...base,
            minWidth: 350,
          }),
          control: (base, state) => ({
            ...base,
            boxShadow: 'none',
          }),
          valueContainer: (base, state) => ({
            ...base,
            paddingRight: 15,
          }),
          menuList: (base, state) => ({
            ...base,
            paddingBottom: 0,
            paddingTop: 0,
          }),
        }}
        components={{
          Option,
          SingleValue,
          Control,
        }}
        options={networks}
        value={selectedOption || networks[0]}
        isSearchable={false}
        onChange={v => {
          onChange(v);
        }}
      />
    );
  },
);
