// Replay Engine - simulates time moving forward candle-by-candle
// Uses rolling window so indicators always have correct context
function replayCandles(data, callback) {
  const window = [];

  for (let i = 0; i < data.length; i++) {
    window.push(data[i]);

    // Keep rolling window of 200 candles (enough for all indicators)
    if (window.length > 200) {
      window.shift();
    }

    callback([...window], data[i], i);
  }
}

module.exports = { replayCandles };
