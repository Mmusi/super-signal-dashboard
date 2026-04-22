// /api/trades — Trade entry, management, BingX execution
// POST /api/trades/open   → logs to DB, optionally executes on BingX
// POST /api/trades/close  → logs close, optionally closes on BingX
const express = require("express");
const router  = express.Router();

const {
  openTrade, closeTrade,
  getOpenTrades, getAllManualTrades, getTradeById, getTradeStats,
  attachBingXDetails, attachCloseDetails,
} = require("../../db/manualTradeRepository");

const { predictTP }  = require("../../engines/tpPredictor");
const candleBuilder  = require("../../data/binance/candleBuilder");
const { ATR }        = require("../../core/regime/ATRCalculator");
const bingx          = require("../../exchange/bingx/BingXExecutor");

// ── GET /api/trades ───────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  getAllManualTrades(limit, trades => res.json({ ok: true, data: trades, count: trades.length }));
});

router.get("/open",  (req, res) => getOpenTrades(t => res.json({ ok: true, data: t })));
router.get("/stats", (req, res) => getTradeStats(s => res.json({ ok: true, data: s })));

// ── GET /api/trades/bingx-status ─────────────────────────────────────────────
router.get("/bingx-status", async (req, res) => {
  const ping = await bingx.testConnection();
  const bal  = bingx.isEnabled() ? await bingx.getBalance() : { ok: false };
  res.json({ ok: true, configured: bingx.isEnabled(), ping, balance: bal });
});

// ── GET /api/trades/context/:asset ───────────────────────────────────────────
router.get("/context/:asset", (req, res) => {
  try {
    const sym     = req.params.asset.toUpperCase();
    const candles = candleBuilder.get(sym);
    if (!candles || candles.length < 10) {
      return res.json({ ok: true, data: { currentPrice: null, atr: null } });
    }
    const last = candles.at(-1);
    const atr  = ATR(candles);
    res.json({ ok: true, data: {
      asset:            sym,
      currentPrice:     last.close,
      atr,
      suggestedSL_long:  parseFloat((last.close - atr * 1.5).toFixed(6)),
      suggestedSL_short: parseFloat((last.close + atr * 1.5).toFixed(6)),
    }});
  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/trades/predict-tp ──────────────────────────────────────────────
router.post("/predict-tp", (req, res) => {
  try {
    const { asset, direction, entryPrice, stopLoss } = req.body;
    if (!asset || !direction || !entryPrice || !stopLoss)
      return res.status(400).json({ ok: false, error: "asset, direction, entryPrice, stopLoss required" });
    const result = predictTP(asset, direction, parseFloat(entryPrice), parseFloat(stopLoss));
    res.json({ ok: true, data: result });
  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/trades/open ─────────────────────────────────────────────────────
// Body includes: executeBingX (bool) — if true, place real order
router.post("/open", async (req, res) => {
  try {
    const {
      asset, direction, entryPrice, amountUsdt, leverage,
      stopLoss, takeProfit,
      source, signalScore, regime, setupType,
      liquiditySweep, absorption, orderflowBias, notes,
      executeBingX, // NEW: true = actually trade on BingX
    } = req.body;

    if (!asset || !direction || !entryPrice || !amountUsdt || !stopLoss || !takeProfit)
      return res.status(400).json({ ok: false, error: "asset, direction, entryPrice, amountUsdt, stopLoss, takeProfit required" });
    if (!["LONG","SHORT"].includes(direction))
      return res.status(400).json({ ok: false, error: "direction must be LONG or SHORT" });

    const lev = Math.min(25, Math.max(1, parseInt(leverage) || 1));

    // 1. Save to DB first (always) — this is instant
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

    console.log(`📥 Trade logged: ${direction} ${asset} $${amountUsdt}×${lev} [${source||"MANUAL"}]`);

    // 2. If executeBingX=true, place real order on BingX
    let bingxResult = null;
    if (executeBingX) {
      if (!bingx.isEnabled()) {
        return res.json({
          ok: true, id,
          warning: "BingX not configured — trade logged to DB only. Add BINGX_API_KEY and BINGX_SECRET to .env to enable live trading.",
          bingxExecuted: false,
        });
      }
      try {
        bingxResult = await bingx.openTrade({
          symbol:     asset,
          direction,
          amountUsdt: parseFloat(amountUsdt),
          leverage:   lev,
          stopLoss:   parseFloat(stopLoss),
          takeProfit: parseFloat(takeProfit),
          entryPrice: parseFloat(entryPrice),
        });
        // 3. Attach BingX execution details to DB record
        await attachBingXDetails(id, bingxResult);
        console.log(`✅ BingX order placed: ${asset} orderId=${bingxResult.orderId}`);
      } catch(bErr) {
        console.error(`❌ BingX execution failed: ${bErr.message}`);
        return res.json({
          ok: true, id,
          warning: `Trade logged to DB. BingX execution failed: ${bErr.message}`,
          bingxExecuted: false,
          bingxError: bErr.message,
        });
      }
    }

    res.json({
      ok: true, id,
      bingxExecuted: !!bingxResult,
      bingxOrderId:  bingxResult?.orderId || null,
      entryFee:      bingxResult?.entryFee || null,
      message: executeBingX && bingxResult
        ? `✅ BingX order placed + logged | ID: ${bingxResult.orderId}`
        : `Trade logged to DB (paper mode)`,
    });

  } catch(err) {
    console.error("Open trade error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/trades/close/:id ────────────────────────────────────────────────
router.post("/close/:id", async (req, res) => {
  try {
    const { exitPrice, exitReason, notes, executeBingX } = req.body;
    if (!exitPrice) return res.status(400).json({ ok: false, error: "exitPrice required" });

    // 1. Get trade from DB to know quantity/direction for BingX close
    getTradeById(req.params.id, async trade => {
      if (!trade) return res.status(404).json({ ok: false, error: "Trade not found" });

      // 2. Close in DB
      const result = await closeTrade(req.params.id, parseFloat(exitPrice), exitReason || "MANUAL_CLOSE", notes || null);

      // 3. Close on BingX if requested and trade was executed there
      let feeDetails = null;
      if (executeBingX && trade.bingx_order_id && bingx.isEnabled()) {
        try {
          feeDetails = await bingx.closeTrade({
            symbol:      trade.signal_asset,
            direction:   trade.direction,
            quantity:    trade.quantity,
            exitPrice:   parseFloat(exitPrice),
            slOrderId:   trade.bingx_sl_order_id,
            tpOrderId:   trade.bingx_tp_order_id,
            entryFee:    trade.entry_fee_usdt || 0,
            positionSize: trade.position_size,
          });
          await attachCloseDetails(req.params.id, feeDetails);
          console.log(`✅ BingX position closed: ${trade.signal_asset} | Net fees: $${feeDetails.netCostFees?.toFixed(4)}`);
        } catch(bErr) {
          console.error(`❌ BingX close failed: ${bErr.message}`);
        }
      }

      console.log(`📤 Trade closed: ${req.params.id} @ ${exitPrice} | P&L: $${result.pnlUsdt?.toFixed(2)}`);
      res.json({
        ok: true,
        data: {
          ...result,
          fees: feeDetails,
          netPnl: feeDetails ? result.pnlUsdt - feeDetails.netCostFees : result.pnlUsdt,
        }
      });
    });

  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/trades/:id ───────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  getTradeById(req.params.id, trade => {
    if (!trade) return res.status(404).json({ ok: false, error: "Trade not found" });
    res.json({ ok: true, data: trade });
  });
});

module.exports = router;