// Support & Resistance Detector - identifies key price levels from structure
function findSupportResistance(candles, lookback = 20) {
  const window = candles.slice(-lookback);
  const highs = window.map(c => c.high);
  const lows = window.map(c => c.low);

  const resistance = Math.max(...highs);
  const support = Math.min(...lows);

  return { resistance, support, range: resistance - support };
}

module.exports = { findSupportResistance };
