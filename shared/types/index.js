// Shared type definitions (JSDoc-style for vanilla JS projects)

/**
 * @typedef {Object} Signal
 * @property {string} asset
 * @property {"TRADE"|"WATCH"|"NO_TRADE"} action
 * @property {"LONG"|"SHORT"|null} direction
 * @property {number} score
 * @property {string} regime
 * @property {number} [entry]
 * @property {number} [sl]
 * @property {number} [tp]
 * @property {number} timestamp
 */

/**
 * @typedef {Object} Candle
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 * @property {number} time
 */

/**
 * @typedef {"COMPRESSION"|"EXPANSION"|"TRENDING_UP"|"TRENDING_DOWN"|"CHOP"} Regime
 */

/**
 * @typedef {Object} TradePlan
 * @property {number} entry
 * @property {number} stopLoss
 * @property {number} takeProfit
 * @property {number} riskReward
 */

module.exports = {};
