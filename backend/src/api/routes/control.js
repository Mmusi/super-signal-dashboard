// /api/control - kill switch, mode changes, system control
const express = require("express");
const router  = express.Router();

let killSwitch = false;
let mode       = process.env.MODE || "PAPER";

// GET /api/control/status
router.get("/status", (req, res) => {
  res.json({ ok: true, killSwitch, mode });
});

// POST /api/control/kill - engage kill switch
router.post("/kill", (req, res) => {
  killSwitch = true;
  console.log("🛑 KILL SWITCH ENGAGED");
  res.json({ ok: true, killSwitch });
});

// POST /api/control/resume - disengage kill switch
router.post("/resume", (req, res) => {
  killSwitch = false;
  console.log("✅ Kill switch disengaged — system resumed");
  res.json({ ok: true, killSwitch });
});

// POST /api/control/mode - switch mode
router.post("/mode", (req, res) => {
  const { newMode } = req.body;
  if (!["PAPER", "LIVE", "BACKTEST"].includes(newMode)) {
    return res.status(400).json({ ok: false, error: "Invalid mode" });
  }
  mode = newMode;
  console.log(`🔄 Mode switched to ${mode}`);
  res.json({ ok: true, mode });
});

function isKillSwitchActive() { return killSwitch; }

module.exports = router;
module.exports.isKillSwitchActive = isKillSwitchActive;
