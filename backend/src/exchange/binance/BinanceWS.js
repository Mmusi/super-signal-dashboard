// Binance WebSocket - user data stream for order fills (requires API key)
const { createWS } = require("../../data/binance/wsClient");

function startUserStream(listenKey, onUpdate) {
  const url = `wss://stream.binance.com:9443/ws/${listenKey}`;
  createWS(url, onUpdate);
}

module.exports = { startUserStream };
