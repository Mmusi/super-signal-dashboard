// Regime Mismatch Detector - detects when strategy is used in wrong market conditions
// Key insight: CHOP losses + trend mean_reversion = regime mismatch
function detectMismatch(trades) {
  let mismatches = 0;

  trades.forEach(t => {
    // Trading in CHOP = mismatch
    if (t.regime === "CHOP" && t.result === "LOSS") mismatches++;

    // Mean reversion in TREND = mismatch
    if (t.regime === "TREND" && t.setup_type === "mean_reversion") mismatches++;

    // Trend following in COMPRESSION = mismatch
    if (t.regime === "COMPRESSION" && t.setup_type === "TREND_CONTINUATION" && t.result === "LOSS") {
      mismatches++;
    }
  });

  return {
    mismatches,
    riskLevel: mismatches > 10 ? "HIGH" : mismatches > 5 ? "MEDIUM" : "LOW"
  };
}

module.exports = { detectMismatch };
