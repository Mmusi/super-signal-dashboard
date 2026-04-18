// Trade Stream - streams individual trade ticks for order flow analysis
const { createWS } = require("./wsClient");

function startTradeStream(symbol, onTrade) {
  const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`;

  createWS(url, (trade) => {
    onTrade({
      price:         parseFloat(trade.p),
      volume:        parseFloat(trade.q),
      time:          trade.T,
      isBuyerMaker:  trade.m  // true = sell-initiated, false = buy-initiated
    });
  });
}

module.exports = { startTradeStream };
