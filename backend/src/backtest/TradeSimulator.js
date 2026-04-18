// Trade Simulator - simulates entry/exit realistically within historical data
// Connects to DB via insertTrade to preserve full backtest history
const { insertTrade } = require("../db/tradeRepository");

class TradeSimulator {
  constructor(tracker) {
    this.tracker = tracker;
  }

  executeTrade(signal, candles) {
    const entry = candles.at(-1).close;
    const sl    = signal.signal?.tradePlan?.stopLoss  || signal.tradePlan?.stopLoss;
    const tp    = signal.signal?.tradePlan?.takeProfit|| signal.tradePlan?.takeProfit;
    const dir   = signal.signal?.direction;

    if (!sl || !tp || !dir) {
      this.tracker.record({ symbol: signal.symbol, outcome: null, score: signal.signal?.score });
      return;
    }

    let exit   = null;
    let result = "LOSS";

    // Simulate forward - check next candles for SL/TP hit
    for (let i = candles.length - 1; i < candles.length; i++) {
      const c = candles[i];
      if (!c) break;

      if (dir === "LONG") {
        if (c.low  <= sl) { exit = sl; result = "LOSS"; break; }
        if (c.high >= tp) { exit = tp; result = "WIN";  break; }
      }
      if (dir === "SHORT") {
        if (c.high >= sl) { exit = sl; result = "LOSS"; break; }
        if (c.low  <= tp) { exit = tp; result = "WIN";  break; }
      }
    }

    const trade = {
      asset:          signal.symbol,
      direction:      dir,
      entry_price:    entry,
      exit_price:     exit || entry,
      entry_time:     candles.at(-1).time || Date.now(),
      exit_time:      Date.now(),
      pnl:            result === "WIN" ? 1 : -1,
      r_multiple:     result === "WIN" ? 1.5 : -1,
      result,
      setup_type:     signal.signal?.setupType || "UNKNOWN",
      regime:         signal.context?.regime?.type,
      liquidity_sweep: !!signal.context?.stopHunt,
      absorption:     signal.context?.absorption?.absorption || false,
      orderflow_bias: signal.context?.orderflow?.bias || "NEUTRAL",
      score:          signal.signal?.score || 0,
      sl, tp
    };

    insertTrade(trade);

    this.tracker.record({
      symbol:  trade.asset,
      outcome: result,
      score:   trade.score
    });
  }
}

module.exports = { TradeSimulator };
