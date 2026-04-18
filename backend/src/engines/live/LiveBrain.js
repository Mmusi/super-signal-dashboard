// Live Brain - central nervous system: candles → context → signal
const { buildContext } = require("./ContextBuilder");
const { runSignalBrain } = require("../SignalEngine");

function runLiveBrain(symbol, candles) {
  const context = buildContext(symbol, candles);
  if (!context) return null;

  const signal = runSignalBrain(context);

  return {
    symbol,
    timestamp: Date.now(),
    context,
    signal: signal.signal,
    tradePlan: signal.tradePlan,
    regime: context.regime.type
  };
}

module.exports = { runLiveBrain };
