import React from 'react';
import { Box } from 'grommet';
import { Title } from './Base/components/Title';
import * as styles from './info-styles.styl';
import { Text } from './Base';

export const Info = ({ title }: { title: string }) => (
  <Box className={styles.infoContainer} pad={{ horizontal: 'large', top: 'large' }}>
    {title ? (
      <Box direction="row" justify="center" margin={{ bottom: 'medium' }}>
        <Title>{title}</Title>
      </Box>
    ) : null}
    <div>
      <p>
        <b>The Secret Bridge has been officially deprecated. What does this mean?</b>
        <ul>
          <li>1. The contracts have been disabled, and the bridge is offline.</li>
          <li>2. All funds are safe. Tokens that support migration can be redeemed at the new {' '}
            <a href="https://tunnel.scrt.network" target="_blank" rel="noreferrer">scrt.tunnel</a>.
          </li>
          <ul>
            These tokens are:
            <br />
            Ethereum: USDT, USDC, ETH, DAI, WBTC
            <br />
            BSC: BNB
          </ul>
          <li>
            3. Tokens that are not supported in the new scrt.tunnel are available via a manual claim process. Any unclaimed
            funds are kept in cold storage and can be claimed at any time.
          </li>
          <li>
            4. WSCRT migration to axlSCRT will be supported in the near future.
          </li>
        </ul>
      </p>
      <p>
        <b>Help, my tokens aren't in the list!</b>
        <ul>
          <li>
            If you have assets that do not support migration, please reach out to the Secret Bridge team. We will assist
            in the manual claim process. Your funds will be kept in cold storage until you claim them. Contact us at bridge.claims@scrtlabs.com if you wish to migrate legacy tokens.
          </li>
          <li>
            If you have any questions, please reach out to the Secret Network team
            on the <a href="https://chat.scrt.network/" target="_blank" rel="noreferrer">Secret Network Discord server</a>.
          </li>
        </ul>
      </p>

      <p>
        <b>This site will still be available</b>
        <br />
        While the bridge itself is deprecated, this page will remain available for those that may have funds remaining in
        the earn pools. The bridge will not be available for new transactions, but you can still access the earn pools.

        <b>DEPOSITING OR SENDING FUNDS TO BRIDGE CONTRACTS OR EARN POOLS MAY RESULT IN LOSS OF FUNDS AND SHOULD NOT BE DONE</b>
      </p>
      <p>
        <b>Support</b>
        <br />
        If you have any questions, reach out to our <strong>#🌉bridge-support</strong> channel on the{' '}
        <a href="https://chat.scrt.network/" target="_blank" rel="noreferrer">
          Secret Network Discord server
        </a>{' '}
      </p>
      <p>
        <b>DISCLAIMER</b>
        <p>
          <Text size={"xxsmall"}>
          SCRT LABS IS NOT UNDER ANY LEGAL, CONTRACTUAL OR OTHER OBLIGATION TO
          HOLD, TRANSFER, KEEP SAFE, REIMBURSE OR COMPENSATE FOR ANY DIGITAL ASSET
          REMAINING ON THE BRIDGE. ANY DIGITAL ASSET OWNERS WHO HAVE NOT YET REMOVED THEIR ASSETS
          FROM THE BRIDGE DESPITE THE REPEATED NOTIFICATIONS, ARE SOLELY LIABLE TO ANY DAMAGE OR
          LOSS THAT MAY BE INCURRED. IN NO EVENT SHALL WE, OUR AFFILIATES, OR OUR RESPECTIVE DIRECTORS,
          OFFICERS, EMPLOYEES, AGENTS, OR CONTRACTORS, BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
          CONSEQUENTIAL, SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING, WITHOUT LIMITATION,
          DAMAGES FOR LOSS OF PROFITS, LOSS OF TOKENS, OR INTERRUPTION OF SERVICE,
          ARISING OUT OF OR IN CONNECTION WITH THE USE OR INABILITY TO USE THE WEBSITE,
          BRIDGE, OR ANY OTHER RELATED SERVICE.
          </Text>
        </p>
      </p>
    </div>
  </Box>
);
