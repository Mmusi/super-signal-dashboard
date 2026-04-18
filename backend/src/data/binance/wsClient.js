// Binance WebSocket Client - core WS connection with auto-reconnect
const WebSocket = require("ws");

function createWS(url, onMessage) {
  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("✅ Connected:", url);
  });

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data);
      onMessage(parsed);
    } catch (e) {
      console.error("WS parse error:", e.message);
    }
  });

  ws.on("close", () => {
    console.log("⚠️ Disconnected. Reconnecting in 3s...");
    setTimeout(() => createWS(url, onMessage), 3000);
  });

  ws.on("error", (err) => {
    console.log("❌ WS Error:", err.message);
  });

  return ws;
}

module.exports = { createWS };
