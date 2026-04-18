// Exchange Router - routes orders to correct exchange (Binance or OKX)
// Single entry point - never call exchange directly from signal engine
const BinanceClient = require("./binance/BinanceClient");
const OKXClient     = require("./okx/OKXClient");

class ExchangeRouter {
  constructor(config) {
    this.exchange = config.exchange || "binance";

    if (this.exchange === "binance") {
      this.client = new BinanceClient(config);
    } else if (this.exchange === "okx") {
      this.client = new OKXClient(config);
    } else {
      throw new Error(`Unknown exchange: ${this.exchange}`);
    }
  }

  async placeOrder(order) {
    return this.client.placeOrder(order);
  }

  async getBalance() {
    return this.client.getBalance();
  }

  async getPositions() {
    return this.client.getPositions();
  }
}

module.exports = ExchangeRouter;
