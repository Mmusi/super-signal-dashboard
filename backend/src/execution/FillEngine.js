// Fill Engine - determines fill price accounting for spread and market impact
function calculateFill(direction, marketPrice, spread = 0.0001) {
  const half = marketPrice * spread / 2;
  return direction === "LONG" ? marketPrice + half : marketPrice - half;
}

module.exports = { calculateFill };
