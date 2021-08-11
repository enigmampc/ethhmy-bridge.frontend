import * as React from 'react';
import { useState } from 'react';
import { withTheme } from 'styled-components';
import { Box, BoxProps, Text } from 'grommet';
import { useHistory } from 'react-router';
import { observer } from 'mobx-react-lite';
import { IStyledChildrenProps } from 'interfaces';
import { Title } from '../Base/components/Title';
import { useStores } from '../../stores';
import * as styles from './styles.styl';
import cn from 'classnames';
import { TOKEN } from '../../stores/interfaces';
import { Icon } from 'components/Base';

export const Head: React.FC<IStyledChildrenProps<BoxProps>> = withTheme(
  observer(({ theme, ...props }: IStyledChildrenProps<BoxProps>) => {
    const history = useHistory();
    const { routing, exchange } = useStores();
    const { palette, container } = theme;
    const { minWidth, maxWidth } = container;

    const [mobileMenu, setMobileMenu] = useState<boolean>(false);

    const isExplorer = history.location.pathname === '/explorer';
    const isSwap = history.location.pathname === '/swap';
    const isTokens = history.location.pathname === '/tokens';
    const isGetTokens = history.location.pathname === '/get-tokens';
    const isFaq = history.location.pathname === '/faq';
    const isInfo = history.location.pathname === '/info';
    const isEarn = history.location.pathname === '/earn';
    const isSeFi = history.location.pathname === '/sefi';

    const goToBridge = () => {
      routing.push(`/`);
    };

    return (
      <Box
        style={{
          background: palette.StandardWhite,
          // background: '#f6f7fb',
          overflow: 'visible',
          position: 'absolute',
          top: 0,
          width: '100%',
          zIndex: 100,
          minWidth,
          // boxShadow: '0px 0px 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        <Box className={styles.headerContainer} style={{ minWidth, maxWidth }}>
          <Box className={styles.mobileMenuButton} margin={{ right: 'large' }} onClick={() => setMobileMenu(true)}>
            <Icon glyph="Menu" size="medium" color={'rgb(33, 45, 94)'} />
          </Box>

          <Box direction="row" align="center">
            {/* <Box
              align="center"
              margin={{ right: 'small' }}
              onClick={goToBridge}
            >
              <MainLogo src="/static/scrt.svg" />
            </Box> */}
            <a href="/" style={{ textDecoration: 'none' }}>
              <Box>
                <Title size="medium" color="BlackTxt" bold>
                  𝕊ecret Finance
                </Title>
              </Box>
            </a>
          </Box>

          <Box className={cn(mobileMenu ? styles.mobileMenu : styles.menu)} gap="15px">
            <Box style={{ display: mobileMenu ? 'flex' : 'none' }} onClick={() => setMobileMenu(false)}>
              <Icon glyph="Close" size="medium" color={'rgb(33, 45, 94)'} />
            </Box>

            <Box
              className={cn(
                styles.itemToken,
                !isInfo && !isFaq && !isExplorer && !isGetTokens && !isTokens && !isSwap && !isEarn && !isSeFi
                  ? styles.selected
                  : '',
              )}
              onClick={goToBridge}
            >
              <Text>Bridge</Text>
            </Box>

            <Box
              className={cn(styles.itemToken, isTokens ? styles.selected : '')}
              onClick={() => {
                routing.push(`/tokens`);
              }}
            >
              <Text>Assets</Text>
            </Box>

            <Box
              className={cn(styles.itemToken, isExplorer ? styles.selected : '')}
              onClick={() => {
                routing.push(`/explorer`);
              }}
            >
              <Text>Transactions</Text>
            </Box>

            <Box className={cn(styles.itemToken, isEarn ? styles.selected : '')} onClick={() => routing.push('/earn')}>
              <Text>Earn</Text>
            </Box>

            {/*<Box*/}
            {/*  className={cn(styles.itemToken, isSeFi ? styles.selected : '')}*/}
            {/*  onClick={() => {*/}
            {/*    const url = `https://app.secretswap.io/sefi`;*/}
            {/*    const win = window.open(url, '_blank');*/}
            {/*    win.focus();*/}
            {/*  }}*/}
            {/*>*/}
            {/*  <Text>SeFi</Text>*/}
            {/*</Box>*/}

            <Box
              className={cn(styles.itemToken, isSwap ? styles.selected : '')}
              onClick={() => {
                const url = `https://app.secretswap.io/swap`;
                const win = window.open(url, '_blank');
                win.focus();
              }}
            >
              <Text>SecretSwap</Text>
            </Box>

            <Box className={cn(styles.itemToken, isFaq ? styles.selected : '')} onClick={() => routing.push('/faq')}>
              <Text>FAQ</Text>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }),
);
