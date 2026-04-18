// Order Book Parser - converts raw Binance depth data to structured levels
function parseOrderBook(rawBids, rawAsks) {
  const parse = (levels) =>
    levels.map(([price, size]) => ({
      price: parseFloat(price),
      size: parseFloat(size)
    })).filter(l => l.size > 0);

  return {
    bids: parse(rawBids),
    asks: parse(rawAsks)
  };
}

function imbalanceRatio(bids, asks) {
  const bidTotal = bids.reduce((a, b) => a + b.size, 0);
  const askTotal = asks.reduce((a, b) => a + b.size, 0);
  const total = bidTotal + askTotal;
  if (total === 0) return 0.5;
  return bidTotal / total; // > 0.6 = buy pressure, < 0.4 = sell pressure
}

module.exports = { parseOrderBook, imbalanceRatio };
