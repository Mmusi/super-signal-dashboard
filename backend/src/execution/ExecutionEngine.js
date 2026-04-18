// Execution Engine - converts signals to simulated paper orders with fill + position tracking
const { simulateOrder }   = require("./OrderSimulator");
const { PositionManager } = require("./PositionManager");

class ExecutionEngine {
  constructor() {
    this.positionManager = new PositionManager();
  }

  execute(signal) {
    if (!signal || !signal.signal || !signal.signal.tradePlan) return null;

    const order    = simulateOrder(signal);
    const plan     = signal.signal.tradePlan;
    const context  = signal.context || {};

    const position = this.positionManager.openPosition({
      asset:          signal.symbol,
      direction:      signal.signal.direction,
      entry:          order.fillPrice,
      sl:             plan.stopLoss,
      tp:             plan.takeProfit,
      score:          signal.signal.score,
      regime:         context.regime?.type,
      setup_type:     signal.signal.setupType || "UNKNOWN",
      liquidity_sweep: !!context.stopHunt,
      absorption:     context.absorption?.absorption || false,
      orderflow_bias: context.orderflow?.bias || "NEUTRAL"
    });

    return position;
  }

  onMarketUpdate(candle) {
    this.positionManager.updatePosition(candle);
  }

  getOpenPositions() {
    return this.positionManager.getOpenPositions();
  }
}

module.exports = { ExecutionEngine };
