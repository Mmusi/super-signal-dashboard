// Position Manager - tracks open paper positions, monitors SL/TP hits
const { insertTrade } = require("../db/tradeRepository");

class PositionManager {
  constructor() {
    this.positions = [];
  }

  openPosition(position) {
    const trade = {
      ...position,
      entry_time: Date.now(),
      status:     "OPEN"
    };
    this.positions.push(trade);
    console.log(`📂 Position opened: ${trade.asset} ${trade.direction} @ ${trade.entry}`);
    return trade;
  }

  updatePosition(marketData) {
    this.positions.forEach(pos => {
      if (pos.status !== "OPEN") return;

      if (pos.direction === "LONG") {
        if (marketData.low  <= pos.sl) { this.close(pos, "LOSS"); return; }
        if (marketData.high >= pos.tp) { this.close(pos, "WIN");  return; }
      }

      if (pos.direction === "SHORT") {
        if (marketData.high >= pos.sl) { this.close(pos, "LOSS"); return; }
        if (marketData.low  <= pos.tp) { this.close(pos, "WIN");  return; }
      }
    });
  }

  close(position, result) {
    position.status    = "CLOSED";
    position.result    = result;
    position.exit_time = Date.now();
    position.pnl       = result === "WIN" ? 1 : -1;

    console.log(`${result === "WIN" ? "✅" : "❌"} Position closed: ${position.asset} ${result}`);

    insertTrade({
      asset:         position.asset,
      direction:     position.direction,
      entry_price:   position.entry,
      exit_price:    result === "WIN" ? position.tp : position.sl,
      entry_time:    position.entry_time,
      exit_time:     position.exit_time,
      pnl:           position.pnl,
      r_multiple:    result === "WIN" ? 1.5 : -1,
      result,
      setup_type:    position.setup_type  || "UNKNOWN",
      regime:        position.regime,
      liquidity_sweep: position.liquidity_sweep || false,
      absorption:    position.absorption   || false,
      orderflow_bias: position.orderflow_bias || "NEUTRAL",
      score:         position.score,
      sl:            position.sl,
      tp:            position.tp
    });
  }

  getOpenPositions() {
    return this.positions.filter(p => p.status === "OPEN");
  }
}

module.exports = { PositionManager };
