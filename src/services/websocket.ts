// private static getHeightFromEvent(data) {
//   const heightFromEvent =
//     data?.result?.data?.value?.TxResult?.height || data?.result?.data?.value?.block?.header?.height || 0;
//   const height = Number(heightFromEvent);
//
//   // todo: why not break here?
//   if (isNaN(height)) {
//     console.error(
//       `height is NaN for some reason. Unexpected behavior from here on out: got heightFromEvent=${heightFromEvent}`,
//     );
//   }
//   return height;
// }
//
// private registerSCRTQueries() {
//   const myAddress = this.props.user.address;
//   const scrtQueries = [
//     `message.sender='${myAddress}'` /* sent a tx (gas) */,
//     `message.signer='${myAddress}'` /* executed a contract (gas) */,
//     `transfer.recipient='${myAddress}'` /* received SCRT */,
//   ];
//
//   for (const query of scrtQueries) {
//     this.ws.send(
//       JSON.stringify({
//         jsonrpc: '2.0',
//         id: 'uscrt', // jsonrpc id
//         method: 'subscribe',
//         params: { query },
//       }),
//     );
//   }
// }
//
// private registerTokenQueries(token0: string, token1: string) {
//   for (const token of [this.state.allTokens.get(token0), this.state.allTokens.get(token1)]) {
//     console.log(`Registering queries for ${token.symbol}`);
//     const tokenAddress = token.address;
//     const tokenQueries = [`message.contract_address='${tokenAddress}'`, `wasm.contract_address='${tokenAddress}'`];
//     for (const query of tokenQueries) {
//       if (this.state.queries.includes(query)) {
//         // already subscribed
//         continue;
//       }
//       this.ws.send(
//         JSON.stringify({
//           jsonrpc: '2.0',
//           id: token.identifier, // jsonrpc id
//           method: 'subscribe',
//           params: { query },
//         }),
//       );
//     }
//     this.setState(currentState => ({
//       queries: Array.from(new Set(currentState.queries.concat(tokenQueries))),
//     }));
//   }
// }
//
// private getPairQueries(pair: SwapPair): string[] {
//   return [
//     `message.contract_address='${pair.contract_addr}'`,
//     `wasm.contract_address='${pair.contract_addr}'`,
//     `message.contract_address='${pair.liquidity_token}'`,
//     `wasm.contract_address='${pair.liquidity_token}'`,
//   ];
// }
//
// private registerPairQueries(pair?: SwapPair) {
//   const registerPair = pair || this.state.selectedPair;
//   if (!registerPair) {
//     console.log('Tried to register queries for empty pair');
//     return;
//   }
//
//   const pairQueries = this.getPairQueries(pair);
//
//   for (const query of pairQueries) {
//     if (this.state.queries.includes(query)) {
//       // alreay subscribed
//       continue;
//     }
//     this.ws.send(
//       JSON.stringify({
//         jsonrpc: '2.0',
//         id: registerPair.identifier(), // jsonrpc id
//         method: 'subscribe',
//         params: { query },
//       }),
//     );
//   }
//   this.setState(currentState => ({
//     queries: Array.from(new Set(currentState.queries.concat(pairQueries))),
//   }));
// }

// private getRoutesQueries(): { [pairId: string]: Array<string> } {
//   const queris: { [pairId: string]: Set<string> } = {};
//
//   for (const r of this.state.selectedPairRoutes) {
//     for (let i = 0; i < r.length - 2; i++) {
//       const pair = this.state.pairs.get(`${r[i]}${SwapPair.id_delimiter}${r[i + 1]}`);
//       if (pair) {
//         if (!(pair.identifier() in queris)) {
//           queris[pair.identifier()] = new Set();
//         }
//
//         const pairQueries = this.getPairQueries(pair);
//         for (const q of pairQueries) {
//           queris[pair.identifier()].add(q);
//         }
//       }
//     }
//   }
//
//   const result: { [pairId: string]: Array<string> } = {};
//   for (const pairId in queris) {
//     result[pairId] = Array.from(queris[pairId]);
//   }
//
//   return result;
// }
//
// private registerRoutesQueries() {
//   const routesQueries = this.getRoutesQueries();
//
//   if (Object.keys(routesQueries).length === 0) {
//     return;
//   }
//
//   const queriesToStoreInState: Array<string> = [];
//   for (const pairId in routesQueries) {
//     for (const query of routesQueries[pairId]) {
//       if (this.state.queries.includes(query)) {
//         // alreay subscribed
//         continue;
//       }
//       this.ws.send(
//         JSON.stringify({
//           jsonrpc: '2.0',
//           id: `pools-${pairId}`, // jsonrpc id
//           method: 'subscribe',
//           params: { query },
//         }),
//       );
//       queriesToStoreInState.push(query);
//     }
//   }
//
//   this.setState(currentState => ({
//     queries: Array.from(new Set(currentState.queries.concat(queriesToStoreInState))),
//   }));
// }
//
// unSubscribePair(pair: SwapPair) {
//   console.log(`Unsubscribing queries for ${pair.identifier()}`);
//
//   const queries = this.getPairQueries(pair);
//   for (const query of queries) {
//     this.ws.send(
//       JSON.stringify({
//         jsonrpc: '2.0',
//         id: '-1',
//         method: 'unsubscribe',
//         params: { query },
//       }),
//     );
//   }
//
//   this.setState(currentState => {
//     let queries = currentState.queries;
//     for (const query of this.getPairQueries(pair)) {
//       queries = queries.filter(q => q !== query);
//     }
//     return { queries };
//   });
// }
//
// unSubscribeAll() {
//   for (const query of this.state.queries) {
//     console.log(`Unsubscribing queries for ${query}`);
//     this.ws.send(
//       JSON.stringify({
//         jsonrpc: '2.0',
//         id: '-1',
//         method: 'unsubscribe',
//         params: { query },
//       }),
//     );
//   }
//   this.setState({ queries: [] });
// }


