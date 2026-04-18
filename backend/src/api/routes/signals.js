// /api/signals - REST endpoints for signal data
const express    = require("express");
const router     = express.Router();
const { getAllSignals, getTopSignals } = require("../../engines/ScannerEngine");

// GET /api/signals - all current signals
router.get("/", (req, res) => {
  try {
    const signals = getAllSignals();
    res.json({ ok: true, data: signals, count: signals.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/signals/top - top 3 ranked signals
router.get("/top", (req, res) => {
  try {
    const top = getTopSignals();
    res.json({ ok: true, data: top });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
