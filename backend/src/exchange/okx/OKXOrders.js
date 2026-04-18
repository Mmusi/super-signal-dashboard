// OKX Orders - order management helpers
const OKXClient = require("./OKXClient");

class OKXOrders {
  constructor(config) {
    this.client = new OKXClient(config);
  }

  async marketBuy(symbol, quantity) {
    return this.client.placeOrder({ symbol, side: "buy", quantity });
  }

  async marketSell(symbol, quantity) {
    return this.client.placeOrder({ symbol, side: "sell", quantity });
  }
}

module.exports = OKXOrders;
