import React from 'react';
import { List, Popup } from 'semantic-ui-react';
import { HealthStatusDetailed, signerToString, SignerTypes } from './utils';

function timeDifference(current, previous) {
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  const elapsed = current - previous;

  if (elapsed < msPerMinute) {
    return Math.round(elapsed / 1000) + ' seconds ago';
  } else if (elapsed < msPerHour) {
    return Math.round(elapsed / msPerMinute) + ' minutes ago';
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + ' hours ago';
  } else if (elapsed < msPerMonth) {
    return Math.round(elapsed / msPerDay) + ' days ago';
  } else if (elapsed < msPerYear) {
    return Math.round(elapsed / msPerMonth) + ' months ago';
  } else {
    return Math.round(elapsed / msPerYear) + ' years ago';
  }
}

const HealthDetails = (props: { health: HealthStatusDetailed }) => {
  let x = [];

  SignerTypes.forEach(signer => {
    x.push(
      <List.Item key={signer}>
        <List.Icon name="circle" color={props.health[signer]?.status ? 'green' : 'red'} />
        <List.Content>
          <List.Header as="a">{signerToString(signer)}</List.Header>
          {props.health[signer]?.time ? (
            <List.Description as="a">Updated {timeDifference(Date.now(), props.health[signer].time)}</List.Description>
          ) : null}
        </List.Content>
      </List.Item>,
    );
  });

  return (
    <List divided relaxed>
      {x}
    </List>
  );
};

const HealthPopup = props => {
  if (!props.health) {
    return <></>;
  }
  return <div>{props.children}</div>;
  // disabling for now
  //return <Popup content={HealthDetails(props)} trigger={props.children}></Popup>;
};

export default HealthPopup;
