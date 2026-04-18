// Engine Orchestrator - connects Binance feed → Live Brain → Signal Router
// Real-time pipe: every new candle triggers full intelligence pipeline
const { startMarketFeed, seedHistoricalData } = require("../../data/binance/marketFeed");
const { startHeatmapStream }                  = require("../../data/binance/orderBook");
const { runLiveBrain }                        = require("./LiveBrain");
const { routeSignal }                         = require("./SignalRouter");
const { updateScan, getAllSignals }            = require("../ScannerEngine");

async function startEngine(broadcaster) {
  console.log("🧠 SUPER SIGNAL ENGINE STARTING...");

  await seedHistoricalData();

  // Start heatmap order book stream (BTCUSDT as primary liquidity view)
  startHeatmapStream("BTCUSDT", (msg) => {
    if (broadcaster) broadcaster.broadcast(msg);
  });

  startMarketFeed((data) => {
    const result = runLiveBrain(data.symbol, data.candles);
    if (!result) return;

    updateScan(data.symbol, data.candles);

    // Broadcast all signals + candles on every tick so dashboard stays live
    if (broadcaster) {
      broadcaster.broadcast({ type: "SCANNER_UPDATE", data: getAllSignals() });
      broadcaster.broadcast({ type: "CANDLES_UPDATE", symbol: data.symbol, data: data.candles.slice(-100) });
    }

    const { signal } = result;

    if (signal && signal.action !== "NO_TRADE") {
      console.log(`\n🔥 SIGNAL | ${result.symbol} | ${signal.action} ${signal.direction || ""} | Score: ${signal.score}`);
      console.log(`   Regime: ${result.regime} | ATR: ${result.context.volatility.atr?.toFixed(4)}`);
      routeSignal(result);
    }
  });
}

module.exports = { startEngine };