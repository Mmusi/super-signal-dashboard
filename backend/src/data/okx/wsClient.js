// OKX WebSocket Client - stubbed for future multi-exchange support
const WebSocket = require("ws");

function createOKXWS(url, onMessage) {
  const ws = new WebSocket(url);

  ws.on("open", () => console.log("✅ OKX WS Connected:", url));
  ws.on("message", (data) => {
    try { onMessage(JSON.parse(data)); } catch (e) {}
  });
  ws.on("close", () => {
    setTimeout(() => createOKXWS(url, onMessage), 3000);
  });
  ws.on("error", (err) => console.log("❌ OKX WS Error:", err.message));

  return ws;
}

module.exports = { createOKXWS };
