// Report Generator - produces formatted backtest reports for dashboard + CLI
function generateReport(stats, symbol) {
  return {
    symbol,
    timestamp:  new Date().toISOString(),
    summary: {
      totalTrades: stats.total,
      wins:        stats.wins,
      losses:      stats.losses,
      winRate:     `${stats.winRate}%`
    },
    scoreBands:  stats.scoreBands
  };
}

module.exports = { generateReport };
