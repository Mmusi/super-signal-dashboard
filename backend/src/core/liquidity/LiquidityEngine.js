// Liquidity + Order Flow Master Engine
// Combines all liquidity and order flow sub-engines into single output
const { findLiquidityZones } = require("./liquidityZones");
const { detectStopHunt } = require("./StopHuntDetector");
const { analyzeOrderFlow } = require("../orderflow/OrderFlowEngine");
const { detectAbsorption } = require("../orderflow/AbsorptionDetector");

function liquidityOrderFlowEngine(candles) {
  const zones = findLiquidityZones(candles);
  const stopHunt = detectStopHunt(candles, zones);
  const orderFlow = analyzeOrderFlow(candles);
  const absorption = detectAbsorption(candles);

  return {
    liquidity: zones,
    stopHunt,
    orderFlow,
    absorption
  };
}

module.exports = { liquidityOrderFlowEngine };