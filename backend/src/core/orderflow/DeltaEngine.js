// Delta Engine - approximates buy/sell delta using candle aggression
// True delta requires tick-level data; we approximate via (close-open)*volume

function calculateDelta(candles) {
  let delta = 0;

  for (let c of candles.slice(-20)) {
    const candleDelta = (c.close - c.open) * c.volume;
    delta += candleDelta;
  }

  return delta;
}

module.exports = { calculateDelta };
