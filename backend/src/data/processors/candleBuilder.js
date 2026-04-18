// Candle processor - multi-timeframe candle aggregation from 1m base
// Aggregates 1m candles into 5m, 15m, 1h timeframes

function aggregateCandles(candles1m, multiplier) {
  const result = [];
  for (let i = 0; i + multiplier <= candles1m.length; i += multiplier) {
    const slice = candles1m.slice(i, i + multiplier);
    result.push({
      time:   slice[0].time,
      open:   slice[0].open,
      high:   Math.max(...slice.map(c => c.high)),
      low:    Math.min(...slice.map(c => c.low)),
      close:  slice[slice.length - 1].close,
      volume: slice.reduce((a, c) => a + c.volume, 0)
    });
  }
  return result;
}

function buildMultiTimeframe(candles1m) {
  return {
    "1m":  candles1m,
    "5m":  aggregateCandles(candles1m, 5),
    "15m": aggregateCandles(candles1m, 15),
    "1h":  aggregateCandles(candles1m, 60)
  };
}

module.exports = { aggregateCandles, buildMultiTimeframe };
