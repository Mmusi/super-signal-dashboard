// Signal Formatter - standardizes signal output format for dashboard + Telegram
function formatSignal(result) {
  if (!result) return null;

  const { asset, signal, tradePlan, context } = result;

  return {
    asset: asset || result.symbol,
    action:    signal.action,
    direction: signal.direction,
    score:     signal.score || signal.confidence,
    regime:    context ? context.regime.type : result.regime,
    entry:     tradePlan ? tradePlan.entry     : null,
    sl:        tradePlan ? tradePlan.stopLoss  : null,
    tp:        tradePlan ? tradePlan.takeProfit: null,
    timestamp: Date.now()
  };
}

module.exports = { formatSignal };
