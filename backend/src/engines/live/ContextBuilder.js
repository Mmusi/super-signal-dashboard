// Context Builder - converts raw candles → full intelligence input for Signal Engine
// This is the CRITICAL BRIDGE between market data and decision engines
const { classifyRegime } = require("../../core/regime/RegimeClassifier");
const { liquidityOrderFlowEngine } = require("../../core/liquidity/LiquidityEngine");
const { analyzeOrderFlow } = require("../../core/orderflow/OrderFlowEngine");
const { ATR } = require("../../core/regime/ATRCalculator");

function buildContext(symbol, candles) {
  if (!candles || candles.length < 50) return null;

  const regime    = classifyRegime(candles);
  const liquidity = liquidityOrderFlowEngine(candles);
  const orderflow = analyzeOrderFlow(candles);
  const atr       = ATR(candles);
  const lastPrice = candles.at(-1).close;

  return {
    asset: symbol,
    candles,
    structure: { lastPrice },

    regime: {
      type:       regime.regime,
      confidence: regime.confidence
    },

    compression: regime.compression,
    liquidity:   liquidity.liquidity,
    stopHunt:    liquidity.stopHunt,
    absorption:  liquidity.absorption,

    orderflow,

    volatility: {
      atr,
      state: regime.volatility.state
    }
  };
}

module.exports = { buildContext };
