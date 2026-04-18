// System Health Scorer - formula from blueprint
// Health = (WinRate * 0.4) + (ProfitFactor * 0.3) + (RegimeStability * 0.2) + (LiquidityEdge * 0.1)
function calculateSystemHealth({ winRate, profitFactor, regimeStability, liquidityEdge }) {
  const score =
    (winRate         * 0.4) +
    (profitFactor    * 0.3) +
    (regimeStability * 0.2) +
    (liquidityEdge   * 0.1);

  let status = "STRONG";
  if (score < 60) status = "NEUTRAL";
  if (score < 40) status = "WEAK";

  return { score: +score.toFixed(1), status };
}

module.exports = { calculateSystemHealth };
