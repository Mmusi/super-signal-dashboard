// OKX Client - REST API connector for OKX exchange
const axios = require("axios");

class OKXClient {
  constructor(config) {
    this.apiKey     = config.apiKey;
    this.secret     = config.secret;
    this.passphrase = config.passphrase;
    this.baseURL    = "https://www.okx.com";
  }

  async placeOrder(order) {
    const payload = {
      instId:  order.symbol,
      tdMode:  "cash",
      side:    order.side,
      ordType: "market",
      sz:      order.quantity
    };

    const res = await axios.post(
      `${this.baseURL}/api/v5/trade/order`,
      payload,
      {
        headers: {
          "OK-ACCESS-KEY":        this.apiKey,
          "OK-ACCESS-PASSPHRASE": this.passphrase
        }
      }
    );
    return res.data;
  }

  async getBalance() {
    const res = await axios.get(`${this.baseURL}/api/v5/account/balance`);
    return res.data;
  }

  async getPositions() {
    const res = await axios.get(`${this.baseURL}/api/v5/account/positions`);
    return res.data;
  }
}

module.exports = OKXClient;
