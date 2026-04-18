// Portfolio Allocator - MAIN CAPITAL ALLOCATION ENGINE
// Dynamically allocates capital across strategies based on performance + regime
const { calculateWeight }      = require("./StrategyWeightEngine");
const { adjustForRegime }      = require("./RegimeAllocator");
const { normalize }            = require("./RiskBudgetManager");
const { distributeCapital }    = require("./CapitalDistributionModel");

// Default strategy registry — updated by performance analytics
const DEFAULT_STRATEGIES = [
  {
    name:    "COMPRESSION_BREAKOUT",
    winRate: 0.65,
    avgR:    1.3,
    drawdown: 0.1,
    healthScore: 70,
    regimePerformance: { COMPRESSION: 0.80, EXPANSION: 0.70, TREND: 0.55, CHOP: 0.30 }
  },
  {
    name:    "LIQUIDITY_SWEEP_REVERSAL",
    winRate: 0.72,
    avgR:    1.8,
    drawdown: 0.08,
    healthScore: 80,
    regimePerformance: { COMPRESSION: 0.65, EXPANSION: 0.75, TREND: 0.60, CHOP: 0.55 }
  },
  {
    name:    "TREND_CONTINUATION",
    winRate: 0.58,
    avgR:    1.2,
    drawdown: 0.12,
    healthScore: 60,
    regimePerformance: { COMPRESSION: 0.40, EXPANSION: 0.65, TREND: 0.78, CHOP: 0.25 }
  }
];

function allocatePortfolio(strategies = DEFAULT_STRATEGIES, currentRegime, totalCapital) {
  // 1. Calculate raw weights per strategy
  const rawWeights = {};
  strategies.forEach((s) => {
    rawWeights[s.name] = calculateWeight(s, currentRegime);
  });

  // 2. Adjust for regime
  const regimeAdjusted = adjustForRegime(rawWeights, currentRegime);

  // 3. Normalize risk to 100%
  const normalized = normalize(regimeAdjusted, 1.0);

  // 4. Convert to capital amounts
  return distributeCapital(normalized, totalCapital);
}

module.exports = { allocatePortfolio, DEFAULT_STRATEGIES };
