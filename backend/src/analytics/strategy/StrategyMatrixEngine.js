// Strategy Matrix Engine - analyzes trade history to build performance breakdown
// Answers: which setup works? which regime? does liquidity sweep improve win rate?
const { getAllTrades }        = require("../../db/tradeRepository");
const { buildRegimeMatrix }   = require("./RegimeMatrix");
const { buildLiquidityMatrix }= require("./LiquidityMatrix");
const { buildScoreMatrix }    = require("./ScoreBandMatrix");

function buildMatrix(trades) {
  const matrix = {};

  trades.forEach((t) => {
    const key = t.setup_type || "UNKNOWN";

    if (!matrix[key]) {
      matrix[key] = { total: 0, wins: 0, losses: 0, pnl: 0, rTotal: 0 };
    }

    matrix[key].total += 1;
    if (t.result === "WIN") matrix[key].wins += 1;
    else                    matrix[key].losses += 1;

    matrix[key].pnl    += (t.pnl       || 0);
    matrix[key].rTotal += (t.r_multiple || 0);
  });

  const result = {};
  Object.entries(matrix).forEach(([key, val]) => {
    result[key] = {
      winRate: val.total > 0 ? +((val.wins / val.total) * 100).toFixed(1) : 0,
      avgR:    val.total > 0 ? +(val.rTotal / val.total).toFixed(2)        : 0,
      trades:  val.total
    };
  });

  return result;
}

function runStrategyMatrix(callback) {
  getAllTrades((trades) => {
    if (!trades || trades.length === 0) {
      return callback({ strategy: {}, regime: {}, liquidity: {}, scoreBands: {} });
    }

    const result = {
      strategy:   buildMatrix(trades),
      regime:     buildRegimeMatrix(trades),
      liquidity:  buildLiquidityMatrix(trades),
      scoreBands: buildScoreMatrix(trades)
    };

    callback(result);
  });
}

module.exports = { runStrategyMatrix, buildMatrix };
