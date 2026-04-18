// Signal Engine - FINAL DECISION MAKER
// Rules: ≥85 = STRONG TRADE | 75-84 = WATCH | 60-74 = WEAK | <60 = NO_TRADE
const { calculateConfluence } = require("../core/scoring/ConfluenceEngine");
const { buildEntry } = require("./EntryEngine");

function generateSignal(data) {
  const score = calculateConfluence(data);

  let signal = {
    action:    "NO_TRADE",
    direction: null,
    confidence: score,
    score
  };

  // STRONG TRADE
  if (score >= 85) {
    signal.action = "TRADE";

    if (data.regime.type === "TRENDING_UP" || data.regime.type === "COMPRESSION") {
      signal.direction = "LONG";
    }
    if (data.regime.type === "TRENDING_DOWN") {
      signal.direction = "SHORT";
    }
    // Liquidity sweep determines direction when regime alone is ambiguous
    if (data.liquidity && data.stopHunt) {
      if (data.stopHunt.signal === "BULLISH_REVERSAL") signal.direction = "LONG";
      if (data.stopHunt.signal === "BEARISH_REVERSAL") signal.direction = "SHORT";
    }
  }
  // WATCH MODE
  else if (score >= 75) {
    signal.action = "WATCH";
  }
  // NO TRADE
  else {
    signal.action = "NO_TRADE";
  }

  return { ...signal, score };
}

function runSignalBrain(context) {
  const signal = generateSignal(context);

  const tradePlan = buildEntry(
    signal,
    context.structure,
    context.liquidity,
    context.volatility.atr
  );

  return {
    asset:     context.asset,
    signal:    { ...signal, tradePlan },
    tradePlan,
    regime:    context.regime.type,
    context
  };
}

module.exports = { generateSignal, runSignalBrain };
