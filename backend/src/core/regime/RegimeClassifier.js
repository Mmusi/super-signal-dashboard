// Market Regime Classifier - MAIN BRAIN
// Combines volatility + compression → single regime state
// This is the most important filter: prevents overtrading in CHOP
const { volatilityState } = require("./VolatilityEngine");
const { compressionScore } = require("./CompressionEngine");
const regimes = require("./regimeTypes");

function classifyRegime(candles) {
  const vol = volatilityState(candles);
  const comp = compressionScore(candles);

  let regime = regimes.CHOP;
  let confidence = 0;

  // COMPRESSION: low vol + falling ATR → breakout building
  if (comp.compression && vol.state === "LOW") {
    regime = regimes.COMPRESSION;
    confidence = comp.score;
  }

  // EXPANSION: high vol, no compression → breakout active
  if (vol.state === "HIGH" && comp.compression === false) {
    regime = regimes.EXPANSION;
    confidence = 80;
  }

  // TREND DETECTION: structure-based (simple)
  const last = candles.slice(-10);
  const upMoves = last.filter((c, i) => i > 0 && c.close > last[i - 1].close).length;

  if (upMoves > 7) {
    regime = regimes.TRENDING_UP;
    confidence = 70;
  }

  if (upMoves < 3) {
    regime = regimes.TRENDING_DOWN;
    confidence = 70;
  }

  return { regime, confidence, volatility: vol, compression: comp };
}

module.exports = { classifyRegime };
