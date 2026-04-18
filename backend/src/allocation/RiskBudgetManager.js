// Risk Budget Manager - normalizes weights so total allocation = maxRisk (1.0 = 100%)
// Prevents over-allocation to any single strategy
function normalize(weights, maxRisk = 1.0) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return weights;

  const normalized = {};
  Object.entries(weights).forEach(([k, v]) => {
    normalized[k] = (v / total) * maxRisk;
  });

  return normalized;
}

module.exports = { normalize };
