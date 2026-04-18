// Exit Engine - manages trade exit logic (trailing stop, partial take profit)
function buildExitPlan(entry, sl, tp, direction) {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rr = risk > 0 ? reward / risk : 0;

  return {
    entry,
    stopLoss: sl,
    takeProfit: tp,
    riskReward: parseFloat(rr.toFixed(2)),
    partialTP: direction === "LONG" ? entry + risk * 1.0 : entry - risk * 1.0
  };
}

module.exports = { buildExitPlan };
