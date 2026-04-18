// Binance Client - REST API for live order placement and account management
// IMPORTANT: Only used in LIVE mode. Always routes through Risk Engine first.
const axios  = require("axios");
const crypto = require("crypto");

class BinanceClient {
  constructor(config) {
    this.apiKey  = config.apiKey;
    this.secret  = config.secret;
    this.baseURL = "https://api.binance.com";
  }

  sign(queryString) {
    return crypto
      .createHmac("sha256", this.secret)
      .update(queryString)
      .digest("hex");
  }

  async placeOrder(order) {
    const timestamp = Date.now();
    const params = new URLSearchParams({
      symbol:    order.symbol,
      side:      order.side,
      type:      "MARKET",
      quantity:  order.quantity,
      timestamp
    });
    params.append("signature", this.sign(params.toString()));

    const res = await axios.post(
      `${this.baseURL}/api/v3/order?${params.toString()}`,
      {},
      { headers: { "X-MBX-APIKEY": this.apiKey } }
    );
    return res.data;
  }

  async getBalance() {
    const timestamp = Date.now();
    const query     = `timestamp=${timestamp}`;
    const signature = this.sign(query);

    const res = await axios.get(
      `${this.baseURL}/api/v3/account?${query}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": this.apiKey } }
    );
    return res.data;
  }

  async getPositions() {
    return this.getBalance();
  }
}

module.exports = BinanceClient;
