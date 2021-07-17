const ethers = require('ethers');
const abiDecoder = require('abi-decoder');
const EVENT_ABI = require('./json/eventABI.json');
const TOKEN_ABI = require('./json/genericTokenABI.json');

abiDecoder.addABI(EVENT_ABI);

const decode = (data) => {
  const decoded = abiDecoder.decodeMethod(data);
  const methodName = decoded.name;
  const methodId = data.substring(0, data && data.length >= 10 ? 10 : data.length);
  console.log(`${methodId}: ${methodName}`);
  return decoded.name;
};


const getPairCreatedEventOrUndefined = (receipt) => {
  const logs = abiDecoder.decodeLogs(receipt.logs);
  return logs.find(log => log.name === 'PairCreated');
};

/**
 * Get a readable human message from event.
 *
 * @param event the event
 * @param provider the provider
 * @returns {Promise<string>}
 */
const getReadableMessageFromPairCreatedEvent = async (event, provider, routerName) => {
  const tokenAddress0 = event.events[0].value;
  const tokenAddress1 = event.events[1].value;

  const contractToken0 = new ethers.Contract(tokenAddress0, TOKEN_ABI, provider);
  const contractToken1 = new ethers.Contract(tokenAddress1, TOKEN_ABI, provider);

  try {
    // Token0 information
    const nameToken0 = await contractToken0.name();
    const symbolToken0 = await contractToken0.symbol();
    const supplyToken0 = await contractToken0.totalSupply();

    // Token1 information
    const nameToken1 = await contractToken1.name();
    const symbolToken1 = await contractToken1.symbol();
    const supplyToken1 = await contractToken1.totalSupply();

    const pairMessage = `New pair ${symbolToken0}/${symbolToken1} was created from the router ${routerName} !`;

    const messageToken0 = getTokenMessage(' Token 0 ', tokenAddress0, nameToken0, symbolToken0, supplyToken0);
    const messageToken1 = getTokenMessage(' Token 1 ', tokenAddress1, nameToken1, symbolToken1, supplyToken1);

    return `${pairMessage}\n${messageToken0}\n${messageToken1}\n`;
  } catch (error) {
    console.log(error);
    return `Unable to get token information !`;
  }
};

const getTokenMessage = (label, address, name, symbol, supply) => {
  const supplyEther = ethers.utils.formatEther(supply);
  return `--${label}--\nName: ${name}\nAddress: ${address}\nSymbol: ${symbol}\n`;
};

exports.decode = decode;
exports.getPairCreatedEventOrUndefined = getPairCreatedEventOrUndefined;
exports.getReadableMessageFromPairCreatedEvent = getReadableMessageFromPairCreatedEvent;
