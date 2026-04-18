// ATR Risk Engine - calculates SL/TP using ATR multiples
const { ATR } = require("../regime/ATRCalculator");

function atrRisk(candles, direction, multiplierSL = 1.5, multiplierTP = 2.0) {
  const atr = ATR(candles);
  const lastPrice = candles.at(-1).close;

  let sl, tp;

  if (direction === "LONG") {
    sl = lastPrice - atr * multiplierSL;
    tp = lastPrice + atr * multiplierTP;
  } else {
    sl = lastPrice + atr * multiplierSL;
    tp = lastPrice - atr * multiplierTP;
  }

  const riskReward = multiplierTP / multiplierSL;

  return { sl, tp, atr, riskReward, entry: lastPrice };
}

module.exports = { atrRisk };
