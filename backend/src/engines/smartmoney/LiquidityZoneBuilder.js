// Liquidity Zone Builder - identifies clustered stop zones using swing structure
function buildLiquidityZones(candles) {
  const zones = [];

  for (let i = 5; i < candles.length - 5; i++) {
    const window = candles.slice(i - 5, i + 5);
    const highs = window.map(c => c.high);
    const lows  = window.map(c => c.low);

    const resistance = Math.max(...highs);
    const support    = Math.min(...lows);

    const isRepeatedHigh = highs.filter(h => Math.abs(h - resistance) < 0.001 * resistance).length > 2;
    const isRepeatedLow  = lows.filter(l  => Math.abs(l  - support)   < 0.001 * support).length   > 2;

    if (isRepeatedHigh) {
      zones.push({ type: "SELL_SIDE_LIQUIDITY", price: resistance });
    }
    if (isRepeatedLow) {
      zones.push({ type: "BUY_SIDE_LIQUIDITY",  price: support });
    }
  }

  // Deduplicate nearby zones
  const deduped = [];
  for (const z of zones) {
    const nearby = deduped.find(d => d.type === z.type && Math.abs(d.price - z.price) < z.price * 0.002);
    if (!nearby) deduped.push(z);
  }

  return deduped;
}

module.exports = { buildLiquidityZones };
