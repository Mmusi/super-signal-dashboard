// Binance REST Client - fetches historical candles via REST API
const axios = require("axios");

const BASE_URL = "https://api.binance.com";

async function getKlines(symbol, interval = "1m", limit = 200) {
  try {
    const res = await axios.get(`${BASE_URL}/api/v3/klines`, {
      params: { symbol: symbol.toUpperCase(), interval, limit }
    });

    return res.data.map(k => ({
      time:   k[0],
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (err) {
    console.error("REST error:", err.message);
    return [];
  }
}

async function getTicker(symbol) {
  try {
    const res = await axios.get(`${BASE_URL}/api/v3/ticker/price`, {
      params: { symbol: symbol.toUpperCase() }
    });
    return res.data;
  } catch (err) {
    console.error("Ticker error:", err.message);
    return null;
  }
}

module.exports = { getKlines, getTicker };
