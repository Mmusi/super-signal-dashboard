// Regime definitions and trading rules per regime
module.exports = {
  COMPRESSION: {
    tradeAllowed: true,
    description:  "Market coiling - breakout building",
    preferredSetup: "COMPRESSION_BREAKOUT"
  },
  EXPANSION: {
    tradeAllowed: true,
    description:  "Breakout active - momentum trading",
    preferredSetup: "TREND_CONTINUATION"
  },
  TRENDING_UP: {
    tradeAllowed: true,
    description:  "Confirmed uptrend",
    preferredSetup: "TREND_CONTINUATION"
  },
  TRENDING_DOWN: {
    tradeAllowed: true,
    description:  "Confirmed downtrend",
    preferredSetup: "TREND_CONTINUATION"
  },
  CHOP: {
    tradeAllowed: false,
    description:  "No clear direction - NO TRADE",
    preferredSetup: null
  }
};
