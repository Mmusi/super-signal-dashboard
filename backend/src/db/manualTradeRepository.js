// manualTradeRepository.js
// Data access for YOUR real trade entries - amount, leverage, SL/TP, actual P&L
// Everything saved to SQLite - never localStorage
const db   = require("./db");
const { v4: uuidv4 } = require("uuid");

// ── Schema init (called once at startup) ────────────────────────────────────
function initManualTrades() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS manual_trades (
      id              TEXT PRIMARY KEY,
      source          TEXT DEFAULT 'MANUAL',
      signal_asset    TEXT,
      signal_score    INTEGER,
      regime          TEXT,
      setup_type      TEXT,
      direction       TEXT NOT NULL,
      entry_price     REAL NOT NULL,
      amount_usdt     REAL NOT NULL,
      leverage        INTEGER DEFAULT 1,
      stop_loss       REAL NOT NULL,
      take_profit     REAL NOT NULL,
      position_size   REAL,
      risk_amount     REAL,
      potential_profit REAL,
      status          TEXT DEFAULT 'OPEN',
      exit_price      REAL,
      exit_reason     TEXT,
      pnl_usdt        REAL,
      pnl_pct         REAL,
      opened_at       INTEGER NOT NULL,
      closed_at       INTEGER,
      liquidity_sweep INTEGER DEFAULT 0,
      absorption      INTEGER DEFAULT 0,
      orderflow_bias  TEXT,
      notes           TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mt_asset  ON manual_trades(signal_asset);
    CREATE INDEX IF NOT EXISTS idx_mt_status ON manual_trades(status);
    CREATE INDEX IF NOT EXISTS idx_mt_opened ON manual_trades(opened_at);
  `, (err) => {
    if (err && !err.message.includes("already exists")) {
      console.error("Manual trades table init error:", err.message);
    } else {
      console.log("🟢 Manual trades table ready");
    }
  });
}

// ── Open a new trade ────────────────────────────────────────────────────────
function openTrade(trade) {
  const id = uuidv4();

  // Compute derived fields
  const positionSize   = (trade.amount_usdt || 0) * (trade.leverage || 1);
  const riskPerUnit    = Math.abs(trade.entry_price - trade.stop_loss);
  const rewardPerUnit  = Math.abs(trade.take_profit - trade.entry_price);
  const riskAmount     = (positionSize / trade.entry_price) * riskPerUnit;
  const potentialProfit= (positionSize / trade.entry_price) * rewardPerUnit;

  const stmt = `
    INSERT INTO manual_trades (
      id, source, signal_asset, signal_score, regime, setup_type,
      direction, entry_price, amount_usdt, leverage,
      stop_loss, take_profit,
      position_size, risk_amount, potential_profit,
      status, opened_at,
      liquidity_sweep, absorption, orderflow_bias, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  return new Promise((resolve, reject) => {
    db.run(stmt, [
      id,
      trade.source          || "MANUAL",
      trade.signal_asset    || trade.asset,
      trade.signal_score    || 0,
      trade.regime          || null,
      trade.setup_type      || "MANUAL",
      trade.direction,
      trade.entry_price,
      trade.amount_usdt,
      trade.leverage        || 1,
      trade.stop_loss,
      trade.take_profit,
      positionSize,
      parseFloat(riskAmount.toFixed(4)),
      parseFloat(potentialProfit.toFixed(4)),
      "OPEN",
      Date.now(),
      trade.liquidity_sweep ? 1 : 0,
      trade.absorption      ? 1 : 0,
      trade.orderflow_bias  || null,
      trade.notes           || null,
    ], function(err) {
      if (err) { console.error("openTrade error:", err.message); reject(err); return; }
      resolve(id);
    });
  });
}

// ── Close a trade ────────────────────────────────────────────────────────────
function closeTrade(id, exitPrice, exitReason = "MANUAL_CLOSE", notes = null) {
  return new Promise((resolve, reject) => {
    // First get the trade to compute P&L
    db.get("SELECT * FROM manual_trades WHERE id = ?", [id], (err, trade) => {
      if (err || !trade) { reject(err || new Error("Trade not found")); return; }

      const positionSize = trade.position_size || (trade.amount_usdt * trade.leverage);
      const units        = positionSize / trade.entry_price;
      let pnlUsdt;

      if (trade.direction === "LONG") {
        pnlUsdt = units * (exitPrice - trade.entry_price);
      } else {
        pnlUsdt = units * (trade.entry_price - exitPrice);
      }

      const pnlPct = (pnlUsdt / trade.amount_usdt) * 100;

      db.run(`
        UPDATE manual_trades
        SET status='CLOSED', exit_price=?, exit_reason=?, pnl_usdt=?, pnl_pct=?, closed_at=?, notes=COALESCE(?,notes)
        WHERE id=?
      `, [
        exitPrice,
        exitReason,
        parseFloat(pnlUsdt.toFixed(4)),
        parseFloat(pnlPct.toFixed(4)),
        Date.now(),
        notes,
        id,
      ], function(err2) {
        if (err2) { reject(err2); return; }
        resolve({ id, pnlUsdt, pnlPct, exitPrice, exitReason });
      });
    });
  });
}

// ── Get trades ───────────────────────────────────────────────────────────────
function getOpenTrades(callback) {
  db.all("SELECT * FROM manual_trades WHERE status='OPEN' ORDER BY opened_at DESC", [], (err, rows) => {
    callback(err ? [] : rows);
  });
}

function getAllManualTrades(limit = 100, callback) {
  db.all("SELECT * FROM manual_trades ORDER BY opened_at DESC LIMIT ?", [limit], (err, rows) => {
    callback(err ? [] : rows);
  });
}

function getTradeById(id, callback) {
  db.get("SELECT * FROM manual_trades WHERE id = ?", [id], (err, row) => {
    callback(err ? null : row);
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function getTradeStats(callback) {
  db.all(`
    SELECT
      COUNT(*)                                           AS total,
      SUM(CASE WHEN status='OPEN' THEN 1 ELSE 0 END)   AS open_count,
      SUM(CASE WHEN status='CLOSED' THEN 1 ELSE 0 END) AS closed_count,
      SUM(CASE WHEN pnl_usdt > 0 THEN 1 ELSE 0 END)    AS wins,
      SUM(CASE WHEN pnl_usdt < 0 THEN 1 ELSE 0 END)    AS losses,
      SUM(COALESCE(pnl_usdt, 0))                        AS total_pnl,
      AVG(CASE WHEN pnl_usdt IS NOT NULL THEN pnl_pct END) AS avg_pnl_pct
    FROM manual_trades
  `, [], (err, rows) => {
    if (err || !rows || !rows[0]) { callback({}); return; }
    const s = rows[0];
    const total = s.closed_count || 0;
    callback({
      total:       s.total        || 0,
      openCount:   s.open_count   || 0,
      closedCount: s.closed_count || 0,
      wins:        s.wins         || 0,
      losses:      s.losses       || 0,
      totalPnl:    parseFloat((s.total_pnl || 0).toFixed(2)),
      avgPnlPct:   parseFloat((s.avg_pnl_pct || 0).toFixed(2)),
      winRate:     total > 0 ? parseFloat(((s.wins / total) * 100).toFixed(1)) : 0,
    });
  });
}

module.exports = { initManualTrades, openTrade, closeTrade, getOpenTrades, getAllManualTrades, getTradeById, getTradeStats };

// ── Migration: add BingX columns if they don't exist (safe, idempotent) ──────
function migrateBingXColumns() {
  const cols = [
    "ALTER TABLE manual_trades ADD COLUMN bingx_order_id TEXT",
    "ALTER TABLE manual_trades ADD COLUMN bingx_sl_order_id TEXT",
    "ALTER TABLE manual_trades ADD COLUMN bingx_tp_order_id TEXT",
    "ALTER TABLE manual_trades ADD COLUMN entry_fee_usdt REAL DEFAULT 0",
    "ALTER TABLE manual_trades ADD COLUMN exit_fee_usdt REAL DEFAULT 0",
    "ALTER TABLE manual_trades ADD COLUMN funding_fee_usdt REAL DEFAULT 0",
    "ALTER TABLE manual_trades ADD COLUMN total_fees_usdt REAL DEFAULT 0",
    "ALTER TABLE manual_trades ADD COLUMN net_pnl_usdt REAL",
    "ALTER TABLE manual_trades ADD COLUMN exchange TEXT DEFAULT 'MANUAL'",
    "ALTER TABLE manual_trades ADD COLUMN quantity REAL",
    "ALTER TABLE manual_trades ADD COLUMN exit_reason TEXT",
  ];
  cols.forEach(sql => {
    db.run(sql, err => {
      // Ignore "duplicate column" errors — expected on second run
      if (err && !err.message.includes("duplicate column")) {
        console.warn("Migration warning:", err.message);
      }
    });
  });
}

// ── Update trade with BingX execution details ─────────────────────────────────
function attachBingXDetails(id, details) {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE manual_trades SET
        bingx_order_id    = ?,
        bingx_sl_order_id = ?,
        bingx_tp_order_id = ?,
        entry_fee_usdt    = ?,
        quantity          = ?,
        exchange          = 'BINGX'
      WHERE id = ?
    `, [
      details.orderId      || null,
      details.slOrderId    || null,
      details.tpOrderId    || null,
      details.entryFee     || 0,
      details.quantity     || null,
      id,
    ], err => err ? reject(err) : resolve());
  });
}

// ── Update trade close with fee details ───────────────────────────────────────
function attachCloseDetails(id, exitDetails) {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE manual_trades SET
        exit_fee_usdt    = ?,
        funding_fee_usdt = ?,
        total_fees_usdt  = ?,
        net_pnl_usdt     = pnl_usdt - ?
      WHERE id = ?
    `, [
      exitDetails.exitFee     || 0,
      exitDetails.fundingFee  || 0,
      exitDetails.netCostFees || 0,
      exitDetails.netCostFees || 0,
      id,
    ], err => err ? reject(err) : resolve());
  });
}

module.exports = {
  initManualTrades, openTrade, closeTrade,
  getOpenTrades, getAllManualTrades, getTradeById, getTradeStats,
  migrateBingXColumns, attachBingXDetails, attachCloseDetails,
};