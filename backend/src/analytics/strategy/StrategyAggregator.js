// Strategy Aggregator - combines all matrix engines into a single analytics report
const { buildMatrix }          = require("./StrategyMatrixEngine");
const { buildRegimeMatrix }    = require("./RegimeMatrix");
const { buildLiquidityMatrix } = require("./LiquidityMatrix");
const { buildScoreMatrix }     = require("./ScoreBandMatrix");
const { buildAssetMatrix }     = require("./AssetMatrix");
const { getAllTrades }          = require("../../db/tradeRepository");

function buildFullReport(callback) {
  getAllTrades((trades) => {
    if (!trades || trades.length === 0) {
      return callback({ empty: true, message: "No trades recorded yet. Run backtest or trade live." });
    }

    callback({
      timestamp:  Date.now(),
      totalTrades: trades.length,
      strategy:   buildMatrix(trades),
      regime:     buildRegimeMatrix(trades),
      liquidity:  buildLiquidityMatrix(trades),
      scoreBands: buildScoreMatrix(trades),
      assets:     buildAssetMatrix(trades)
    });
  });
}

module.exports = { buildFullReport };
