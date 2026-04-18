// Order Flow Engine - combines delta + volume pressure + momentum direction
// Output: BUYERS_IN_CONTROL | SELLERS_IN_CONTROL | NEUTRAL
const { calculateDelta } = require("./DeltaEngine");

function analyzeOrderFlow(candles) {
  const delta = calculateDelta(candles);
  const last = candles.at(-1);

  let bias = "NEUTRAL";

  if (delta > 0 && last.close > last.open) {
    bias = "BUYERS_IN_CONTROL";
  }

  if (delta < 0 && last.close < last.open) {
    bias = "SELLERS_IN_CONTROL";
  }

  return { delta, bias };
}

module.exports = { analyzeOrderFlow };
