// Regime Allocator - multiplies capital weights based on current market regime
// CHOP = reduce | TREND = increase | EXPANSION = maximum
function adjustForRegime(weights, regime) {
  const adjusted = {};

  Object.entries(weights).forEach(([name, weight]) => {
    let multiplier = 1;

    if (regime === "CHOP")      multiplier = 0.6;
    if (regime === "TREND")     multiplier = 1.2;
    if (regime === "EXPANSION") multiplier = 1.4;

    adjusted[name] = weight * multiplier;
  });

  return adjusted;
}

module.exports = { adjustForRegime };
