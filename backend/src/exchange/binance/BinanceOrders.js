// Binance Orders - order management helpers
const BinanceClient = require("./BinanceClient");

class BinanceOrders {
  constructor(config) {
    this.client = new BinanceClient(config);
  }

  async marketBuy(symbol, quantity) {
    return this.client.placeOrder({ symbol, side: "BUY", quantity });
  }

  async marketSell(symbol, quantity) {
    return this.client.placeOrder({ symbol, side: "SELL", quantity });
  }
}

module.exports = BinanceOrders;
