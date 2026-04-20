// tpPredictor.js
// Predicts Take Profit levels by finding next reversal point
// Uses: liquidity zones, S/R levels, ATR-based targets
// This is where your TP suggestion comes from - NOT a random multiple

const { findLiquidityZones } = require("../core/liquidity/liquidityZones");
const { findSupportResistance } = require("../core/structure/SupportResistance");
const { ATR } = require("../core/regime/ATRCalculator");
const candleBuilder = require("../data/binance/candleBuilder");

// Find the nearest S/R level beyond entry in trade direction
// That is the predicted reversal point (where smart money will defend)
function predictTP(asset, direction, entryPrice, stopLoss) {
  const candles = candleBuilder.get(asset);
  if (!candles || candles.length < 30) {
    // Fallback: 2:1 R:R
    const riskDist = Math.abs(entryPrice - stopLoss);
    return {
      tp:       direction === "LONG" ? entryPrice + riskDist * 2 : entryPrice - riskDist * 2,
      method:   "fallback_2R",
      rr:       2.0,
      levels:   []
    };
  }

  const atr        = ATR(candles);
  const riskDist   = Math.abs(entryPrice - stopLoss);
  const liqZones   = findLiquidityZones(candles);
  const sr         = findSupportResistance(candles);

  // Build candidate TP levels (must be beyond entry in direction)
  const candidates = [];

  if (direction === "LONG") {
    // For LONG: TP candidates are above entry price
    // Sell-side liquidity (swing highs) = where shorts have stops = reversal risk
    liqZones.buySide.forEach(z => {
      if (z.price > entryPrice + atr * 0.3) {
        candidates.push({ price: z.price, type: "BUY_SIDE_LIQ", strength: z.strength || 1 });
      }
    });
    // Resistance level
    if (sr.resistance > entryPrice + atr * 0.3) {
      candidates.push({ price: sr.resistance, type: "RESISTANCE", strength: 2 });
    }
    // ATR-based levels (1.5R, 2R, 3R as fallback layers)
    [1.5, 2.0, 3.0].forEach(mult => {
      candidates.push({ price: entryPrice + riskDist * mult, type: `${mult}R`, strength: 0.5 });
    });
    // Keep only those above entry, sort by closest
    const valid = candidates
      .filter(c => c.price > entryPrice)
      .sort((a, b) => a.price - b.price);

    // Pick the first strong level (strength > 1) or the 2R level
    const strongLevel = valid.find(c => c.strength >= 1 && c.type !== "1.5R");
    const chosen      = strongLevel || valid.find(c => c.type === "2.0R") || valid[0];

    if (!chosen) {
      const tp = entryPrice + riskDist * 2;
      return { tp, method: "2R_default", rr: 2.0, levels: valid.slice(0,5) };
    }

    return {
      tp:     parseFloat(chosen.price.toFixed(6)),
      method: chosen.type,
      rr:     parseFloat(((chosen.price - entryPrice) / riskDist).toFixed(2)),
      levels: valid.slice(0, 6).map(l => ({ price: parseFloat(l.price.toFixed(6)), type: l.type }))
    };

  } else {
    // SHORT: TP candidates are below entry price
    liqZones.sellSide.forEach(z => {
      if (z.price < entryPrice - atr * 0.3) {
        candidates.push({ price: z.price, type: "SELL_SIDE_LIQ", strength: z.strength || 1 });
      }
    });
    if (sr.support < entryPrice - atr * 0.3) {
      candidates.push({ price: sr.support, type: "SUPPORT", strength: 2 });
    }
    [1.5, 2.0, 3.0].forEach(mult => {
      candidates.push({ price: entryPrice - riskDist * mult, type: `${mult}R`, strength: 0.5 });
    });
    const valid = candidates
      .filter(c => c.price < entryPrice)
      .sort((a, b) => b.price - a.price);

    const strongLevel = valid.find(c => c.strength >= 1 && c.type !== "1.5R");
    const chosen      = strongLevel || valid.find(c => c.type === "2.0R") || valid[0];

    if (!chosen) {
      const tp = entryPrice - riskDist * 2;
      return { tp, method: "2R_default", rr: 2.0, levels: valid.slice(0,5) };
    }

    return {
      tp:     parseFloat(chosen.price.toFixed(6)),
      method: chosen.type,
      rr:     parseFloat(((entryPrice - chosen.price) / riskDist).toFixed(2)),
      levels: valid.slice(0, 6).map(l => ({ price: parseFloat(l.price.toFixed(6)), type: l.type }))
    };
  }
}

module.exports = { predictTP };
