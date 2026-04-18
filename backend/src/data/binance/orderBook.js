// Order Book Stream - Binance depth10 stream for liquidity proxy
const { createWS } = require("./wsClient");
const { normalizeOrderBook, buildHeatmap } = require("../../core/liquidity/HeatmapEngine");

function startOrderBook(symbol, onDepth) {
  const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth10@100ms`;

  createWS(url, (depth) => {
    onDepth({
      bids: depth.b,
      asks: depth.a,
      time: depth.E
    });
  });
}

function startHeatmapStream(symbol, broadcast) {
  const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth10@100ms`;

  createWS(url, (depth) => {
    if (!depth.b || !depth.a) return;
    const normalized = normalizeOrderBook(depth.b, depth.a);
    const heatmap = buildHeatmap(normalized);

    broadcast({
      type: "HEATMAP_UPDATE",
      symbol: symbol.toUpperCase(),
      data: heatmap
    });
  });
}

module.exports = { startOrderBook, startHeatmapStream };
