// Heatmap Engine - converts raw order book depth to heat intensity (0-1)
// Simulates Bookmap-style liquidity visualization using Binance depth stream

function normalizeOrderBook(bids, asks) {
  const parse = (levels) =>
    levels.map(([price, size]) => ({
      price: parseFloat(price),
      size: parseFloat(size)
    }));

  return { bids: parse(bids), asks: parse(asks) };
}

function calculateHeat(levels) {
  const max = Math.max(...levels.map(l => l.size));
  if (max === 0) return levels.map(l => ({ price: l.price, heat: 0 }));

  return levels.map(l => ({
    price: l.price,
    heat: l.size / max  // 0 → 1 intensity
  }));
}

function buildHeatmap(data) {
  const bids = calculateHeat(data.bids);
  const asks = calculateHeat(data.asks);
  return { bids, asks };
}

module.exports = { normalizeOrderBook, buildHeatmap };
