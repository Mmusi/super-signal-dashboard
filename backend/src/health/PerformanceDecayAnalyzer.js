// Performance Decay Analyzer - compares first-half vs second-half win rates
// Early detection: strategy breaking down before financial damage accumulates
function detectDecay(trades) {
  if (!trades || trades.length < 10) {
    return { earlyWinRate: 0, recentWinRate: 0, decay: 0 };
  }

  const mid       = Math.floor(trades.length / 2);
  const firstHalf = trades.slice(0, mid);
  const secondHalf= trades.slice(mid);

  const avgWinRate = (set) => {
    if (set.length === 0) return 0;
    const wins = set.filter(t => t.result === "WIN").length;
    return (wins / set.length) * 100;
  };

  const early  = +avgWinRate(firstHalf).toFixed(1);
  const recent = +avgWinRate(secondHalf).toFixed(1);

  return {
    earlyWinRate:  early,
    recentWinRate: recent,
    decay:         +(early - recent).toFixed(1)
  };
}

module.exports = { detectDecay };
