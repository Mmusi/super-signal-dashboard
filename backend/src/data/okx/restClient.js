// OKX REST Client - fetches market data from OKX public API
const axios = require("axios");

const BASE_URL = "https://www.okx.com";

async function getCandles(instId = "BTC-USDT", bar = "1m", limit = 100) {
  try {
    const res = await axios.get(`${BASE_URL}/api/v5/market/candles`, {
      params: { instId, bar, limit }
    });
    return (res.data.data || []).map(k => ({
      time:   parseInt(k[0]),
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (err) {
    console.error("OKX REST error:", err.message);
    return [];
  }
}

module.exports = { getCandles };
