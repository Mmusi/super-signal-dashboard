// Market Structure - identifies Higher Highs, Lower Lows, BOS (Break of Structure)
function analyzeStructure(candles) {
  const slice = candles.slice(-20);
  const highs = slice.map(c => c.high);
  const lows = slice.map(c => c.low);

  const lastHigh = highs[highs.length - 1];
  const prevHigh = Math.max(...highs.slice(0, -1));
  const lastLow = lows[lows.length - 1];
  const prevLow = Math.min(...lows.slice(0, -1));

  let structure = "NEUTRAL";

  if (lastHigh > prevHigh) structure = "BULLISH_BOS";
  if (lastLow < prevLow) structure = "BEARISH_BOS";

  return {
    structure,
    lastHigh,
    prevHigh,
    lastLow,
    prevLow,
    lastPrice: candles.at(-1).close
  };
}

module.exports = { analyzeStructure };
