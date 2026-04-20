// /api/trades — Manual trade entry, log, and management routes
// All data saved to SQLite — never localStorage
const express = require("express");
const router  = express.Router();

const {
  openTrade,
  closeTrade,
  getOpenTrades,
  getAllManualTrades,
  getTradeById,
  getTradeStats,
} = require("../../db/manualTradeRepository");

const { predictTP } = require("../../engines/tpPredictor");
const candleBuilder  = require("../../data/binance/candleBuilder");
const { ATR }        = require("../../core/regime/ATRCalculator");

// ── GET /api/trades — all trades (paginated) ─────────────────────────────────
router.get("/", (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  getAllManualTrades(limit, (trades) => {
    res.json({ ok: true, data: trades, count: trades.length });
  });
});

// ── GET /api/trades/open — open positions ─────────────────────────────────────
router.get("/open", (req, res) => {
  getOpenTrades((trades) => {
    res.json({ ok: true, data: trades });
  });
});

// ── GET /api/trades/stats — P&L summary ──────────────────────────────────────
router.get("/stats", (req, res) => {
  getTradeStats((stats) => {
    res.json({ ok: true, data: stats });
  });
});

// ── GET /api/trades/:id — single trade ───────────────────────────────────────
router.get("/:id", (req, res) => {
  getTradeById(req.params.id, (trade) => {
    if (!trade) return res.status(404).json({ ok: false, error: "Trade not found" });
    res.json({ ok: true, data: trade });
  });
});

// ── POST /api/trades/predict-tp — get TP suggestion before entering ──────────
// Body: { asset, direction, entryPrice, stopLoss }
router.post("/predict-tp", (req, res) => {
  try {
    const { asset, direction, entryPrice, stopLoss } = req.body;
    if (!asset || !direction || !entryPrice || !stopLoss) {
      return res.status(400).json({ ok: false, error: "asset, direction, entryPrice, stopLoss required" });
    }
    const result = predictTP(asset, direction, parseFloat(entryPrice), parseFloat(stopLoss));
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/trades/context/:asset — get current price + SL suggestion ───────
router.get("/context/:asset", (req, res) => {
  try {
    const sym     = req.params.asset.toUpperCase();
    const candles = candleBuilder.get(sym);
    if (!candles || candles.length < 10) {
      return res.json({ ok: true, data: { currentPrice: null, suggestedSL: null, atr: null } });
    }
    const last  = candles.at(-1);
    const atr   = ATR(candles);
    res.json({
      ok: true,
      data: {
        asset:        sym,
        currentPrice: last.close,
        atr,
        // Suggested SLs: 1.5x ATR above/below current price
        suggestedSL_long:  parseFloat((last.close - atr * 1.5).toFixed(6)),
        suggestedSL_short: parseFloat((last.close + atr * 1.5).toFixed(6)),
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/trades/open — enter a new trade ────────────────────────────────
// Body: { asset, direction, entryPrice, amountUsdt, leverage, stopLoss, takeProfit,
//         source, signalScore, regime, setupType, liquiditySweep, absorption, orderflowBias, notes }
router.post("/open", async (req, res) => {
  try {
    const {
      asset, direction, entryPrice, amountUsdt, leverage,
      stopLoss, takeProfit,
      source, signalScore, regime, setupType,
      liquiditySweep, absorption, orderflowBias, notes
    } = req.body;

    // Validation
    if (!asset || !direction || !entryPrice || !amountUsdt || !stopLoss || !takeProfit) {
      return res.status(400).json({ ok: false, error: "asset, direction, entryPrice, amountUsdt, stopLoss, takeProfit are required" });
    }
    if (!["LONG","SHORT"].includes(direction)) {
      return res.status(400).json({ ok: false, error: "direction must be LONG or SHORT" });
    }
    const lev = parseInt(leverage) || 1;
    if (lev < 1 || lev > 25) {
      return res.status(400).json({ ok: false, error: "leverage must be 1–25" });
    }

    const id = await openTrade({
      source:          source    || "MANUAL",
      signal_asset:    asset,
      signal_score:    signalScore || 0,
      regime:          regime    || null,
      setup_type:      setupType || "MANUAL",
      direction,
      entry_price:     parseFloat(entryPrice),
      amount_usdt:     parseFloat(amountUsdt),
      leverage:        lev,
      stop_loss:       parseFloat(stopLoss),
      take_profit:     parseFloat(takeProfit),
      liquidity_sweep: liquiditySweep ? 1 : 0,
      absorption:      absorption     ? 1 : 0,
      orderflow_bias:  orderflowBias  || null,
      notes:           notes          || null,
    });

    console.log(`📥 Trade opened: ${direction} ${asset} $${amountUsdt} x${lev} [${source || "MANUAL"}]`);
    res.json({ ok: true, id, message: `Trade opened: ${direction} ${asset}` });

  } catch (err) {
    console.error("Open trade error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/trades/close/:id — close a trade ───────────────────────────────
// Body: { exitPrice, exitReason?, notes? }
router.post("/close/:id", async (req, res) => {
  try {
    const { exitPrice, exitReason, notes } = req.body;
    if (!exitPrice) return res.status(400).json({ ok: false, error: "exitPrice required" });

    const result = await closeTrade(
      req.params.id,
      parseFloat(exitPrice),
      exitReason || "MANUAL_CLOSE",
      notes || null
    );

    console.log(`📤 Trade closed: ${req.params.id} @ ${exitPrice} | P&L: $${result.pnlUsdt?.toFixed(2)}`);
    res.json({ ok: true, data: result });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
