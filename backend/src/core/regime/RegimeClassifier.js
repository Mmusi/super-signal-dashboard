// Market Regime Classifier - MAIN BRAIN
// Combines volatility + compression + EMA structure → single regime state

const { volatilityState } = require("./VolatilityEngine");
const { compressionScore } = require("./CompressionEngine");
const { ATR } = require("./ATRCalculator");
const regimes = require("./regimeTypes");

function ema(candles, period) {
  const k = 2 / (period + 1);
  let val = candles[0].close;
  for (let i = 1; i < candles.length; i++) {
    val = candles[i].close * k + val * (1 - k);
  }
  return val;
}

function adx(candles, period = 14) {
  // Simplified ADX using directional movement
  if (candles.length < period + 1) return 0;
  const recent = candles.slice(-period - 1);
  let plusDM = 0, minusDM = 0, tr = 0;
  for (let i = 1; i < recent.length; i++) {
    const c = recent[i], p = recent[i - 1];
    const upMove   = c.high - p.high;
    const downMove = p.low  - c.low;
    if (upMove > downMove && upMove > 0)   plusDM  += upMove;
    if (downMove > upMove && downMove > 0) minusDM += downMove;
    tr += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
  }
  if (tr === 0) return 0;
  const di_plus  = (plusDM  / tr) * 100;
  const di_minus = (minusDM / tr) * 100;
  const sum = di_plus + di_minus;
  return sum === 0 ? 0 : Math.abs(di_plus - di_minus) / sum * 100;
}

function classifyRegime(candles) {
  if (candles.length < 55) {
    return {
      regime: regimes.CHOP,
      confidence: 0,
      volatility: { state: "NORMAL", atr: 0 },
      compression: { compression: false, score: 0 }
    };
  }

  const vol  = volatilityState(candles);
  const comp = compressionScore(candles);

  // EMA structure for trend detection (more reliable than raw candle counting)
  const ema21 = ema(candles, 21);
  const ema50 = ema(candles, 50);
  const lastClose = candles[candles.length - 1].close;
  const strength = adx(candles, 14);

  let regime = regimes.CHOP;
  let confidence = 0;

  // COMPRESSION first (highest priority for breakout setup)
  if (comp.compression && vol.state === "LOW") {
    regime = regimes.COMPRESSION;
    confidence = comp.score;
  }

  // EXPANSION: high vol burst, no compression
  if (vol.state === "HIGH" && !comp.compression) {
    regime = regimes.EXPANSION;
    confidence = 80;
  }

  // TRENDING UP: price > EMA21 > EMA50 with some directional strength
  if (lastClose > ema21 && ema21 > ema50 && strength > 20) {
    regime = regimes.TRENDING_UP;
    confidence = Math.min(95, 60 + strength);
  }

  // TRENDING DOWN: price < EMA21 < EMA50 with some directional strength
  if (lastClose < ema21 && ema21 < ema50 && strength > 20) {
    regime = regimes.TRENDING_DOWN;
    confidence = Math.min(95, 60 + strength);
  }

  return { regime, confidence, volatility: vol, compression: comp };
}

module.exports = { classifyRegime };