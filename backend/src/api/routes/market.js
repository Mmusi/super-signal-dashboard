// /api/market - market state, regime, candles endpoints
const express = require("express");
const router  = express.Router();
const { getMarketState } = require("../../engines/MarketBrain");
const candleBuilder      = require("../../data/binance/candleBuilder");

// GET /api/market/state - top signals + timestamp
router.get("/state", (req, res) => {
  try {
    res.json({ ok: true, data: getMarketState() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/market/candles/:symbol - latest candles for charting
router.get("/candles/:symbol", (req, res) => {
  try {
    const sym     = req.params.symbol.toUpperCase();
    const candles = candleBuilder.get(sym);
    res.json({ ok: true, symbol: sym, data: candles.slice(-100) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
