// Backtest Engine - plugs LIVE system into historical data for strategy validation
// Reuses the exact same LiveBrain as production → no code duplication
const { loadData }           = require("./DataLoader");
const { replayCandles }      = require("./ReplayEngine");
const { runLiveBrain }       = require("../engines/live/LiveBrain");
const { TradeSimulator }     = require("./TradeSimulator");
const { PerformanceTracker } = require("./PerformanceTracker");

function runBacktest(symbol) {
  console.log(`\n🧪 Running backtest for ${symbol}...`);
  const data = loadData(symbol);

  if (!data || data.length === 0) {
    console.error(`No data for ${symbol}. Fetch historical data first.`);
    return null;
  }

  const tracker   = new PerformanceTracker();
  const simulator = new TradeSimulator(tracker);

  let signalCount = 0;

  replayCandles(data, (candles) => {
    if (candles.length < 50) return;

    const result = runLiveBrain(symbol, candles);

    if (result && result.signal && result.signal.action === "TRADE") {
      signalCount++;
      simulator.executeTrade(result, candles);
    }
  });

  console.log(`\n📌 Signals generated: ${signalCount}`);
  tracker.printReport();

  return tracker.getStats();
}

module.exports = { runBacktest };
