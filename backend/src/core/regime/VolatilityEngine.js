// Volatility Engine - detects LOW / NORMAL / HIGH volatility states
// Powers regime classification and compression detection
const { ATR } = require("./ATRCalculator");

function volatilityState(candles) {
  const atr = ATR(candles);
  const closes = candles.map(c => c.close);
  const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;
  const volatilityRatio = atr / avgPrice;

  if (volatilityRatio < 0.003) {
    return { state: "LOW", atr, volatilityRatio };
  }

  if (volatilityRatio > 0.01) {
    return { state: "HIGH", atr, volatilityRatio };
  }

  return { state: "NORMAL", atr, volatilityRatio };
}

module.exports = { volatilityState };
