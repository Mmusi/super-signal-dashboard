// Trade Repository - data access layer for trade events
// Stores and retrieves all trades with full decision context
const db   = require("./db");
const { v4: uuidv4 } = require("uuid");

function insertTrade(trade) {
  const id   = uuidv4();
  const stmt = `
    INSERT INTO trades (
      id, asset, direction,
      entry_price, exit_price,
      entry_time, exit_time,
      pnl, r_multiple,
      result, setup_type, regime,
      liquidity_sweep, absorption,
      orderflow_bias, score,
      sl, tp
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(stmt, [
    id,
    trade.asset       || trade.symbol,
    trade.direction,
    trade.entry_price || trade.entry,
    trade.exit_price  || trade.exit,
    trade.entry_time  || Date.now(),
    trade.exit_time   || Date.now(),
    trade.pnl         || 0,
    trade.r_multiple  || 0,
    trade.result,
    trade.setup_type  || "UNKNOWN",
    trade.regime,
    trade.liquidity_sweep ? 1 : 0,
    trade.absorption      ? 1 : 0,
    trade.orderflow_bias  || "NEUTRAL",
    trade.score           || 0,
    trade.sl,
    trade.tp
  ], (err) => {
    if (err) console.error("Insert trade error:", err.message);
  });

  return id;
}

function getAllTrades(callback) {
  db.all("SELECT * FROM trades ORDER BY entry_time DESC", [], (err, rows) => {
    if (err) { callback([]); return; }
    callback(rows);
  });
}

function getTradesByAsset(asset, callback) {
  db.all("SELECT * FROM trades WHERE asset = ? ORDER BY entry_time DESC", [asset], (err, rows) => {
    callback(err ? [] : rows);
  });
}

function getRecentTrades(limit = 50, callback) {
  db.all(`SELECT * FROM trades ORDER BY entry_time DESC LIMIT ?`, [limit], (err, rows) => {
    callback(err ? [] : rows);
  });
}

module.exports = { insertTrade, getAllTrades, getTradesByAsset, getRecentTrades };
