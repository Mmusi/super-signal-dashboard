// Risk Rules - hard rules that block trade execution
// Risk Engine ALWAYS runs first - no bypass possible

function evaluateRisk({ score, regime, accountBalance, maxDrawdown, killSwitch }) {
  if (killSwitch) {
    return { allowed: false, reason: "KILL_SWITCH_ACTIVE" };
  }

  if (score < 75) {
    return { allowed: false, reason: "SCORE_TOO_LOW" };
  }

  if (regime === "CHOP") {
    return { allowed: false, reason: "CHOP_REGIME_FILTERED" };
  }

  if (accountBalance <= 0) {
    return { allowed: false, reason: "INSUFFICIENT_BALANCE" };
  }

  if (maxDrawdown && maxDrawdown > 0.15) {
    return { allowed: false, reason: "MAX_DRAWDOWN_EXCEEDED" };
  }

  return { allowed: true, reason: "ALL_RULES_PASSED" };
}

module.exports = { evaluateRisk };
