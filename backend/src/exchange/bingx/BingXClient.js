// BingX Perpetual Futures Client
// Docs: https://bingx-api.github.io/docs/
// All endpoints are for Standard Perpetual (swap) contracts
const axios  = require("axios");
const crypto = require("crypto");

const BASE = "https://open-api.bingx.com";

class BingXClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.secret = config.secret;
  }

  // HMAC-SHA256 signature
  _sign(payload) {
    return crypto
      .createHmac("sha256", this.secret)
      .update(payload)
      .digest("hex");
  }

  // Build signed query string
  _params(obj) {
    const ts = Date.now();
    const base = { ...obj, timestamp: ts };
    const qs = Object.keys(base)
      .sort()
      .map(k => `${k}=${base[k]}`)
      .join("&");
    const sig = this._sign(qs);
    return `${qs}&signature=${sig}`;
  }

  async _get(path, params = {}) {
    const qs = this._params(params);
    const res = await axios.get(`${BASE}${path}?${qs}`, {
      headers: { "X-BX-APIKEY": this.apiKey },
      timeout: 8000,
    });
    return res.data;
  }

  async _post(path, params = {}) {
    const qs = this._params(params);
    const res = await axios.post(`${BASE}${path}?${qs}`, {}, {
      headers: {
        "X-BX-APIKEY": this.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 8000,
    });
    return res.data;
  }

  // ── Account ──────────────────────────────────────────────────────────────
  async getBalance() {
    const data = await this._get("/openApi/swap/v2/user/balance");
    if (data.code !== 0) throw new Error(`BingX balance error: ${data.msg}`);
    return data.data;
  }

  async getPositions(symbol = null) {
    const params = symbol ? { symbol } : {};
    const data = await this._get("/openApi/swap/v2/user/positions", params);
    if (data.code !== 0) throw new Error(`BingX positions error: ${data.msg}`);
    return data.data;
  }

  // ── Set leverage ─────────────────────────────────────────────────────────
  async setLeverage(symbol, leverage, side = "LONG") {
    // BingX requires setting leverage separately for LONG and SHORT
    const data = await this._post("/openApi/swap/v2/trade/leverage", {
      symbol,
      side,     // "LONG" | "SHORT"
      leverage: String(leverage),
    });
    if (data.code !== 0) throw new Error(`BingX setLeverage error: ${data.msg}`);
    return data.data;
  }

  // ── Place market order ────────────────────────────────────────────────────
  // direction: "LONG" | "SHORT"
  // positionSide is always the same as direction for one-way mode
  async placeMarketOrder({ symbol, direction, quantity, reduceOnly = false }) {
    // BingX swap: side = BUY/SELL, positionSide = LONG/SHORT
    const side         = direction === "LONG" ? "BUY" : "SELL";
    const positionSide = direction; // LONG or SHORT

    const data = await this._post("/openApi/swap/v2/trade/order", {
      symbol,
      side,
      positionSide,
      type:       "MARKET",
      quantity:   String(quantity),
      reduceOnly: reduceOnly ? "true" : "false",
    });
    if (data.code !== 0) throw new Error(`BingX order error: ${data.msg}`);
    return data.data;
  }

  // ── Place Stop Loss order ─────────────────────────────────────────────────
  async placeStopLoss({ symbol, direction, quantity, stopPrice }) {
    const side         = direction === "LONG" ? "SELL" : "BUY"; // opposite to close
    const positionSide = direction;
    const data = await this._post("/openApi/swap/v2/trade/order", {
      symbol,
      side,
      positionSide,
      type:       "STOP_MARKET",
      quantity:   String(quantity),
      stopPrice:  String(stopPrice),
      reduceOnly: "true",
    });
    if (data.code !== 0) throw new Error(`BingX SL error: ${data.msg}`);
    return data.data;
  }

  // ── Place Take Profit order ───────────────────────────────────────────────
  async placeTakeProfit({ symbol, direction, quantity, stopPrice }) {
    const side         = direction === "LONG" ? "SELL" : "BUY";
    const positionSide = direction;
    const data = await this._post("/openApi/swap/v2/trade/order", {
      symbol,
      side,
      positionSide,
      type:       "TAKE_PROFIT_MARKET",
      quantity:   String(quantity),
      stopPrice:  String(stopPrice),
      reduceOnly: "true",
    });
    if (data.code !== 0) throw new Error(`BingX TP error: ${data.msg}`);
    return data.data;
  }

  // ── Cancel all orders for symbol ─────────────────────────────────────────
  async cancelAllOrders(symbol) {
    const data = await this._post("/openApi/swap/v2/trade/allOpenOrders", { symbol });
    return data;
  }

  // ── Close position (market) ───────────────────────────────────────────────
  async closePosition({ symbol, direction, quantity }) {
    return this.placeMarketOrder({ symbol, direction, quantity, reduceOnly: true });
  }

  // ── Get order info ────────────────────────────────────────────────────────
  async getOrder(symbol, orderId) {
    const data = await this._get("/openApi/swap/v2/trade/order", { symbol, orderId });
    if (data.code !== 0) throw new Error(`BingX getOrder error: ${data.msg}`);
    return data.data;
  }

  // ── Symbol info (for quantity precision) ─────────────────────────────────
  async getSymbolInfo(symbol) {
    const data = await this._get("/openApi/swap/v2/quote/contracts");
    if (data.code !== 0) throw new Error(`BingX contracts error: ${data.msg}`);
    const info = (data.data || []).find(c => c.symbol === symbol);
    return info || null;
  }

  // ── Get funding fees for a symbol ─────────────────────────────────────────
  async getFundingRate(symbol) {
    const data = await this._get("/openApi/swap/v2/quote/fundingRate", { symbol });
    if (data.code !== 0) throw new Error(`BingX fundingRate error: ${data.msg}`);
    return data.data;
  }

  // ── Test connectivity ──────────────────────────────────────────────────────
  async ping() {
    try {
      const data = await this._get("/openApi/swap/v2/server/time");
      return { ok: true, serverTime: data.data?.serverTime };
    } catch(e) {
      return { ok: false, error: e.message };
    }
  }
}

module.exports = BingXClient;