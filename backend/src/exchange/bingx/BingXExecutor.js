// BingXExecutor — full trade lifecycle: open, attach SL/TP, track, close
// Handles: quantity rounding, leverage setting, fee calculation, DB recording
const BingXClient = require("./BingXClient");

// BingX trading fee: 0.045% maker, 0.075% taker (market orders = taker)
const TAKER_FEE_RATE = 0.00075; // 0.075%

class BingXExecutor {
  constructor() {
    this.client = new BingXClient({
      apiKey: process.env.BINGX_API_KEY || "",
      secret: process.env.BINGX_SECRET  || "",
    });
    this.enabled = !!(process.env.BINGX_API_KEY && process.env.BINGX_SECRET);
  }

  isEnabled() { return this.enabled; }

  // ── Round quantity to symbol's precision ─────────────────────────────────
  async _getQuantityPrecision(symbol) {
    try {
      const info = await this.client.getSymbolInfo(symbol);
      // tradeMinQuantity gives the min step size
      const minQty = parseFloat(info?.tradeMinQuantity || "0.001");
      // Calculate decimal places from min quantity
      const decimals = minQty < 1
        ? String(minQty).split(".")[1]?.length || 3
        : 0;
      return decimals;
    } catch(e) {
      return 3; // default to 3 decimal places
    }
  }

  roundQty(qty, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.floor(qty * factor) / factor;
  }

  // ── Calculate entry fee ───────────────────────────────────────────────────
  calcFee(positionSize) {
    return positionSize * TAKER_FEE_RATE;
  }

  // ── Full trade open: set leverage → market entry → attach SL → attach TP ─
  async openTrade({ symbol, direction, amountUsdt, leverage, stopLoss, takeProfit, entryPrice }) {
    if (!this.enabled) {
      return { ok: false, error: "BingX not configured — add BINGX_API_KEY and BINGX_SECRET to .env", simulated: true };
    }

    const positionSize = amountUsdt * leverage;
    const entryFee     = this.calcFee(positionSize);

    // 1. Set leverage for both sides
    await this.client.setLeverage(symbol, leverage, "LONG");
    await this.client.setLeverage(symbol, leverage, "SHORT");

    // 2. Calculate quantity (positionSize / entryPrice)
    const decimals = await this._getQuantityPrecision(symbol);
    const rawQty   = positionSize / entryPrice;
    const quantity = this.roundQty(rawQty, decimals);

    if (quantity <= 0) throw new Error(`Quantity too small: ${quantity}`);

    // 3. Place market order
    const orderResult = await this.client.placeMarketOrder({ symbol, direction, quantity });
    const orderId     = orderResult.order?.orderId || orderResult.orderId;

    // 4. Attach Stop Loss
    let slOrderId = null;
    try {
      const slResult = await this.client.placeStopLoss({ symbol, direction, quantity, stopPrice: stopLoss });
      slOrderId = slResult.order?.orderId || slResult.orderId;
    } catch(e) {
      console.warn(`⚠️ SL order failed for ${symbol}: ${e.message}`);
    }

    // 5. Attach Take Profit
    let tpOrderId = null;
    try {
      const tpResult = await this.client.placeTakeProfit({ symbol, direction, quantity, stopPrice: takeProfit });
      tpOrderId = tpResult.order?.orderId || tpResult.orderId;
    } catch(e) {
      console.warn(`⚠️ TP order failed for ${symbol}: ${e.message}`);
    }

    return {
      ok:            true,
      orderId,
      slOrderId,
      tpOrderId,
      quantity,
      positionSize,
      entryFee,
      entryFeeRate:  TAKER_FEE_RATE,
    };
  }

  // ── Close trade: cancel SL/TP then market close ───────────────────────────
  async closeTrade({ symbol, direction, quantity, exitPrice, slOrderId, tpOrderId, entryFee, positionSize }) {
    if (!this.enabled) {
      return { ok: false, error: "BingX not configured", simulated: true };
    }

    // 1. Cancel open SL and TP orders
    try { await this.client.cancelAllOrders(symbol); } catch(e) {}

    // 2. Close position at market
    await this.client.closePosition({ symbol, direction, quantity });

    // 3. Compute fees
    const exitFee      = this.calcFee(exitPrice * quantity);
    const totalFees    = (entryFee || 0) + exitFee;

    // 4. Funding fee — BingX charges every 8h, estimate 1 period
    let fundingFee = 0;
    try {
      const fr = await this.client.getFundingRate(symbol);
      const rate = parseFloat(fr?.fundingRate || "0.0001");
      fundingFee = positionSize * Math.abs(rate);
    } catch(e) {}

    return {
      ok:          true,
      exitFee,
      totalFees,
      fundingFee,
      netCostFees: totalFees + fundingFee,
    };
  }

  // ── Test API connection ───────────────────────────────────────────────────
  async testConnection() {
    return this.client.ping();
  }

  // ── Get account balance ───────────────────────────────────────────────────
  async getBalance() {
    if (!this.enabled) return { ok: false, error: "Not configured" };
    try {
      const bal = await this.client.getBalance();
      return { ok: true, data: bal };
    } catch(e) {
      return { ok: false, error: e.message };
    }
  }
}

module.exports = new BingXExecutor(); // singleton