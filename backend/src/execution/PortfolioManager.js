// Portfolio Manager - tracks equity curve + balance in paper trading mode
class PortfolioManager {
  constructor(startBalance = 100) {
    this.balance     = startBalance;
    this.startBalance= startBalance;
    this.equityCurve = [{ time: Date.now(), balance: startBalance }];
    this.trades      = [];
  }

  update(trade) {
    this.trades.push(trade);

    if (trade.result === "WIN") {
      this.balance += 1;
    } else if (trade.result === "LOSS") {
      this.balance -= 1;
    }

    this.equityCurve.push({ time: Date.now(), balance: this.balance });
  }

  getDrawdown() {
    const peak = Math.max(...this.equityCurve.map(e => e.balance));
    return peak > 0 ? (peak - this.balance) / peak : 0;
  }

  getState() {
    const wins   = this.trades.filter(t => t.result === "WIN").length;
    const total  = this.trades.length;
    return {
      balance:     this.balance,
      startBalance: this.startBalance,
      pnl:         this.balance - this.startBalance,
      winRate:     total > 0 ? ((wins / total) * 100).toFixed(1) : 0,
      totalTrades: total,
      drawdown:    (this.getDrawdown() * 100).toFixed(2),
      equityCurve: this.equityCurve.slice(-100) // last 100 points
    };
  }
}

module.exports = { PortfolioManager };
