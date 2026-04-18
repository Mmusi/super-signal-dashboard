// Compression Engine - detects market coiling for breakout preparation
// Logic: falling ATR over recent candles vs older candles = compression score
const { ATR } = require("./ATRCalculator");

function compressionScore(candles) {
  const atrValues = [];

  for (let i = 20; i < candles.length; i++) {
    const slice = candles.slice(i - 14, i);
    atrValues.push(ATR(slice));
  }

  if (atrValues.length < 5) {
    return { compression: false, score: 0, compressionRatio: 1 };
  }

  const recent = atrValues.slice(-5);
  const older = atrValues.slice(-10, -5);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  if (olderAvg === 0) return { compression: false, score: 0, compressionRatio: 1 };

  const compressionRatio = recentAvg / olderAvg;

  let score = 0;
  let compression = false;

  if (compressionRatio < 0.8) {
    compression = true;
    score = Math.min(100, (1 - compressionRatio) * 150);
  }

  return { compression, score, compressionRatio };
}

module.exports = { compressionScore };
