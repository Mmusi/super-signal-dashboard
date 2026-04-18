// /api/market - market state, regime, candles endpoints
const express = require("express");
const router  = express.Router();
const { getMarketState } = require("../../engines/MarketBrain");
const candleBuilder      = require("../../data/binance/candleBuilder");
const { getOrderBook }   = require("../../data/binance/restClient");
const { normalizeOrderBook, buildHeatmap } = require("../../core/liquidity/HeatmapEngine");

// GET /api/market/state - top signals + timestamp
router.get("/state", (req, res) => {
  try {
    res.json({ ok: true, data: getMarketState() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/market/candles/:symbol - latest candles for charting
// Supports ?tf=1m|5m|15m|1h|4h|1w|1M and ?limit=N
router.get("/candles/:symbol", async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const tf  = req.query.tf || "1m";
    const limit = parseInt(req.query.limit) || 100;

    // For 1m we can serve from the live candle builder
    if (tf === "1m") {
      const candles = candleBuilder.get(sym);
      return res.json({ ok: true, symbol: sym, tf, data: candles.slice(-limit) });
    }

    // For other timeframes fetch from Binance REST
    const { getKlines } = require("../../data/binance/restClient");
    const candles = await getKlines(sym, tf, limit);
    res.json({ ok: true, symbol: sym, tf, data: candles });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/market/orderbook/:symbol - REST snapshot of order book heatmap
router.get("/orderbook/:symbol", async (req, res) => {
  try {
    const sym  = req.params.symbol.toUpperCase();
    const book = await getOrderBook(sym, 20);
    if (!book) return res.status(503).json({ ok: false, error: "Could not fetch order book" });
    const normalized = normalizeOrderBook(book.bids, book.asks);
    const heatmap    = buildHeatmap(normalized);
    res.json({ ok: true, symbol: sym, data: heatmap });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;