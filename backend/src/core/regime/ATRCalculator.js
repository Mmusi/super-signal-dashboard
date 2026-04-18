// ATR Calculator - volatility core measurement
// Calculates Average True Range for compression and volatility detection

function trueRange(high, low, prevClose) {
  return Math.max(
    high - low,
    Math.abs(high - prevClose),
    Math.abs(low - prevClose)
  );
}

function ATR(candles, period = 14) {
  let trs = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(
      trueRange(
        candles[i].high,
        candles[i].low,
        candles[i - 1].close
      )
    );
  }
  const recent = trs.slice(-period);
  if (recent.length === 0) return 0;
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return avg;
}

module.exports = { ATR, trueRange };
