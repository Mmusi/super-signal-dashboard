// Health Engine - main orchestrator for system health monitoring
// Continuously monitors strategy degradation, emits recommendations
const { detectDrift }   = require("./DriftDetector");
const { getAllTrades }  = require("../db/tradeRepository");

function getRecommendation(status) {
  switch (status) {
    case "STABLE":    return "System normal — continue trading";
    case "WEAKENING": return "Reduce position size by 50%";
    case "DEGRADED":  return "Pause high-risk strategies";
    case "CRITICAL":  return "STOP TRADING — SYSTEM DISABLED";
    default:          return "Monitor closely";
  }
}

function runHealthCheck(callback) {
  getAllTrades((trades) => {
    const health = detectDrift(trades);

    callback({
      timestamp:      Date.now(),
      ...health,
      recommendation: getRecommendation(health.status)
    });
  });
}

// Synchronous version for in-memory trades (backtest use)
function runHealthCheckSync(trades) {
  const health = detectDrift(trades);
  return {
    timestamp:      Date.now(),
    ...health,
    recommendation: getRecommendation(health.status)
  };
}

module.exports = { runHealthCheck, runHealthCheckSync };