// private async onMessage(event: WebSocketMessageEvent | MessageEvent<any>) {
//   try {
//     const data = JSON.parse(event.data);
//
//     if (isEmptyObject(data.result)) {
//       return;
//     }
//
//     if (Number(data.id) === -1) {
//       return;
//     }
//
//     const dataId: string = data.id;
//
//     if (dataId.startsWith('pools-')) {
//       const pair = this.state.pairs.get(dataId.replace('pools-', ''));
//       await this.refreshPools({ pair });
//       return;
//     }
//
//     let tokens: Array<string> = data.id.split('/');
//
//     // refresh selected token balances as well
//     if (this.state.selectedToken0) {
//       tokens.push(this.state.allTokens.get(this.state.selectedToken0)?.identifier);
//     }
//     if (this.state.selectedToken1) {
//       tokens.push(this.state.allTokens.get(this.state.selectedToken1)?.identifier);
//     }
//
//     tokens = [...new Set(tokens)];
//
//     // todo: move this to another function
//     const height = SwapRouter.getHeightFromEvent(data);
//
//     console.log(`Refreshing ${tokens.join(' and ')} for height ${height}`);
//
//     const pairSymbol: string = dataId;
//     const pair = this.state.pairs.get(pairSymbol);
//
//     await this.refreshBalances({ height, tokens, pair });
//   } catch (error) {
//     console.log(`Failed to refresh balances: ${error}`);
//   }
// }

// *** componentDidMount **
// this.props.user.websocketTerminate(true);
//
// this.ws = new WebSocket(process.env.SECRET_WS);
//
// this.ws.onmessage = async event => {
//   await this.onMessage(event);
// };

// this.ws.onopen = async () => {
//   // Here we register for token related events
//   // Then in onmessage we know when to refresh all the balances
//   while (!this.props.user.address) {
//     await sleep(100);
//   }
//
//   // Register for SCRT events
//   //this.registerSCRTQueries();
//
//   // Register for token or SCRT events
//   // this.registerTokenQueries();
//   //
//   // // Register for pair events
//   // this.registerPairQueries();
//   //}
// };


// *** componentDidUpdate ***
//const tokensToRefresh = [];

// if (this.state.selectedToken1 !== prevState.selectedToken1) {
//
// }

// if (
//   this.state.selectedToken1 &&
//   !this.state.balances[this.state.selectedToken1] &&
//   prevState.selectedToken1 !== this.state.selectedToken1 &&
//   prevState.selectedToken0 !== this.state.selectedToken1
// ) {
//   tokensToRefresh.push(this.state.selectedToken1);
// }
//
// if (
//   this.state.selectedToken0 &&
//   !this.state.balances[this.state.selectedToken0] &&
//   prevState.selectedToken0 !== this.state.selectedToken0 &&
//   prevState.selectedToken1 !== this.state.selectedToken0
// ) {
//   tokensToRefresh.push(this.state.selectedToken0);
// }
//
// if (tokensToRefresh.length > 0) {
//   await this.refreshBalances({ tokens: tokensToRefresh });
// }

// if (
//   prevState.selectedToken0 !== this.state.selectedToken0 ||
//   prevState.selectedToken1 !== this.state.selectedToken1
// ) {
//   //this.unSubscribeAll();
//   // Register for token or SCRT events
//   //this.registerTokenQueries(this.state.selectedToken0, this.state.selectedToken1);
//   // Register for pair events
//   //this.registerPairQueries(this.state.selectedPair);
//   // Register for pair events along all routes,
//   // because we need to know about changes in pool sizes
//   //this.registerRoutesQueries();
// }


//   async reRegisterPairHooks() {}