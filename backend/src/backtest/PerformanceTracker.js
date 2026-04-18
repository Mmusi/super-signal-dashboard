// Performance Tracker - tracks backtest results + prints final report
class PerformanceTracker {
  constructor() {
    this.trades = [];
  }

  record(trade) {
    if (trade.outcome) this.trades.push(trade);
  }

  getStats() {
    const wins    = this.trades.filter(t => t.outcome === "WIN").length;
    const losses  = this.trades.filter(t => t.outcome === "LOSS").length;
    const total   = wins + losses;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    // Score-band breakdown
    const bands = { "90-100": { w: 0, t: 0 }, "80-89": { w: 0, t: 0 }, "<80": { w: 0, t: 0 } };
    this.trades.forEach(t => {
      let band = "<80";
      if (t.score >= 90) band = "90-100";
      else if (t.score >= 80) band = "80-89";
      bands[band].t++;
      if (t.outcome === "WIN") bands[band].w++;
    });

    return {
      total,
      wins,
      losses,
      winRate:   winRate.toFixed(2),
      scoreBands: Object.fromEntries(
        Object.entries(bands).map(([k, v]) => [k, {
          winRate: v.t > 0 ? ((v.w / v.t) * 100).toFixed(1) : "N/A",
          trades:  v.t
        }])
      )
    };
  }

  printReport() {
    const s = this.getStats();
    console.log("\n📊 ══════════════════════════════════════");
    console.log("   BACKTEST RESULTS");
    console.log("══════════════════════════════════════");
    console.log(`   Total Trades : ${s.total}`);
    console.log(`   Wins         : ${s.wins}`);
    console.log(`   Losses       : ${s.losses}`);
    console.log(`   Win Rate     : ${s.winRate}%`);
    console.log("\n   Score Band Performance:");
    Object.entries(s.scoreBands).forEach(([band, data]) => {
      console.log(`   ${band}: ${data.winRate}% (${data.trades} trades)`);
    });
    console.log("══════════════════════════════════════\n");
  }
}

module.exports = { PerformanceTracker };
