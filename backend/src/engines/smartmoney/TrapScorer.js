// Trap Scorer - scores whether a setup is a trap or valid breakout
function scoreTrap(sweeps) {
  let score = 0;

  sweeps.forEach(s => {
    if (s.absorption)          score += 50;
    if (s.type.includes("SWEEP")) score += 30;
  });

  return {
    trapScore: score,
    isTrap:    score >= 60
  };
}

module.exports = { scoreTrap };
