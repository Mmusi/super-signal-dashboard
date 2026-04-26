// BingXExecutor — full trade lifecycle with lazy key loading
// Keys are read from process.env on EVERY call (not just at startup)
// This means adding .env and restarting backend is sufficient — no code change needed
const BingXClient = require("./BingXClient");

const TAKER_FEE_RATE = 0.00075; // 0.075% taker fee

class BingXExecutor {
  // Build a fresh client each call so keys are always current
  _client() {
    const apiKey = process.env.BINGX_API_KEY || "";
    const secret = process.env.BINGX_SECRET  || "";
    return new BingXClient({ apiKey, secret });
  }

  isEnabled() {
    return !!(process.env.BINGX_API_KEY && process.env.BINGX_SECRET);
  }

  // ── Quantity precision ────────────────────────────────────────────────────
  async _getQuantityPrecision(symbol) {
    try {
      const info = await this._client().getSymbolInfo(symbol);
      const minQty = parseFloat(info?.tradeMinQuantity || "0.001");
      const decimals = minQty < 1 ? (String(minQty).split(".")[1]?.length || 3) : 0;
      return decimals;
    } catch(e) { return 3; }
  }

  roundQty(qty, decimals) {
    const f = Math.pow(10, decimals);
    return Math.floor(qty * f) / f;
  }

  calcFee(positionSize) { return positionSize * TAKER_FEE_RATE; }

  // ── Open trade ────────────────────────────────────────────────────────────
  async openTrade({ symbol, direction, amountUsdt, leverage, stopLoss, takeProfit, entryPrice }) {
    if (!this.isEnabled()) {
      return {
        ok: false, simulated: true,
        error: "BingX API keys not set. Add BINGX_API_KEY and BINGX_SECRET to your .env file and restart the backend.",
      };
    }

    const client = this._client();
    const positionSize = amountUsdt * leverage;
    const entryFee     = this.calcFee(positionSize);

    // Set leverage both sides (hedge mode)
    await client.setLeverage(symbol, leverage, "LONG");
    await client.setLeverage(symbol, leverage, "SHORT");

    // Calculate quantity
    const decimals = await this._getQuantityPrecision(symbol);
    const quantity  = this.roundQty(positionSize / entryPrice, decimals);
    if (quantity <= 0) throw new Error(`Quantity too small: ${quantity} — increase trade amount or reduce leverage`);

    // Place entry market order
    const orderResult = await client.placeMarketOrder({ symbol, direction, quantity });
    const orderId     = orderResult.order?.orderId || orderResult.orderId;
    console.log(`✅ BingX entry: ${direction} ${symbol} qty=${quantity} orderId=${orderId}`);

    // Attach SL
    let slOrderId = null;
    try {
      const slResult = await client.placeStopLoss({ symbol, direction, quantity, stopPrice: stopLoss });
      slOrderId = slResult.order?.orderId || slResult.orderId;
      console.log(`✅ BingX SL attached: orderId=${slOrderId}`);
    } catch(e) { console.warn(`⚠️  BingX SL failed: ${e.message}`); }

    // Attach TP
    let tpOrderId = null;
    try {
      const tpResult = await client.placeTakeProfit({ symbol, direction, quantity, stopPrice: takeProfit });
      tpOrderId = tpResult.order?.orderId || tpResult.orderId;
      console.log(`✅ BingX TP attached: orderId=${tpOrderId}`);
    } catch(e) { console.warn(`⚠️  BingX TP failed: ${e.message}`); }

    return { ok:true, orderId, slOrderId, tpOrderId, quantity, positionSize, entryFee, entryFeeRate:TAKER_FEE_RATE };
  }

  // ── Close trade ───────────────────────────────────────────────────────────
  async closeTrade({ symbol, direction, quantity, exitPrice, entryFee, positionSize }) {
    if (!this.isEnabled()) return { ok:false, error:"BingX not configured", simulated:true };
    const client = this._client();
    try { await client.cancelAllOrders(symbol); } catch(e) {}
    await client.closePosition({ symbol, direction, quantity });
    const exitFee    = this.calcFee(exitPrice * quantity);
    const totalFees  = (entryFee||0) + exitFee;
    let fundingFee   = 0;
    try {
      const fr = await client.getFundingRate(symbol);
      fundingFee = positionSize * Math.abs(parseFloat(fr?.fundingRate||"0.0001"));
    } catch(e) {}
    return { ok:true, exitFee, totalFees, fundingFee, netCostFees:totalFees+fundingFee };
  }

  // ── Test connection ────────────────────────────────────────────────────────
  async testConnection() {
    if (!this.isEnabled()) return { ok:false, error:"API keys not configured in .env" };
    try { return await this._client().ping(); }
    catch(e) { return { ok:false, error:e.message }; }
  }

  // ── Get balance ────────────────────────────────────────────────────────────
  async getBalance() {
    if (!this.isEnabled()) return { ok:false, error:"API keys not configured in .env" };
    try {
      const bal = await this._client().getBalance();
      return { ok:true, data:bal };
    } catch(e) { return { ok:false, error:e.message }; }
  }
}

module.exports = new BingXExecutor();