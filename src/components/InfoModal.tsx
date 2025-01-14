import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../stores';
import { useEffect } from 'react';
import { Info } from './Info';
import { useHistory } from 'react-router';

export const InfoModal = observer(() => {
  const { user, actionModals } = useStores();
  const history = useHistory();

  useEffect(() => {
    if (!user.isInfoReading) {
      actionModals.open(
        () => <Info title="No more bridge for you" />,
        {
          title: '',
          applyText: 'Got it',
          closeText: '',
          noValidation: true,
          showOther: true,
          onApply: () => {
            user.setInfoReading();
            return Promise.resolve();
          },
        },
      );
    }
  }, [user.isInfoReading]);

  return <></>;
});
