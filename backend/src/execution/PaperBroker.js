// Paper Broker - main paper trading entry point
// Wraps ExecutionEngine, provides clean interface for signal → paper fill
const { ExecutionEngine } = require("./ExecutionEngine");
const { PortfolioManager } = require("./PortfolioManager");

class PaperBroker {
  constructor() {
    this.executionEngine   = new ExecutionEngine();
    this.portfolioManager  = new PortfolioManager(10000); // start $10,000 demo
  }

  onSignal(signal) {
    return this.executionEngine.execute(signal);
  }

  onCandle(candle) {
    this.executionEngine.onMarketUpdate(candle);
  }

  onTradeClose(trade) {
    this.portfolioManager.update(trade);
  }

  getPortfolio() {
    return this.portfolioManager.getState();
  }

  getOpenPositions() {
    return this.executionEngine.getOpenPositions();
  }
}

module.exports = { PaperBroker };
