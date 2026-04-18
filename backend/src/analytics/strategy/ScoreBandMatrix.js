// Score Band Matrix - validates whether signal scoring system is calibrated
// Key insight: if 90+ score doesn't outperform 80+ → scoring system needs tuning
function buildScoreMatrix(trades) {
  const bands = {
    "90-100": { wins: 0, total: 0 },
    "80-89":  { wins: 0, total: 0 },
    "<80":    { wins: 0, total: 0 }
  };

  trades.forEach((t) => {
    let band = "<80";
    if      (t.score >= 90) band = "90-100";
    else if (t.score >= 80) band = "80-89";

    bands[band].total += 1;
    if (t.result === "WIN") bands[band].wins += 1;
  });

  const result = {};
  Object.entries(bands).forEach(([k, v]) => {
    result[k] = {
      winRate: v.total > 0 ? +((v.wins / v.total) * 100).toFixed(1) : 0,
      trades:  v.total
    };
  });

  return result;
}

module.exports = { buildScoreMatrix };
