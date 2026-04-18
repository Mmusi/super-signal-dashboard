// Swing Points - identifies swing highs and lows in price action
function findSwingPoints(candles) {
  const swings = [];

  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    const prev1 = candles[i - 1];
    const prev2 = candles[i - 2];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    if (c.high > prev1.high && c.high > prev2.high && c.high > next1.high && c.high > next2.high) {
      swings.push({ type: "HIGH", price: c.high, time: c.time, index: i });
    }

    if (c.low < prev1.low && c.low < prev2.low && c.low < next1.low && c.low < next2.low) {
      swings.push({ type: "LOW", price: c.low, time: c.time, index: i });
    }
  }

  return swings;
}

module.exports = { findSwingPoints };
