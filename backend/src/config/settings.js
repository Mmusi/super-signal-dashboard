// System Settings - all tunable thresholds in one place
module.exports = {
  // Signal thresholds
  STRONG_SIGNAL_THRESHOLD: 85,
  WATCH_THRESHOLD:         75,
  MIN_CANDLES_REQUIRED:    50,

  // Risk management
  RISK_PERCENT_PER_TRADE:  1.0,   // 1% account risk per trade
  ATR_SL_MULTIPLIER:       1.5,
  ATR_TP_MULTIPLIER:       2.0,
  MAX_DRAWDOWN_PCT:        15,    // kill switch at 15% drawdown

  // Telegram
  TELEGRAM_MIN_SCORE:      80,
  TELEGRAM_COOLDOWN_MS:    30000, // 30s per asset

  // Paper trading
  PAPER_START_BALANCE:     10000,

  // System mode: "PAPER" | "LIVE" | "BACKTEST"
  MODE: process.env.MODE || "PAPER",

  // Server
  PORT: process.env.PORT || 3001
};
