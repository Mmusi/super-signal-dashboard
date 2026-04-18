// Entry Engine - builds precise entry, SL, TP from signal + structure + liquidity + ATR
function buildEntry(signal, structure, liquidity, atr) {
  if (!signal || signal.action !== "TRADE") return null;

  const lastPrice = structure.lastPrice;
  let entry = lastPrice;
  let sl = 0;
  let tp = 0;

  // LONG: SL below sell-side liquidity, TP at buy-side liquidity
  if (signal.direction === "LONG") {
    sl = (liquidity && liquidity.sellSide && liquidity.sellSide[0])
      ? liquidity.sellSide[0].price
      : lastPrice - atr * 1.5;
    tp = (liquidity && liquidity.buySide && liquidity.buySide[0])
      ? liquidity.buySide[0].price
      : lastPrice + atr * 2;
  }

  // SHORT: SL above buy-side liquidity, TP at sell-side liquidity
  if (signal.direction === "SHORT") {
    sl = (liquidity && liquidity.buySide && liquidity.buySide[0])
      ? liquidity.buySide[0].price
      : lastPrice + atr * 1.5;
    tp = (liquidity && liquidity.sellSide && liquidity.sellSide[0])
      ? liquidity.sellSide[0].price
      : lastPrice - atr * 2;
  }

  return { entry, stopLoss: sl, takeProfit: tp };
}

module.exports = { buildEntry };
