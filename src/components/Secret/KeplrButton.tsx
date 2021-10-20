import React from 'react';
import { Button } from 'semantic-ui-react';
import { AuthWarning } from '../AuthWarning';
import { useStores } from '../../stores';
import { observer } from 'mobx-react';
import { Text } from 'components/Base';
import { truncateAddressString } from '../../utils';
import { CopyToClipboard } from 'react-copy-to-clipboard';

export const KeplrButton = observer((props: { disabled?: boolean; loading?: boolean; onClick?: any }) => {
  const { actionModals, userSecret } = useStores();
  return (
    <Button
      circular
      onClick={() => {
        if (!userSecret.isKeplrWallet) {
          actionModals.open(() => <AuthWarning />, {
            title: '',
            applyText: 'Got it',
            closeText: '',
            noValidation: true,
            width: '500px',
            showOther: true,
            onApply: () => Promise.resolve(),
          });
        } else if (!userSecret.secretjs) {
          userSecret.signIn();
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img src="/static/scrt.svg" style={{ height: '24px' }} alt={'scrt'} />
        <span style={{ margin: '0 0.3em' }}>
          {userSecret.secretjs ? (
            <CopyToClipboard text={userSecret.address}>
              <div>
                <SecretAddress address={userSecret.address} />
              </div>
            </CopyToClipboard>
          ) : (
            <LoginText />
          )}
        </span>
      </div>
    </Button>
  );
});

const SecretAddress = (props: { address: string }) => {
  return (
    <Text
      size="small"
      style={{
        fontFamily: 'monospace',
      }}
    >
      {truncateAddressString(props.address)}
    </Text>
  );
};

const LoginText = () => {
  return <Text>Login or install Keplr</Text>;
};
//<div
//           style={{ position: 'absolute', right: '10%', cursor: 'pointer' }}
//           onClick={() => {
//             if (this.props.user.secretjs) {
//               return;
//             }
//
//             this.props.user.signIn(true);
//           }}
//         >
//           <Popup
//             header={
//               <div style={{ display: 'flex', alignItems: 'center' }}>
//                 <strong>{this.props.user.address}</strong>
//                 <span style={{ marginLeft: '0.3em' }}>
//                   <CopyWithFeedback text={this.props.user.address} />
//                 </span>
//               </div>
//             }
//             content={<WalletOverview tokens={this.state.allTokens} balances={this.state.balances} />}
//             position="bottom left"
//             basic
//             on="click"
//             trigger={
//               <Button basic style={{ padding: 0, borderRadius: '10px' }}>
//                 <div style={{ display: 'flex', alignItems: 'center' }}>
//                   <Image src="/keplr.svg" size="mini" />
//                   <span style={{ margin: '0 0.3em' }}>{this.props.user.address}</span>
//                 </div>
//               </Button>
//             }
//           />
//         </div>
