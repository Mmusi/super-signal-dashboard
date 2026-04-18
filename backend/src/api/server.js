// WebSocket Broadcaster - broadcasts real-time data to all connected React clients
const WebSocket = require("ws");

class Broadcaster {
  constructor(wss) {
    this.wss = wss;
  }

  broadcast(message) {
    const payload = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}

function createServer(httpServer) {
  const wss         = new WebSocket.Server({ server: httpServer });
  const broadcaster = new Broadcaster(wss);

  wss.on("connection", (ws) => {
    console.log("📡 Dashboard client connected");
    ws.send(JSON.stringify({ type: "CONNECTED", message: "Super Signal Dashboard Connected" }));

    ws.on("close", () => console.log("📡 Dashboard client disconnected"));
    ws.on("error", (err) => console.log("📡 WS error:", err.message));
  });

  return { wss, broadcaster };
}

module.exports = { createServer, Broadcaster };
