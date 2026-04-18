// Liquidity Edge Matrix - compares win rates: sweep vs no-sweep setups
function buildLiquidityMatrix(trades) {
  const sweep   = { wins: 0, total: 0 };
  const noSweep = { wins: 0, total: 0 };

  trades.forEach((t) => {
    const bucket = t.liquidity_sweep ? sweep : noSweep;
    bucket.total += 1;
    if (t.result === "WIN") bucket.wins += 1;
  });

  return {
    sweep: {
      winRate: sweep.total   > 0 ? +((sweep.wins   / sweep.total)   * 100).toFixed(1) : 0,
      trades:  sweep.total
    },
    noSweep: {
      winRate: noSweep.total > 0 ? +((noSweep.wins / noSweep.total) * 100).toFixed(1) : 0,
      trades:  noSweep.total
    }
  };
}

module.exports = { buildLiquidityMatrix };
