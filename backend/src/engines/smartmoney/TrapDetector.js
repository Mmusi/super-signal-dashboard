// Trap Detector - MAIN SMART MONEY ENGINE
// Detects: fake breakouts | stop hunts | absorption before reversal | liquidity sweep + rejection
const { buildLiquidityZones } = require("./LiquidityZoneBuilder");
const { detectSweeps }        = require("./SweepDetector");
const { detectAbsorption }    = require("./AbsorptionDetector");
const { scoreTrap }           = require("./TrapScorer");

function runTrapDetection(candles) {
  if (!candles || candles.length < 20) {
    return { zones: [], sweeps: [], trapScore: 0, isTrap: false };
  }

  const zones      = buildLiquidityZones(candles);
  const sweeps     = detectSweeps(candles, zones);
  const absorption = detectAbsorption(candles, sweeps);
  const scored     = scoreTrap(absorption);

  return {
    zones,
    sweeps:    absorption,
    trapScore: scored.trapScore,
    isTrap:    scored.isTrap
  };
}

module.exports = { runTrapDetection };
