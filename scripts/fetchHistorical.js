// fetchHistorical.js - downloads 1000 candles of 1m data per symbol for backtesting
require("dotenv").config({ path: "../backend/.env" });
const { getKlines }  = require("../backend/src/data/binance/restClient");
const { saveData }   = require("../backend/src/backtest/DataLoader");
const { SYMBOLS }    = require("../backend/src/config/assets");

async function fetchAll() {
  console.log("📥 Downloading historical data for backtesting...\n");

  for (const symbol of SYMBOLS) {
    console.log(`  Fetching ${symbol}...`);
    const candles = await getKlines(symbol, "1m", 1000);
    if (candles.length > 0) {
      saveData(symbol, candles);
    } else {
      console.warn(`  ⚠️  No data returned for ${symbol}`);
    }
    await new Promise(r => setTimeout(r, 500)); // polite rate limit
  }

  console.log("\n✅ Historical data ready — run backtest with: node scripts/runBacktest.js");
}

fetchAll();
