import React from 'react';
import { Message } from 'semantic-ui-react';
import { TOKEN_USAGE } from '../../../stores/interfaces';

const EarnInfoBox = ({ type }: { type: TOKEN_USAGE }) => {
  if (type === 'LPSTAKING') {
    return (
      <Message info>
        <Message.Header>$SEFI Staking</Message.Header>
        <p>$SEFI is the governance token of the Secret DeFi ecosystem.</p>
        <p>
          <li>Stake your Secret Swap LP tokens to earn more $SEFI.</li>
          <li>Stake your $SEFI tokens to earn more $SEFI.</li>
        </p>
        <p>
          Read more about $SEFI in its{' '}
          <a href="https://scrt.network/blog/sefi-governance-token-for-secret-defi" target="_blank">
            introductory blog post
          </a>
          .
        </p>
      </Message>
    );
  } else {
    return (
      <Message info>
        <Message.Header>Bridge Mining</Message.Header>
        <p>Some description of what bridge mining is</p>
      </Message>
    );
  }
};

export default EarnInfoBox;
