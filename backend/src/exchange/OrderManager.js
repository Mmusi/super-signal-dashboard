// Order Manager - central execution control
// CRITICAL SAFETY: Risk Engine ALWAYS runs first. No direct exchange calls bypassing this.
const ExchangeRouter = require("./ExchangeRouter");

class OrderManager {
  constructor(config) {
    this.exchange = new ExchangeRouter(config);
  }

  async executeTrade(signal, riskDecision) {
    if (!riskDecision.allowed) {
      console.log(`🚫 Trade BLOCKED: ${riskDecision.reason}`);
      return { status: "BLOCKED_BY_RISK", reason: riskDecision.reason };
    }

    const order = {
      symbol:   signal.asset,
      side:     signal.direction === "LONG" ? "BUY" : "SELL",
      quantity: riskDecision.size
    };

    try {
      const result = await this.exchange.placeOrder(order);
      console.log(`✅ Order placed: ${order.symbol} ${order.side} qty:${order.quantity}`);
      return { status: "EXECUTED", order: result };
    } catch (err) {
      console.error("Order placement error:", err.message);
      return { status: "ERROR", error: err.message };
    }
  }
}

module.exports = OrderManager;
