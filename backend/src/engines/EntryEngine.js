// Entry Engine - builds precise entry, SL, TP from signal + structure + liquidity + ATR
// LONG:  entry < TP (price goes UP),  SL below entry
// SHORT: entry > TP (price goes DOWN), SL above entry

function buildEntry(signal, structure, liquidity, atr) {
  if (!signal || signal.action !== "TRADE") return null;

  const lastPrice = structure.lastPrice;
  if (!lastPrice || !atr || atr === 0) return null;

  let entry = lastPrice;
  let sl, tp;

  if (signal.direction === "LONG") {
    // SL: below current price by 1.5 ATR (or sell-side liquidity if below price)
    const sellSideCandidate = liquidity?.sellSide?.find(z => z.price < lastPrice);
    sl = sellSideCandidate
      ? Math.min(sellSideCandidate.price, lastPrice - atr * 1.5)
      : lastPrice - atr * 1.5;

    // TP: above current price by 2 ATR (or buy-side liquidity if above price)
    const buySideCandidate = liquidity?.buySide?.find(z => z.price > lastPrice);
    tp = buySideCandidate
      ? Math.max(buySideCandidate.price, lastPrice + atr * 2)
      : lastPrice + atr * 2;

    // Safety: ensure LONG geometry is correct
    if (sl >= entry) sl = entry - atr * 1.5;
    if (tp <= entry) tp = entry + atr * 2;
  }

  if (signal.direction === "SHORT") {
    // SL: above current price by 1.5 ATR (or buy-side liquidity if above price)
    const buySideCandidate = liquidity?.buySide?.find(z => z.price > lastPrice);
    sl = buySideCandidate
      ? Math.max(buySideCandidate.price, lastPrice + atr * 1.5)
      : lastPrice + atr * 1.5;

    // TP: below current price by 2 ATR (or sell-side liquidity if below price)
    const sellSideCandidate = liquidity?.sellSide?.find(z => z.price < lastPrice);
    tp = sellSideCandidate
      ? Math.min(sellSideCandidate.price, lastPrice - atr * 2)
      : lastPrice - atr * 2;

    // Safety: ensure SHORT geometry is correct
    if (sl <= entry) sl = entry + atr * 1.5;
    if (tp >= entry) tp = entry - atr * 2;
  }

  const riskReward = sl && tp
    ? Math.abs(tp - entry) / Math.abs(entry - sl)
    : null;

  return {
    entry,
    stopLoss:   parseFloat(sl.toFixed(4)),
    takeProfit: parseFloat(tp.toFixed(4)),
    riskReward: riskReward ? parseFloat(riskReward.toFixed(2)) : null,
    atr:        parseFloat(atr.toFixed(4))
  };
}

module.exports = { buildEntry };