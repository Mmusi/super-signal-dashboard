// System-wide constants
module.exports = {
  VERSION:           "1.0.0",
  WS_RECONNECT_MS:   3000,
  MAX_CANDLE_HISTORY: 500,
  HEATMAP_DEPTH:     10,
  ROLLING_PERF_WINDOW: 50,  // trades used for rolling health check
  DB_PATH:           "data/trades.db"
};
