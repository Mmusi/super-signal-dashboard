// Signal Ranker - ranks multiple asset signals, returns top opportunities
function rankSignals(signals) {
  return signals
    .filter(s => s.signal && s.signal.action !== "NO_TRADE")
    .sort((a, b) => (b.signal.score || 0) - (a.signal.score || 0))
    .slice(0, 3); // top 3 only
}

module.exports = { rankSignals };
