// Regime Performance Matrix - win rate breakdown by market regime
function buildRegimeMatrix(trades) {
  const map = {};

  trades.forEach((t) => {
    const r = t.regime || "UNKNOWN";
    if (!map[r]) map[r] = { wins: 0, total: 0 };
    map[r].total += 1;
    if (t.result === "WIN") map[r].wins += 1;
  });

  const result = {};
  Object.entries(map).forEach(([regime, val]) => {
    result[regime] = {
      winRate: val.total > 0 ? +((val.wins / val.total) * 100).toFixed(1) : 0,
      trades:  val.total
    };
  });

  return result;
}

module.exports = { buildRegimeMatrix };
