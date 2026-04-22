// BingX Perpetual Futures Client — v2 API
// CRITICAL: BingX perpetual symbols use hyphen format: "BTC-USDT" not "BTCUSDT"
const axios  = require("axios");
const crypto = require("crypto");

const BASE = "https://open-api.bingx.com";

// Convert "BTCUSDT" → "BTC-USDT" for BingX perpetual API
function toBingXSymbol(symbol) {
  if (symbol.includes("-")) return symbol; // already correct
  // Common pairs
  const quote = symbol.endsWith("USDT") ? "USDT" : symbol.endsWith("USDC") ? "USDC" : "USDT";
  const base  = symbol.slice(0, symbol.length - quote.length);
  return `${base}-${quote}`;
}

class BingXClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.secret = config.secret;
  }

  _sign(payload) {
    return crypto.createHmac("sha256", this.secret).update(payload).digest("hex");
  }

  // BingX requires params sorted, joined, then signed
  _buildQS(obj) {
    const ts   = Date.now();
    const base = { ...obj, timestamp: ts };
    const qs   = Object.keys(base).sort().map(k => `${k}=${base[k]}`).join("&");
    return `${qs}&signature=${this._sign(qs)}`;
  }

  async _get(path, params = {}) {
    const qs  = this._buildQS(params);
    const res = await axios.get(`${BASE}${path}?${qs}`, {
      headers: { "X-BX-APIKEY": this.apiKey },
      timeout: 10000,
    });
    return res.data;
  }

  // BingX POST: params go in the query string (not body) per their docs
  async _post(path, params = {}) {
    const qs  = this._buildQS(params);
    const res = await axios.post(`${BASE}${path}?${qs}`, null, {
      headers: { "X-BX-APIKEY": this.apiKey, "Content-Type": "application/json" },
      timeout: 10000,
    });
    return res.data;
  }

  // ── Account ───────────────────────────────────────────────────────────────
  async getBalance() {
    const d = await this._get("/openApi/swap/v2/user/balance");
    if (d.code !== 0) throw new Error(`getBalance: ${d.msg} (code ${d.code})`);
    return d.data;
  }

  async getPositions(symbol = null) {
    const params = symbol ? { symbol: toBingXSymbol(symbol) } : {};
    const d = await this._get("/openApi/swap/v2/user/positions", params);
    if (d.code !== 0) throw new Error(`getPositions: ${d.msg}`);
    return d.data;
  }

  // ── Leverage ──────────────────────────────────────────────────────────────
  async setLeverage(symbol, leverage, side) {
    const d = await this._post("/openApi/swap/v2/trade/leverage", {
      symbol:   toBingXSymbol(symbol),
      side,               // "LONG" | "SHORT"
      leverage: String(leverage),
    });
    // code 0 = ok, ignore "no change" errors gracefully
    if (d.code !== 0 && !d.msg?.includes("same")) {
      console.warn(`setLeverage warning: ${d.msg}`);
    }
    return d.data;
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  async placeMarketOrder({ symbol, direction, quantity, reduceOnly = false }) {
    const side         = direction === "LONG" ? "BUY" : "SELL";
    const positionSide = direction; // LONG | SHORT (hedge mode)
    const d = await this._post("/openApi/swap/v2/trade/order", {
      symbol:       toBingXSymbol(symbol),
      side,
      positionSide,
      type:         "MARKET",
      quantity:     String(quantity),
      ...(reduceOnly ? { reduceOnly: "true" } : {}),
    });
    if (d.code !== 0) throw new Error(`placeMarketOrder: ${d.msg} (code ${d.code})`);
    return d.data;
  }

  async placeStopLoss({ symbol, direction, quantity, stopPrice }) {
    const side         = direction === "LONG" ? "SELL" : "BUY";
    const positionSide = direction;
    const d = await this._post("/openApi/swap/v2/trade/order", {
      symbol:       toBingXSymbol(symbol),
      side,
      positionSide,
      type:         "STOP_MARKET",
      quantity:     String(quantity),
      stopPrice:    String(parseFloat(stopPrice).toFixed(2)),
      reduceOnly:   "true",
    });
    if (d.code !== 0) throw new Error(`placeStopLoss: ${d.msg} (code ${d.code})`);
    return d.data;
  }

  async placeTakeProfit({ symbol, direction, quantity, stopPrice }) {
    const side         = direction === "LONG" ? "SELL" : "BUY";
    const positionSide = direction;
    const d = await this._post("/openApi/swap/v2/trade/order", {
      symbol:       toBingXSymbol(symbol),
      side,
      positionSide,
      type:         "TAKE_PROFIT_MARKET",
      quantity:     String(quantity),
      stopPrice:    String(parseFloat(stopPrice).toFixed(2)),
      reduceOnly:   "true",
    });
    if (d.code !== 0) throw new Error(`placeTakeProfit: ${d.msg} (code ${d.code})`);
    return d.data;
  }

  async cancelAllOrders(symbol) {
    const d = await this._post("/openApi/swap/v2/trade/allOpenOrders", {
      symbol: toBingXSymbol(symbol),
    });
    return d;
  }

  async closePosition({ symbol, direction, quantity }) {
    return this.placeMarketOrder({ symbol, direction, quantity, reduceOnly: true });
  }

  // ── Symbol precision ──────────────────────────────────────────────────────
  async getQuantityPrecision(symbol) {
    try {
      const d = await this._get("/openApi/swap/v2/quote/contracts");
      if (d.code !== 0) return 3;
      const bxSym = toBingXSymbol(symbol);
      const info  = (d.data || []).find(c => c.symbol === bxSym);
      if (!info) return 3;
      const minQty   = parseFloat(info.tradeMinQuantity || "0.001");
      const decimals = minQty < 1 ? (String(minQty).split(".")[1]?.length || 3) : 0;
      return decimals;
    } catch(e) {
      return 3;
    }
  }

  async getFundingRate(symbol) {
    try {
      const d = await this._get("/openApi/swap/v2/quote/fundingRate", {
        symbol: toBingXSymbol(symbol),
      });
      if (d.code !== 0) return null;
      return d.data;
    } catch(e) {
      return null;
    }
  }

  async ping() {
    try {
      const d = await this._get("/openApi/swap/v2/server/time");
      return { ok: d.code === 0, serverTime: d.data?.serverTime };
    } catch(e) {
      return { ok: false, error: e.message };
    }
  }
}

module.exports = BingXClient;