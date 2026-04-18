// Data Loader - loads historical OHLCV data from JSON files for backtesting
const fs   = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "..", "data", "historical");

function loadData(symbol) {
  const filePath = path.join(DATA_DIR, `${symbol}.json`);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  No historical data for ${symbol}. Run scripts/fetchHistorical.js first.`);
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function saveData(symbol, data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(
    path.join(DATA_DIR, `${symbol}.json`),
    JSON.stringify(data, null, 2)
  );
  console.log(`💾 Saved ${data.length} candles for ${symbol}`);
}

module.exports = { loadData, saveData };
