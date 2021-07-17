const ethers = require('ethers');
const provider = new ethers.providers.WebSocketProvider('wss://rpc-ws-mainnet.kcc.network');
const txDecoder = require('./txDecoder');

const run = async () => {
  const txHash = '0x90e75662a54931523d8579109586e9c141b7a07ed46ace0e54529ad254bbcf3b';
  const tx = await provider.getTransaction(txHash);
  const receipt = await tx.wait();
  const pairCreatedEvt = txDecoder.getPairCreatedEventOrUndefined(receipt);
  const pairEvtMessage = await txDecoder.getReadableMessageFromPairCreatedEvent(pairCreatedEvt, provider);
  const msg = `Tx Hash: ${txHash}\n${pairEvtMessage}`;
  console.log(msg);
};

run();
