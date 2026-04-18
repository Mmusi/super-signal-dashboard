// Stop Hunt Detector - detects when price raids a liquidity level then reverses
// Fake breakout: breaks level → takes stops → closes back inside = REVERSAL signal

function detectStopHunt(candles, liquidityZones) {
  const last = candles.at(-1);

  // Check buy-side sweep (bearish reversal)
  for (let zone of liquidityZones.buySide) {
    if (last.high > zone.price && last.close < zone.price) {
      return {
        type: "BUY_SIDE_SWEEP",
        level: zone.price,
        signal: "BEARISH_REVERSAL"
      };
    }
  }

  // Check sell-side sweep (bullish reversal)
  for (let zone of liquidityZones.sellSide) {
    if (last.low < zone.price && last.close > zone.price) {
      return {
        type: "SELL_SIDE_SWEEP",
        level: zone.price,
        signal: "BULLISH_REVERSAL"
      };
    }
  }

  return null;
}

module.exports = { detectStopHunt };
