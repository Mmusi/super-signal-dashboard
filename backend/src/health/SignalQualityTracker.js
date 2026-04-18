// Signal Quality Tracker - measures how "clean" signals are over recent history
// Quality = % of high-score signals (>=80) that actually won
function trackSignalQuality(trades) {
  const recent = trades.slice(-50);
  if (recent.length === 0) return { signalQuality: 0, totalSignals: 0 };

  let good  = 0;
  const total = recent.length;

  recent.forEach(t => {
    if (t.score >= 80 && t.result === "WIN") good++;
  });

  return {
    signalQuality: +((good / total) * 100).toFixed(1),
    totalSignals:  total
  };
}

module.exports = { trackSignalQuality };
