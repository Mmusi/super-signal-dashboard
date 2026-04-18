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
  mode:         "PAPER",

  // Alerts
  alerts:       [],

  // WS Connection
  connect() {
    if (get().ws) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("📡 WS connected");
      set({ connected: true, ws });
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

      case "HEATMAP_UPDATE":
        set({ heatmap: msg.data });
        break;

      default:
        break;
    }
  },

  // REST loaders
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
