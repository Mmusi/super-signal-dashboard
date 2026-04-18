// runBacktest.js - CLI runner for backtesting all symbols
require("dotenv").config({ path: "../backend/.env" });
const { runBacktest }    = require("../backend/src/backtest/BacktestEngine");
const { generateReport } = require("../backend/src/backtest/ReportGenerator");
const { SYMBOLS }        = require("../backend/src/config/assets");

const target = process.argv[2]; // optional: node runBacktest.js BTCUSDT
const list   = target ? [target.toUpperCase()] : SYMBOLS;

console.log("\n🧪 SUPER SIGNAL — BACKTEST ENGINE\n");
console.log(`📋 Running backtest for: ${list.join(", ")}\n`);

const reports = [];
for (const symbol of list) {
  const stats  = runBacktest(symbol);
  if (stats) {
    const report = generateReport(stats, symbol);
    reports.push(report);
  }
}

// Summary table
console.log("\n📊 FINAL SUMMARY");
console.log("═══════════════════════════════════════════════");
reports.forEach(r => {
  if (!r || !r.summary) return;
  const { totalTrades, wins, losses, winRate } = r.summary;
  console.log(`${r.symbol.padEnd(12)} | Trades: ${String(totalTrades).padEnd(5)} | W: ${String(wins).padEnd(4)} | L: ${String(losses).padEnd(4)} | WR: ${winRate}`);
});
console.log("═══════════════════════════════════════════════\n");
