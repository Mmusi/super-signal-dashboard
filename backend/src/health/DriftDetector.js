// Drift Detector - combines decay + quality + mismatch into health score
// Penalizes: win rate decay >10% | signal quality <60% | HIGH mismatch risk
const { detectDecay }     = require("./PerformanceDecayAnalyzer");
const { trackSignalQuality } = require("./SignalQualityTracker");
const { detectMismatch }  = require("./RegimeMismatchDetector");

function detectDrift(trades) {
  if (!trades || trades.length < 5) {
    return {
      healthScore: 100,
      status:      "STABLE",
      decay:       { earlyWinRate: 0, recentWinRate: 0, decay: 0 },
      quality:     { signalQuality: 100, totalSignals: 0 },
      mismatch:    { mismatches: 0, riskLevel: "LOW" }
    };
  }

  const decay    = detectDecay(trades);
  const quality  = trackSignalQuality(trades);
  const mismatch = detectMismatch(trades);

  let score = 100;

  // Penalize degradation
  if (decay.decay    > 10)       score -= 30;
  if (quality.signalQuality < 60) score -= 30;
  if (mismatch.riskLevel === "HIGH")   score -= 25;
  if (mismatch.riskLevel === "MEDIUM") score -= 10;

  score = Math.max(0, score);

  let status = "STABLE";
  if (score < 70) status = "WEAKENING";
  if (score < 50) status = "DEGRADED";
  if (score < 35) status = "CRITICAL";

  return { healthScore: score, status, decay, quality, mismatch };
}

module.exports = { detectDrift };
