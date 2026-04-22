// app.js - SUPER SIGNAL DASHBOARD — Main Entry Point
// Startup sequence:
//   1. Init DB
//   2. Create HTTP + WS servers
//   3. Boot intelligence engine
//   4. Wire broadcaster to signal router
//   5. Start listening
require("dotenv").config();

const http    = require("http");
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const path    = require("path");

const { initDB }           = require("./src/db/init");
const { initManualTrades, migrateBingXColumns } = require("./src/db/manualTradeRepository");  // NEW
const { createServer }     = require("./src/api/server");
const { startEngine }      = require("./src/engines/live/EngineOrchestrator");
const { setBroadcaster }   = require("./src/engines/live/SignalRouter");
const { setBroadcaster: setMarketBroadcaster } = require("./src/engines/MarketBrain");

const signalsRoute     = require("./src/api/routes/signals");
const marketRoute      = require("./src/api/routes/market");
const performanceRoute = require("./src/api/routes/performance");
const controlRoute     = require("./src/api/routes/control");
const tradesRoute      = require("./src/api/routes/trades");  // NEW

const PORT = process.env.PORT || 3001;

async function main() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   🔥  SUPER SIGNAL DASHBOARD v1.0   ║");
  console.log("╚══════════════════════════════════════╝\n");

  // 1. Init database
  initDB();
  initManualTrades();
  migrateBingXColumns(); // adds BingX columns to existing DB safely

  // 2. Express app
  const app = express();
  app.use(cors());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json());

  // REST routes
  app.use("/api/signals",     signalsRoute);
  app.use("/api/market",      marketRoute);
  app.use("/api/performance", performanceRoute);
  app.use("/api/control",     controlRoute);
  app.use("/api/trades",      tradesRoute);  // NEW

  // Health ping
  app.get("/ping", (req, res) => res.json({ ok: true, ts: Date.now() }));

  // 3. HTTP server + WebSocket broadcaster
  const httpServer        = http.createServer(app);
  const { broadcaster }   = createServer(httpServer);

  // 4. Wire broadcaster to signal + market engines
  setBroadcaster(broadcaster);
  setMarketBroadcaster(broadcaster);

  // 5. Start HTTP server first, then boot engine
  httpServer.listen(PORT, async () => {
    console.log(`\n🟢 API Server   : http://localhost:${PORT}`);
    console.log(`🟢 WebSocket    : ws://localhost:${PORT}`);
    console.log(`🟢 Ping         : http://localhost:${PORT}/ping\n`);

    // Boot intelligence engine
    await startEngine(broadcaster);
  });
}

main().catch((err) => {
  console.error("❌ Fatal startup error:", err);
  process.exit(1);
});