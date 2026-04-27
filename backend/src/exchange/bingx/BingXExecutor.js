// BingXExecutor — full trade lifecycle
// FIXES:
// 1. Keys read lazily (not at startup) so .env works after restart
// 2. All numeric inputs explicitly parsed with parseFloat/parseInt
// 3. getSymbolInfo → getQuantityPrecision (correct method name)
// 4. Quantity validation with helpful error message
const BingXClient   = require("./BingXClient");
const TAKER_FEE     = 0.00075; // 0.075% taker

class BingXExecutor {
  // Fresh client on every call — reads .env keys at call time, not startup
  _client() {
    return new BingXClient({
      apiKey: process.env.BINGX_API_KEY || "",
      secret: process.env.BINGX_SECRET  || "",
    });
  }

  isEnabled() {
    return !!(process.env.BINGX_API_KEY && process.env.BINGX_SECRET);
  }

  calcFee(positionSize) { return positionSize * TAKER_FEE; }

  // ── Open trade ─────────────────────────────────────────────────────────────
  async openTrade({ symbol, direction, amountUsdt, leverage, stopLoss, takeProfit, entryPrice }) {
    if (!this.isEnabled()) {
      return {
        ok: false, simulated: true,
        error: "BingX API keys not set. Add BINGX_API_KEY and BINGX_SECRET to backend/.env and restart.",
      };
    }

    // ── Parse ALL inputs explicitly — never trust string inputs ──
    const amt   = parseFloat(amountUsdt);
    const lev   = parseInt(leverage, 10);
    const ep    = parseFloat(entryPrice);
    const sl    = parseFloat(stopLoss);
    const tp    = parseFloat(takeProfit);

    if (isNaN(amt) || amt <= 0)  throw new Error(`Invalid amountUsdt: "${amountUsdt}" — must be a positive number`);
    if (isNaN(lev) || lev <= 0)  throw new Error(`Invalid leverage: "${leverage}"`);
    if (isNaN(ep)  || ep  <= 0)  throw new Error(`Invalid entryPrice: "${entryPrice}"`);
    if (isNaN(sl)  || sl  <= 0)  throw new Error(`Invalid stopLoss: "${stopLoss}"`);
    if (isNaN(tp)  || tp  <= 0)  throw new Error(`Invalid takeProfit: "${takeProfit}"`);

    const client       = this._client();
    const positionSize = amt * lev;           // e.g. $100 × 10x = $1000 position
    const entryFee     = this.calcFee(positionSize);

    console.log(`📊 BingX openTrade: ${direction} ${symbol} | amount=$${amt} lev=${lev}x | position=$${positionSize} | entry=${ep}`);

    // 1. Set leverage
    await client.setLeverage(symbol, lev, "LONG");
    await client.setLeverage(symbol, lev, "SHORT");

    // 2. Get quantity precision from exchange
    let decimals = 3;
    try {
      decimals = await client.getQuantityPrecision(symbol);
      console.log(`📊 ${symbol} quantity precision: ${decimals} decimals`);
    } catch(e) {
      console.warn(`⚠️  Could not fetch precision for ${symbol}, using 3dp: ${e.message}`);
    }

    // 3. Calculate quantity: position value / entry price
    const rawQty  = positionSize / ep;
    const factor  = Math.pow(10, decimals);
    const quantity = Math.floor(rawQty * factor) / factor;

    console.log(`📊 Quantity calc: $${positionSize} / ${ep} = ${rawQty} → rounded to ${quantity} (${decimals}dp)`);

    if (!quantity || quantity <= 0) {
      throw new Error(
        `Quantity too small: ${quantity}. ` +
        `Position size $${positionSize} / price ${ep} = ${rawQty}. ` +
        `Try increasing your trade amount or reducing leverage.`
      );
    }

    // 4. Place market order
    const orderResult = await client.placeMarketOrder({ symbol, direction, quantity });
    const orderId     = orderResult.order?.orderId || orderResult.orderId;
    console.log(`✅ BingX market order placed: orderId=${orderId} qty=${quantity}`);

    // 5. Attach SL (non-fatal if it fails)
    let slOrderId = null;
    try {
      const slRes = await client.placeStopLoss({ symbol, direction, quantity, stopPrice: sl });
      slOrderId   = slRes.order?.orderId || slRes.orderId;
      console.log(`✅ SL attached: orderId=${slOrderId} @ ${sl}`);
    } catch(e) { console.warn(`⚠️  SL failed: ${e.message}`); }

    // 6. Attach TP (non-fatal if it fails)
    let tpOrderId = null;
    try {
      const tpRes = await client.placeTakeProfit({ symbol, direction, quantity, stopPrice: tp });
      tpOrderId   = tpRes.order?.orderId || tpRes.orderId;
      console.log(`✅ TP attached: orderId=${tpOrderId} @ ${tp}`);
    } catch(e) { console.warn(`⚠️  TP failed: ${e.message}`); }

    return { ok:true, orderId, slOrderId, tpOrderId, quantity, positionSize, entryFee, entryFeeRate:TAKER_FEE };
  }

  // ── Close trade ────────────────────────────────────────────────────────────
  async closeTrade({ symbol, direction, quantity, exitPrice, entryFee, positionSize }) {
    if (!this.isEnabled()) return { ok:false, error:"BingX not configured", simulated:true };
    const client   = this._client();
    const qty      = parseFloat(quantity);
    const ep       = parseFloat(exitPrice);
    const ps       = parseFloat(positionSize) || 0;

    try { await client.cancelAllOrders(symbol); } catch(e) {}
    await client.closePosition({ symbol, direction, quantity: qty });

    const exitFee   = this.calcFee(ep * qty);
    const totalFees = (parseFloat(entryFee) || 0) + exitFee;
    let fundingFee  = 0;
    try {
      const fr   = await client.getFundingRate(symbol);
      fundingFee = ps * Math.abs(parseFloat(fr?.fundingRate || "0.0001"));
    } catch(e) {}

    return { ok:true, exitFee, totalFees, fundingFee, netCostFees:totalFees + fundingFee };
  }

  // ── Test connection ────────────────────────────────────────────────────────
  async testConnection() {
    if (!this.isEnabled()) return { ok:false, error:"API keys not set in .env" };
    try { return await this._client().ping(); }
    catch(e) { return { ok:false, error:e.message }; }
  }

  // ── Get balance ────────────────────────────────────────────────────────────
  async getBalance() {
    if (!this.isEnabled()) return { ok:false, error:"API keys not set in backend/.env" };
    try {
      const bal = await this._client().getBalance();
      return { ok:true, data:bal };
    } catch(e) {
      return { ok:false, error:e.message };
    }
  }
}

module.exports = new BingXExecutor();