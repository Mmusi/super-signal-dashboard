// Strategy Fit Score - determines which strategy best fits current market conditions
const regimeTypes = require("../regime/regimeTypes");

function strategyFitScore(regime, liquidity, orderflow) {
  const fits = [];

  if (regime.type === regimeTypes.COMPRESSION) {
    fits.push({ strategy: "COMPRESSION_BREAKOUT", score: 85 });
  }

  if (liquidity && liquidity.stopHunt) {
    fits.push({ strategy: "LIQUIDITY_SWEEP_REVERSAL", score: 90 });
  }

  if (regime.type === regimeTypes.TRENDING_UP || regime.type === regimeTypes.TRENDING_DOWN) {
    fits.push({ strategy: "TREND_CONTINUATION", score: 70 });
  }

  if (fits.length === 0) {
    fits.push({ strategy: "NO_TRADE", score: 0 });
  }

  // return best fit
  fits.sort((a, b) => b.score - a.score);
  return fits[0];
}

module.exports = { strategyFitScore };
