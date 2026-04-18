// liquidityZones.js - identifies buy-side and sell-side liquidity levels
// Buy-side liquidity  = above swing highs (where stop-losses of shorts cluster)
// Sell-side liquidity = below swing lows  (where stop-losses of longs cluster)

function findLiquidityZones(candles, lookback = 50) {
  if (!candles || candles.length < 10) {
    return { buySide: [], sellSide: [] };
  }

  const window = candles.slice(-lookback);
  const buySide  = [];
  const sellSide = [];

  for (let i = 2; i < window.length - 2; i++) {
    const c     = window[i];
    const prev1 = window[i - 1];
    const prev2 = window[i - 2];
    const next1 = window[i + 1];
    const next2 = window[i + 2];

    // Swing high → sell-side stops cluster above it (buy-side liquidity)
    if (
      c.high > prev1.high &&
      c.high > prev2.high &&
      c.high > next1.high &&
      c.high > next2.high
    ) {
      buySide.push({
        price:    c.high,
        time:     c.time || c.openTime,
        strength: Math.abs(c.high - prev1.high) + Math.abs(c.high - next1.high)
      });
    }

    // Swing low → buy-side stops cluster below it (sell-side liquidity)
    if (
      c.low < prev1.low &&
      c.low < prev2.low &&
      c.low < next1.low &&
      c.low < next2.low
    ) {
      sellSide.push({
        price:    c.low,
        time:     c.time || c.openTime,
        strength: Math.abs(prev1.low - c.low) + Math.abs(next1.low - c.low)
      });
    }
  }

  // Sort by strength (most significant levels first) and keep top 10
  buySide.sort((a, b)  => b.strength - a.strength);
  sellSide.sort((a, b) => b.strength - a.strength);

  return {
    buySide:  buySide.slice(0, 10),
    sellSide: sellSide.slice(0, 10)
  };
}

module.exports = { findLiquidityZones };