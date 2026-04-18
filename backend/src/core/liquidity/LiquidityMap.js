// LiquidityMap.js - builds a price-keyed map of liquidity clusters
const { findLiquidityZones } = require("./LiquidityZones");

function buildLiquidityMap(candles) {
  const zones = findLiquidityZones(candles);

  const map = {
    buySide: zones.buySide.slice(-5),    // top 5 recent buy-side levels
    sellSide: zones.sellSide.slice(-5),  // top 5 recent sell-side levels
    dominantSide: zones.buySide.length > zones.sellSide.length ? "BUY" : "SELL"
  };

  return map;
}

module.exports = { buildLiquidityMap };
