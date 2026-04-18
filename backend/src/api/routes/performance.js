// /api/performance - analytics, backtest, health endpoints
const express = require("express");
const router  = express.Router();
const { buildFullReport }  = require("../../analytics/strategy/StrategyAggregator");
const { runHealthCheck }   = require("../../health/HealthEngine");
const { getRecentTrades }  = require("../../db/tradeRepository");
const { runBacktest }      = require("../../backtest/BacktestEngine");
const { generateReport }   = require("../../backtest/ReportGenerator");

// GET /api/performance/report - full strategy analytics
router.get("/report", (req, res) => {
  buildFullReport((report) => {
    res.json({ ok: true, data: report });
  });
});

// GET /api/performance/health - system health check
router.get("/health", (req, res) => {
  runHealthCheck((health) => {
    res.json({ ok: true, data: health });
  });
});

// GET /api/performance/trades - recent trade history
router.get("/trades", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  getRecentTrades(limit, (trades) => {
    res.json({ ok: true, data: trades, count: trades.length });
  });
});

// POST /api/performance/backtest - run backtest for symbol
router.post("/backtest", (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ ok: false, error: "symbol required" });

  const stats  = runBacktest(symbol.toUpperCase());
  const report = generateReport(stats, symbol.toUpperCase());
  res.json({ ok: true, data: report });
});

module.exports = router;
