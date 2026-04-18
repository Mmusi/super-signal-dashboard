// Market Feed Orchestrator - streams live 1m candles for all tracked symbols
// Bridge: Binance WS → CandleBuilder → Brain Engines
const { createWS } = require("./wsClient");
const { getKlines } = require("./restClient");
const candleBuilder = require("./candleBuilder");

const symbols = ["btcusdt", "ethusdt", "solusdt", "avaxusdt", "linkusdt", "arbusdt"];

async function seedHistoricalData() {
  console.log("📥 Seeding historical candles...");
  for (const symbol of symbols) {
    try {
      const candles = await getKlines(symbol.toUpperCase(), "1m", 200);
      candleBuilder.seed(symbol.toUpperCase(), candles);
      console.log(`✅ Seeded ${symbol.toUpperCase()}: ${candles.length} candles`);
    } catch (err) {
      console.error(`Seed error for ${symbol}:`, err.message);
    }
  }
}

function startMarketFeed(onUpdate) {
  symbols.forEach((symbol) => {
    const url = `wss://stream.binance.com:9443/ws/${symbol}@kline_1m`;

    createWS(url, (data) => {
      if (!data.k) return;

      candleBuilder.update(symbol.toUpperCase(), data.k);

      const candles = candleBuilder.get(symbol.toUpperCase());
      if (candles.length < 50) return;

      onUpdate({
        symbol: symbol.toUpperCase(),
        candles
      });
    });
  });
}

module.exports = { startMarketFeed, seedHistoricalData, symbols };
