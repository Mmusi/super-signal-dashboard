// Sweep Detector - detects liquidity grabs (price raids zone then rejects)
function detectSweeps(candles, zones) {
  const sweeps = [];
  const last = candles[candles.length - 1];

  zones.forEach(zone => {
    if (zone.type === "SELL_SIDE_LIQUIDITY") {
      if (last.high > zone.price && last.close < zone.price) {
        sweeps.push({ type: "SELL_SIDE_SWEEP", level: zone.price });
      }
    }
    if (zone.type === "BUY_SIDE_LIQUIDITY") {
      if (last.low < zone.price && last.close > zone.price) {
        sweeps.push({ type: "BUY_SIDE_SWEEP", level: zone.price });
      }
    }
  });

  return sweeps;
}

module.exports = { detectSweeps };
