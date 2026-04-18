// OKX WebSocket - user data stream stub
const { createOKXWS } = require("../../data/okx/wsClient");

function startOKXStream(channel, onUpdate) {
  const url = "wss://ws.okx.com:8443/ws/v5/private";
  createOKXWS(url, onUpdate);
}

module.exports = { startOKXStream };
