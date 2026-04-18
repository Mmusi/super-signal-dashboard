// Timeframe utilities - converts between timeframe strings and ms
const TF_MS = {
  "1m":  60000,
  "5m":  300000,
  "15m": 900000,
  "1h":  3600000,
  "4h":  14400000,
  "1d":  86400000
};

function tfToMs(tf) {
  return TF_MS[tf] || 60000;
}

function candlesRequired(tf, lookback = 200) {
  return Math.ceil(lookback * tfToMs("1m") / tfToMs(tf));
}

function formatTime(ts) {
  return new Date(ts).toISOString();
}

module.exports = { tfToMs, candlesRequired, formatTime, TF_MS };
