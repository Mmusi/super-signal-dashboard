// Portfolio Sync - keeps system aligned with real exchange state
const ExchangeRouter = require("./ExchangeRouter");

class PortfolioSync {
  constructor(config) {
    this.exchange = new ExchangeRouter(config);
  }

  async sync() {
    try {
      const balance   = await this.exchange.getBalance();
      const positions = await this.exchange.getPositions();
      return { balance, positions };
    } catch (err) {
      console.error("Portfolio sync error:", err.message);
      return { balance: null, positions: null };
    }
  }
}

module.exports = PortfolioSync;
