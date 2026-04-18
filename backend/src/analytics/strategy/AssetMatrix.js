// Asset Matrix - performance breakdown per traded asset
function buildAssetMatrix(trades) {
  const map = {};

  trades.forEach((t) => {
    const a = t.asset || "UNKNOWN";
    if (!map[a]) map[a] = { wins: 0, total: 0, pnl: 0 };
    map[a].total += 1;
    map[a].pnl   += (t.pnl || 0);
    if (t.result === "WIN") map[a].wins += 1;
  });

  const result = {};
  Object.entries(map).forEach(([asset, val]) => {
    result[asset] = {
      winRate: val.total > 0 ? +((val.wins / val.total) * 100).toFixed(1) : 0,
      pnl:    +val.pnl.toFixed(2),
      trades: val.total
    };
  });

  return result;
}

module.exports = { buildAssetMatrix };
