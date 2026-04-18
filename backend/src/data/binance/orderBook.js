// Order Book Stream - Binance depth stream for liquidity heatmap
// NOTE: @depth10@100ms (partial book) returns { bids:[], asks:[] }
//       @depth (diff stream) returns { b:[], a:[] }
//       We use the partial book stream - so keys are bids/asks not b/a

const { createWS } = require("./wsClient");
const { normalizeOrderBook, buildHeatmap } = require("../../core/liquidity/HeatmapEngine");

function startOrderBook(symbol, onDepth) {
  const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth10@100ms`;

  createWS(url, (depth) => {
    // Partial book depth stream uses bids/asks keys
    const bids = depth.bids || depth.b;
    const asks = depth.asks || depth.a;
    if (!bids || !asks) return;
    onDepth({ bids, asks, time: depth.T || depth.E || Date.now() });
  });
}

function startHeatmapStream(symbol, broadcast) {
  const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth10@100ms`;
  console.log(`📊 Starting heatmap stream: ${url}`);

  createWS(url, (depth) => {
    // Partial book depth stream uses bids/asks keys (NOT b/a)
    const bids = depth.bids || depth.b;
    const asks = depth.asks || depth.a;

    if (!bids || !asks || bids.length === 0) {
      console.log("⚠️  Heatmap: unexpected depth payload keys:", Object.keys(depth));
      return;
    }

    const normalized = normalizeOrderBook(bids, asks);
    const heatmap    = buildHeatmap(normalized);

    broadcast({
      type:   "HEATMAP_UPDATE",
      symbol: symbol.toUpperCase(),
      data:   heatmap
    });
  });
}

module.exports = { startOrderBook, startHeatmapStream };