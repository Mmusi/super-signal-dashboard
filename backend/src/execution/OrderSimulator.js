// Order Simulator - simulates realistic fills with slippage and latency
// Paper trading mode: no real exchange calls, models market imperfections
function simulateOrder(signal) {
  const basePrice = signal.context
    ? signal.context.structure.lastPrice
    : (signal.signal?.tradePlan?.entry || 0);

  // Simulate slippage: 0.02%–0.1% of price
  const slippagePct = 0.0002 + Math.random() * 0.0008;
  const slippage    = basePrice * slippagePct;

  const fillPrice = signal.signal?.direction === "LONG"
    ? basePrice + slippage
    : basePrice - slippage;

  return {
    fillPrice,
    slippage,
    latencyMs: Math.floor(Math.random() * 100) + 5
  };
}

module.exports = { simulateOrder };
