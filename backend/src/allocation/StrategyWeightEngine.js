// Strategy Weight Engine - calculates capital weight for each strategy
// Inputs: win rate, avgR, health score, regime fit, drawdown penalty
function calculateWeight(strategy, currentRegime) {
  let weight = 0;

  // Base performance
  weight += strategy.winRate  * 50;
  weight += strategy.avgR     * 20;

  // Health adjustment
  weight += (strategy.healthScore || 50) * 0.3;

  // Regime fit (VERY IMPORTANT — capital flows to where edge is)
  const regimeFit = strategy.regimePerformance?.[currentRegime] || 0.5;
  weight += regimeFit * 40;

  // Penalty for recent drawdown
  weight -= (strategy.drawdown || 0) * 100;

  return Math.max(0, weight);
}

module.exports = { calculateWeight };
