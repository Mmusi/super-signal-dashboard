import React from "react";
import TopSignals   from "../components/signals/TopSignals";
import SignalScanner from "../components/signals/SignalScanner";
import HeatmapChart from "../components/chart/HeatmapChart";
import HealthPanel  from "../components/risk/HealthPanel";
import KillSwitch   from "../components/control/KillSwitch";
import { useStore } from "../store/useStore";

export default function Dashboard() {
  const { connected, signals } = useStore();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">🔥 Super Signal Dashboard</h1>
          <p className="text-xs text-muted mt-0.5">Institutional-grade signal intelligence — real-time</p>
        </div>
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded border ${
          connected
            ? "border-accent/30 bg-accent/10 text-accent"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-accent pulse-green" : "bg-red-400"}`} />
          {connected ? "LIVE ENGINE CONNECTED" : "RECONNECTING..."}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Active Signals" value={signals.length}    icon="📡" />
        <StatCard label="Strong (85+)"   value={signals.filter(s => (s.signal?.score || s.score || 0) >= 85).length} icon="🔥" color="text-green-400" />
        <StatCard label="Watch (75-84)"  value={signals.filter(s => { const sc = s.signal?.score || s.score || 0; return sc >= 75 && sc < 85; }).length} icon="👁" color="text-yellow-400" />
        <StatCard label="No Trade"       value={signals.filter(s => (s.signal?.action || s.action) === "NO_TRADE").length} icon="⛔" color="text-muted" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left — top signals */}
        <div className="lg:col-span-1 space-y-4">
          <TopSignals />
          <KillSwitch />
        </div>

        {/* Center — full scanner */}
        <div className="lg:col-span-1">
          <SignalScanner />
        </div>

        {/* Right — heatmap + health */}
        <div className="lg:col-span-1 space-y-4">
          <HeatmapChart />
          <HealthPanel />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = "text-bright" }) {
  return (
    <div className="signal-card flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <div className={`text-xl font-extrabold ${color}`}>{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}
