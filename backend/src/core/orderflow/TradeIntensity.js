// Trade Intensity - measures aggression of current candle relative to recent history
function tradeIntensity(candles) {
  const last = candles.at(-1);
  const avgVol = candles.slice(-20).reduce((a, c) => a + c.volume, 0) / 20;

  const intensity = last.volume / avgVol;
  const aggressive = intensity > 1.5;

  return {
    intensity,
    aggressive,
    level: intensity > 2 ? "HIGH" : intensity > 1.5 ? "MEDIUM" : "LOW"
  };
}

module.exports = { tradeIntensity };
