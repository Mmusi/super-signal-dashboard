// Regime Scorer - wraps classifier output as numeric score
const { classifyRegime } = require("./RegimeClassifier");

function scoreRegime(candles) {
  const result = classifyRegime(candles);
  return {
    regime: result.regime,
    confidence: result.confidence,
    score: result.confidence || 0
  };
}

module.exports = { scoreRegime };
