// Absorption Detector - KEY EDGE: high volume but price does NOT move
// Detects when smart money absorbs selling/buying pressure at key levels
// Signal: large wick + high volume + small body = absorption

function averageVolume(candles) {
  return candles.slice(-20).reduce((a, b) => a + b.volume, 0) / 20;
}

function detectAbsorption(candles) {
  const last = candles.at(-1);
  if (!last) return { absorption: false };

  const bodySize = Math.abs(last.close - last.open);
  const wickSize = last.high - last.low;
  const volume = last.volume;

  // high volume but low price movement = absorption
  if (volume > 1.5 * averageVolume(candles) && bodySize < wickSize * 0.3) {
    return {
      absorption: true,
      side: last.close > last.open ? "SELLING_ABSORBED" : "BUYING_ABSORBED"
    };
  }

  return { absorption: false };
}

module.exports = { detectAbsorption };
