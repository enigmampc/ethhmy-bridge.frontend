import { SwapTokenMap } from 'pages/Swap/types/SwapToken';
import React, { useEffect, useState } from 'react';
import { Icon, Image, Popup } from 'semantic-ui-react';
import { FlexRowSpace } from './FlexRowSpace';
import Loader from 'react-loader-spinner';
import BigNumber from 'bignumber.js';
import { displayHumanizedBalance } from 'utils';

const routeLink = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export const RouteRow = ({
  isLoading,
  tokens,
  route,
  loadingCount,
  allRoutesOutputs,
}: {
  isLoading: boolean;
  loadingCount: string;
  tokens: SwapTokenMap;
  route: string[];
  allRoutesOutputs: Array<{
    route: string[];
    toOutput?: BigNumber;
    fromOutput?: BigNumber;
    priceImpacts: number[];
  }>;
}) => {
  const [iconBackground, setIconBackground] = useState<string>('whitesmoke');
  const [loadingProgress, setLoadingProgress] = useState<string>(null);

  useEffect(() => {
    setLoadingProgress(loadingCount);
  }, [loadingCount]);

  if ((!route || route.length === 0) && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        style={{
          paddingTop: isLoading ? '1em' : '0.5em',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        Finding best route ({loadingProgress})
        <FlexRowSpace />
        <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />
      </div>
    );
  }

  return (
    <div
      style={{
        paddingTop: isLoading ? '1em' : '0.5em',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      Route
      <Popup
        trigger={
          <Icon
            name="help"
            circular
            size="tiny"
            style={{
              marginLeft: '0.5rem',
              background: iconBackground,
              verticalAlign: 'middle',
            }}
            onMouseEnter={() => setIconBackground('rgb(237, 238, 242)')}
            onMouseLeave={() => setIconBackground('whitesmoke')}
          />
        }
        content={
          <div>
            <div>
              <strong>Routing through these tokens resulted in the best price for your trade.</strong>
            </div>
            {allRoutesOutputs
              .sort((a, b) => {
                if (a.toOutput) {
                  if (a.toOutput.eq(b.toOutput)) {
                    return a.route.length - b.route.length;
                  }

                  return b.toOutput.minus(a.toOutput).toNumber();
                } else {
                  if (a.fromOutput.eq(b.fromOutput)) {
                    return a.route.length - b.route.length;
                  }

                  return a.fromOutput.minus(b.fromOutput).toNumber();
                }
              })
              .map(r => {
                const outputToken = r.fromOutput ? tokens.get(r.route[0]) : tokens.get(r.route[r.route.length - 1]);
                return (
                  <div key={r.route.join()} style={{ display: 'flex', marginTop: '0.3em', alignItems: 'center' }}>
                    {r.fromOutput && (
                      <span style={{ marginRight: '0.3em' }}>
                        ({displayHumanizedBalance(r.fromOutput, BigNumber.ROUND_UP, outputToken.decimals)})
                      </span>
                    )}
                    <Route route={r.route} tokens={tokens} />
                    {r.toOutput && (
                      <span style={{ marginLeft: '0.3em' }}>
                        ({displayHumanizedBalance(r.toOutput, BigNumber.ROUND_DOWN, outputToken.decimals)})
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        }
        position="left center"
      />
      <FlexRowSpace />
      {isLoading ? (
        <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />
      ) : (
        <Route route={route} tokens={tokens} />
      )}
    </div>
  );
};

const Route = ({ route, tokens }: { route: string[]; tokens: SwapTokenMap }) => {
  return (
    <>
      {route.map((node, idx) => {
        const token = tokens.get(node);
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
            key={token.identifier}
          >
            <Image
              src={token.logo}
              avatar
              style={{
                boxShadow: 'rgba(0, 0, 0, 0.075) 0px 6px 10px',
                borderRadius: '24px',
                maxHeight: '24px',
                maxWidth: '24px',
              }}
            />
            {token.symbol} {idx < route.length - 1 && routeLink}
          </div>
        );
      })}
    </>
  );
};
