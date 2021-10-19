import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from 'stores';
import { EXCHANGE_MODE } from 'stores/interfaces';
import { chainProps, chainPropToString } from '../../blockchain-bridge/eth/chainProps';
import { HealthStatusDetailed, NetworkTemplate, NetworkTemplateInterface } from './utils';
import { formatSymbol } from '../../utils';
import { BalanceInterface } from './steps/base';
import { components } from 'react-select';
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
    const { userSecret, userMetamask, exchange } = useStores();
    const { secret, onChange, balance, toSecretHealth, fromSecretHealth, value } = props;

    const [networks, setNetworks] = useState<NetworkTemplateInterface[]>([]);

    const slider = useRef();

    useEffect(() => {
      if (secret) {
        return;
      }
      const networks = [];
      const ids = [NETWORKS.ETH]; // , NETWORKS.BSC
      ids.forEach(id => {
        networks.push({
          value: id,
          id,
          name: chainPropToString(chainProps.full_name, id),
          wallet: chainPropToString(chainProps.wallet, id),
          symbol: formatSymbol(EXCHANGE_MODE.TO_SCRT, exchange.transaction.tokenSelected.symbol),
          token_id: balance.eth.maxAmount,
          image: exchange.transaction.tokenSelected.image,
          health: toSecretHealth,
          networkImage: chainPropToString(chainProps.image_logo, id),
        });
      });

      const external_ids = []; //NETWORKS.XMR
      external_ids.forEach(id => {
        networks.push({
          value: id,
          id,
          name: chainPropToString(chainProps.full_name, id),
          wallet: chainPropToString(chainProps.wallet, id),
          symbol: formatSymbol(EXCHANGE_MODE.TO_SCRT, exchange.transaction.tokenSelected.symbol),
          token_id: balance.eth.maxAmount,
          image: exchange.transaction.tokenSelected.image,
          networkImage: chainPropToString(chainProps.image_logo, id),
        });
      });

      setNetworks(networks);
    }, [secret, fromSecretHealth, exchange.transaction.tokenSelected, balance]);

    useEffect(() => {
      if (!slider || !slider.current) {
        return;
      }

      //@ts-ignore
      slider.current.slickGoTo(userMetamask.network === NETWORKS.ETH ? 0 : 1);
    }, [userMetamask.network]);

    const SecretTemplate: NetworkTemplateInterface = {
      name: 'Secret',
      wallet: '(Keplr)',
      symbol: formatSymbol(EXCHANGE_MODE.FROM_SCRT, exchange.transaction.tokenSelected.symbol),
      token_id: balance.scrt.maxAmount,
      image: `${exchange.transaction.tokenSelected.image.split('.')[0]}-scrt.png`,
      health: fromSecretHealth,
      networkImage: '/static/networks/secret-scrt-logo-dark.svg',
    };

    // just hard code Ethereum for now. No need for a selector

    const EthereumTemplate: NetworkTemplateInterface = {
      name: chainPropToString(chainProps.full_name, NETWORKS.ETH),
      wallet: chainPropToString(chainProps.wallet, NETWORKS.ETH),
      symbol: formatSymbol(EXCHANGE_MODE.TO_SCRT, exchange.transaction.tokenSelected.symbol),
      token_id: balance.eth.maxAmount,
      image: exchange.transaction.tokenSelected.image,
      health: toSecretHealth,
      networkImage: chainPropToString(chainProps.image_logo, NETWORKS.ETH),
    };

    if (secret) {
      return (
        <div style={{ padding: 10, minWidth: 300 }}>
          <NetworkTemplate template={SecretTemplate} user={userSecret} />
        </div>
      );
    }

    // const SingleValue = ({ children, ...props }) => {
    //   return <NetworkTemplate template={props.data} user={user} />;
    // };
    //
    // const Option = option => {
    //   return (
    //     <components.Option {...option} className={styles.selectOption}>
    //       <NetworkTemplate template={{ ...option.data, symbol: null }} user={user} />
    //     </components.Option>
    //   );
    // };
    //
    // const Control = ({ children, ...props }) => {
    //   return (
    //     <components.Control {...props} className={styles.selectContainer}>
    //       {children}
    //     </components.Control>
    //   );
    // };

    //const selectedOption = networks.find(n => n.id === value);
    return (
      <div style={{ padding: 10, minWidth: 300 }}>
        <NetworkTemplate template={EthereumTemplate} user={userSecret} />
      </div>
    );
    // return (
    //   <Select
    //     styles={{
    //       option: (base, state) => ({
    //         ...base,
    //         backgroundColor: state.isSelected ? '#0A1C34' : '#133665',
    //       }),
    //       container: base => ({
    //         ...base,
    //         minWidth: 350,
    //       }),
    //       control: (base, state) => ({
    //         ...base,
    //         boxShadow: 'none',
    //       }),
    //       valueContainer: (base, state) => ({
    //         ...base,
    //         paddingRight: 15,
    //       }),
    //       menuList: (base, state) => ({
    //         ...base,
    //         paddingBottom: 0,
    //         paddingTop: 0,
    //       }),
    //     }}
    //     components={{
    //       Option,
    //       SingleValue,
    //       Control,
    //     }}
    //     options={networks}
    //     value={selectedOption || networks[0]}
    //     isSearchable={false}
    //     onChange={v => {
    //       onChange(v);
    //     }}
    //   />
    // );
  },
);
