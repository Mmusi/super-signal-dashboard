// Central Zustand store — single source of truth for all dashboard state
import { create } from "zustand";

const WS_URL = "ws://localhost:3001";

export const useStore = create((set, get) => ({
  // Connection
  connected:    false,
  ws:           null,

  // Signals
  signals:      [],
  topSignals:   [],

  // Market
  heatmap:      null,
  candles:      {},

  // Performance
  trades:       [],
  report:       null,
  health:       null,

  // Control
  killSwitch:   false,
  mode:          "PAPER",
  bingxStatus:   null,  // { configured, ping, balance }

  // Alerts
  alerts:       [],

  // WS Connection
  connect() {
    if (get().ws) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("📡 WS connected");
      set({ connected: true, ws });
      // Hydrate signals and heatmap immediately via REST
      get().loadSignals();
      get().loadHeatmap("BTCUSDT");
      get().loadMode();
      get().loadBingXStatus();
    };

    ws.onclose = () => {
      console.log("📡 WS disconnected — reconnecting...");
      set({ connected: false, ws: null });
      setTimeout(() => get().connect(), 3000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        get().handleMessage(msg);
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    set({ ws });
  },

  handleMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case "SIGNAL_UPDATE":
        set((s) => {
          const existing = s.signals.filter(x => x.asset !== msg.data.asset);
          const updated  = [msg.data, ...existing].slice(0, 20);
          const alerts   = [
            { id: Date.now(), ...msg.data },
            ...s.alerts
          ].slice(0, 10);
          return { signals: updated, topSignals: updated.slice(0, 3), alerts };
        });
        break;

      case "SCANNER_UPDATE":
        set({ signals: msg.data || [], topSignals: (msg.data || []).slice(0, 3) });
        break;

      case "CANDLES_UPDATE":
        set((s) => ({ candles: { ...s.candles, [`${msg.symbol}_1m`]: msg.data } }));
        break;

      case "HEATMAP_UPDATE":
        set({ heatmap: msg.data });
        break;

      default:
        break;
    }
  },

  // REST loaders
  async loadSignals() {
    try {
      const r = await fetch("/api/signals");
      const j = await r.json();
      if (j.ok && j.data && j.data.length > 0) {
        set({ signals: j.data, topSignals: j.data.slice(0, 3) });
      }
    } catch (e) {
      console.warn("loadSignals failed:", e);
    }
  },

  async loadMode() {
    try {
      const r = await fetch("/api/control/status");
      const j = await r.json();
      if (j.ok) set({ mode: j.mode });
    } catch(e) { console.warn("loadMode failed:", e); }
  },

  async loadBingXStatus() {
    try {
      const r = await fetch("/api/trades/bingx-status");
      const j = await r.json();
      if (j.ok) set({ bingxStatus: j });
    } catch(e) { console.warn("loadBingXStatus failed:", e); }
  },

  async loadHeatmap(symbol = "BTCUSDT") {
    try {
      const r = await fetch(`/api/market/orderbook/${symbol}`);
      const j = await r.json();
      if (j.ok) set({ heatmap: j.data });
    } catch (e) {
      console.warn("loadHeatmap failed:", e);
    }
  },

  async loadCandles(symbol = "BTCUSDT", tf = "1m") {
    try {
      const limit = ["1w","1M"].includes(tf) ? 60 : ["4h"].includes(tf) ? 120 : 150;
      const r = await fetch(`/api/market/candles/${symbol}?tf=${tf}&limit=${limit}`);
      const j = await r.json();
      if (j.ok) set((s) => ({ candles: { ...s.candles, [`${symbol}_${tf}`]: j.data } }));
    } catch (e) {
      console.warn("loadCandles failed:", e);
    }
  },

  async loadTrades() {
    const r = await fetch("/api/performance/trades?limit=50");
    const j = await r.json();
    if (j.ok) set({ trades: j.data });
  },

  async loadReport() {
    const r = await fetch("/api/performance/report");
    const j = await r.json();
    if (j.ok) set({ report: j.data });
  },

  async loadHealth() {
    const r = await fetch("/api/performance/health");
    const j = await r.json();
    if (j.ok) set({ health: j.data });
  },

  async engageKillSwitch() {
    await fetch("/api/control/kill", { method: "POST" });
    set({ killSwitch: true });
  },

  async disengageKillSwitch() {
    await fetch("/api/control/resume", { method: "POST" });
    set({ killSwitch: false });
  }
}));