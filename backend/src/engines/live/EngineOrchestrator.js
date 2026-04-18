// Engine Orchestrator - connects Binance feed → Live Brain → Signal Router
// Real-time pipe: every new candle triggers full intelligence pipeline
const { startMarketFeed, seedHistoricalData } = require("../../data/binance/marketFeed");
const { runLiveBrain } = require("./LiveBrain");
const { routeSignal } = require("./SignalRouter");
const { updateScan } = require("../ScannerEngine");

async function startEngine() {
  console.log("🧠 SUPER SIGNAL ENGINE STARTING...");

  // Seed historical data first so engines have enough candles
  await seedHistoricalData();

  startMarketFeed((data) => {
    const result = runLiveBrain(data.symbol, data.candles);
    if (!result) return;

    // Update scanner for all signals
    updateScan(data.symbol, data.candles);

    const { signal } = result;

    // Only route actionable signals
    if (signal && signal.action !== "NO_TRADE") {
      console.log(`\n🔥 SIGNAL | ${result.symbol} | ${signal.action} ${signal.direction || ""} | Score: ${signal.score}`);
      console.log(`   Regime: ${result.regime} | ATR: ${result.context.volatility.atr?.toFixed(4)}`);

      routeSignal(result);
    }
  });
}

module.exports = { startEngine };
