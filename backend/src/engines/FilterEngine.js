// Filter Engine - validates signals, enforces NO_TRADE rules
// Critical: CHOP regime = NO TRADE. Score < 75 = NO TRADE.

function filterSignal(signal, regime, blockedAssets = []) {
  if (!signal) return { pass: false, reason: "NULL_SIGNAL" };

  if (blockedAssets.includes(signal.asset)) {
    return { pass: false, reason: "ASSET_BLOCKED" };
  }

  if (regime === "CHOP") {
    return { pass: false, reason: "CHOP_REGIME" };
  }

  if (!signal.score || signal.score < 75) {
    return { pass: false, reason: "SCORE_BELOW_THRESHOLD" };
  }

  if (signal.action === "NO_TRADE") {
    return { pass: false, reason: "NO_TRADE_FLAG" };
  }

  return { pass: true, reason: "SIGNAL_VALID" };
}

module.exports = { filterSignal };
