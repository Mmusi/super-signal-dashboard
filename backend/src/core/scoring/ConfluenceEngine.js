// Confluence Engine - THE CORE SCORING BRAIN
// Combines all engine outputs into a single confidence score (0-100)
// Weights: Regime 25% | Compression 20% | Liquidity 20% | OrderFlow 20% | Absorption 10% | Volatility 5%

function calculateConfluence(input) {
  const { regime, compression, liquidity, orderflow, absorption, volatility } = input;

  let score = 0;

  // 🧠 REGIME (25 pts)
  if (regime.type === "COMPRESSION")   score += 25;
  if (regime.type === "TRENDING_UP")   score += 20;
  if (regime.type === "TRENDING_DOWN") score += 20;
  if (regime.type === "EXPANSION")     score += 15;
  // CHOP = 0 pts - intentionally filtered out

  // 📦 COMPRESSION STRENGTH (20 pts max)
  score += Math.min(20, compression.score || 0);

  // 💧 LIQUIDITY CONFIRMATION (20 pts)
  // Note: stopHunt is a top-level context key, passed in via input directly
  if (input.stopHunt) score += 20;
  if (liquidity && liquidity.buySide && liquidity.buySide.length > 0) score += 10;
  if (liquidity && liquidity.sellSide && liquidity.sellSide.length > 0) score += 5;

  // 🕵️ ORDER FLOW (15 pts)
  if (orderflow && orderflow.bias === "BUYERS_IN_CONTROL")  score += 15;
  if (orderflow && orderflow.bias === "SELLERS_IN_CONTROL") score += 15;

  // 🧲 ABSORPTION (10 pts)
  if (absorption && absorption.absorption) score += 10;

  // 🌡 VOLATILITY FIT (5 pts)
  if (volatility && volatility.state === "LOW")    score += 5;
  if (volatility && volatility.state === "NORMAL") score += 3;

  return Math.min(100, score);
}

module.exports = { calculateConfluence };