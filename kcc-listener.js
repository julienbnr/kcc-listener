const ethers = require('ethers');
const provider = new ethers.providers.WebSocketProvider('wss://rpc-ws-mainnet.kcc.network');

const KCC_ROUTERS = [
  {
    name: 'KoffeeSwap',
    address: '0xc0ffee0000c824d24e0f280f1e4d21152625742b'
  },
  {
    name: 'KuSwap',
    address: '0xA58350d6dEE8441aa42754346860E3545cc83cdA'
  }
];

const KCC_ROUTER_ADDRESSES = [
  '0xc0ffee0000c824d24e0f280f1e4d21152625742b'.toLowerCase(),
  '0xA58350d6dEE8441aa42754346860E3545cc83cdA'.toLowerCase()
];

const ALL_ROUTER_NAMES = KCC_ROUTERS.map(router => router.name).join('/');
const addLiquidityRegex = new RegExp("^0xe8e33700");
const addLiquidityKCSRegex = new RegExp("^0xd71a1bc5");
const addLiquidityETHRegex = new RegExp("^0xf305d719");

const webhook = require('./webhook');

const txDecoder = require('./txDecoder');

const startConnection = () => {
  let pingTimeout = null;
  let keepAliveInterval = null;
  provider._websocket.on("open", () => {
    console.log(`Spying ${ALL_ROUTER_NAMES} Routers for new PairCreated events when adding liquidity !`);
    keepAliveInterval = setInterval(() => {
      provider._websocket.ping();
      // Use `WebSocket#terminate()`, which immediately destroys the connection,
      // instead of `WebSocket#close()`, which waits for the close timer.
      // Delay should be equal to the interval at which your server
      // sends out pings plus a conservative assumption of the latency.
      pingTimeout = setTimeout(() => {
        provider._websocket.terminate();
      }, 30000);
    }, 15000);

    provider.on("pending", async (txHash) => {
      provider.getTransaction(txHash).then(async (tx) => {
        if (tx && tx.to) {
          if (KCC_ROUTER_ADDRESSES.includes(tx.to.toLowerCase())) {

            const liqProvidedInETH = addLiquidityKCSRegex.test(tx.data) || addLiquidityETHRegex.test(tx.data);
            if (addLiquidityRegex.test(tx.data) || liqProvidedInETH) {
              const routerName = KCC_ROUTERS.filter(router => router.address.toLowerCase() === tx.to.toLowerCase())[0].name;
              console.log(`A new ${liqProvidedInETH ? 'addLiquidityKCS' : 'addLiquidity'} transaction was detected from the router ${routerName} ! Tx Hash: ${txHash} !`);

              try {
                const receipt = await tx.wait();
                const pairCreatedEvt = txDecoder.getPairCreatedEventOrUndefined(receipt);

                if (pairCreatedEvt) {
                  console.log(`A new pair was created from the router on transaction ${txHash} !`);
                  const pairEvtMessage = await txDecoder.getReadableMessageFromPairCreatedEvent(pairCreatedEvt, provider, routerName);
                  const msg = `Tx Hash: ${txHash}\n${pairEvtMessage}`;
                  console.log(msg);
                  await webhook.sendWebhook(msg);
                } else {
                  console.log(`No new pair created from the router on transaction ${txHash} !`);
                }
              } catch (error) {
                console.log(`Transaction ${txHash} has failed !`);
              }
            }
          }
        }
      });
    });
  });

  provider._websocket.on("close", () => {
    console.log("WebSocket Closed...Reconnecting...");
    clearInterval(keepAliveInterval);
    clearTimeout(pingTimeout);
    startConnection();
  });

  provider._websocket.on("error", () => {
    console.log("Error. Attempting to Reconnect...");
    clearInterval(keepAliveInterval);
    clearTimeout(pingTimeout);
    startConnection();
  });

  provider._websocket.on("pong", () => {
    clearInterval(pingTimeout);
  });
};

startConnection()
