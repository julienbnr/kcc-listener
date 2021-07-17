const ethers = require('ethers');
const provider = new ethers.providers.WebSocketProvider('wss://rpc-ws-mainnet.kcc.network');

const KCS_ROUTER = '0xc0ffee0000c824d24e0f280f1e4d21152625742b';
const KCS_FACTORY = '0xc0ffee00000e1439651c6ad025ea2a71ed7f3eab';

const ROUTER_ABI = require('./json/routerABI.json');
const FACTORY_ABI = require('./json/factoryABI.json');

const router = new ethers.Contract(KCS_ROUTER, ROUTER_ABI, provider);
const factory = new ethers.Contract(KCS_FACTORY, FACTORY_ABI, provider);

const addLiquidityRegex = new RegExp("^0xe8e33700");
const addLiquidityKCSRegex = new RegExp("^0xd71a1bc5");

const webhook = require('./webhook');

const txDecoder = require('./txDecoder');

const startConnection = () => {
  let pingTimeout = null;
  let keepAliveInterval = null;
  provider._websocket.on("open", () => {
    console.log(`Spy KoffeeSwap Router !`);
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
          if (tx.to.toLowerCase() === KCS_ROUTER.toLowerCase()) {

            const liqProvidedInETH = addLiquidityKCSRegex.test(tx.data);
            if (addLiquidityRegex.test(tx.data) || liqProvidedInETH) {
              console.log(`A new ${liqProvidedInETH ? 'addLiquidityKCS' : 'addLiquidity'} transaction was detected ${txHash} !`);

              // Handle Tx Fail !
              const receipt = await tx.wait();
              const pairCreatedEvt = txDecoder.getPairCreatedEventOrUndefined(receipt);

              if (pairCreatedEvt) {
                console.log(`A new pair was created from the router on transaction ${txHash} !`);
                const pairEvtMessage = await txDecoder.getReadableMessageFromPairCreatedEvent(pairCreatedEvt, provider);
                const msg = `Tx Hash: ${txHash}\n${pairEvtMessage}`;
                console.log(msg);
                await webhook.sendWebhook(msg);
              } else {
                console.log(`No new pair created from the router on transaction ${txHash} !`);
              }

              // console.log(`An error occurred on the transaction ${txHash}`)
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
    console.log("Error. Attemptiing to Reconnect...");
    clearInterval(keepAliveInterval);
    clearTimeout(pingTimeout);
    startConnection();
  });

  provider._websocket.on("pong", () => {
    clearInterval(pingTimeout);
  });
};

startConnection()
