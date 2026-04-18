import React, { useState } from "react";
import TopSignals    from "../components/signals/TopSignals";
import SignalScanner from "../components/signals/SignalScanner";
import HeatmapChart  from "../components/chart/HeatmapChart";
import HealthPanel   from "../components/risk/HealthPanel";
import KillSwitch    from "../components/control/KillSwitch";
import TradingChart  from "../components/chart/TradingChart";
import SignalCard    from "../components/signals/SignalCard";
import RegimeBadge   from "../components/market/RegimeBadge";
import { useStore }  from "../store/useStore";

const TABS    = ["Signal Overview", "Trading Chart"];
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "LINKUSDT", "ARBUSDT"];

function MarketOverviewPanel() {
  const { signals } = useStore();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {SYMBOLS.map(sym => {
          const sig    = signals.find(s => (s.asset || s.symbol) === sym);
          const regime = sig?.context?.regime?.type || sig?.regime;
          const score  = sig?.signal?.score || sig?.score || 0;
          const action = sig?.signal?.action || sig?.action || "—";
          return (
            <div key={sym} className="signal-card py-2 px-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-bright">{sym.replace("USDT","")}</span>
                {regime && <RegimeBadge regime={regime} />}
              </div>
              {score > 0 ? (
                <>
                  <div className="text-lg font-extrabold" style={{
                    color: score >= 85 ? "#22c55e" : score >= 75 ? "#f59e0b" : "#6b7280"
                  }}>{score}</div>
                  <div className="text-xs text-muted">{action}</div>
                  <div className="score-bar mt-1">
                    <div className="score-bar-fill" style={{
                      width: `${score}%`,
                      background: score >= 85 ? "#22c55e" : score >= 75 ? "#f59e0b" : "#374151"
                    }} />
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted mt-1">Scanning...</div>
              )}
            </div>
          );
        })}
      </div>

      {signals.filter(s => (s.signal?.score || s.score || 0) >= 60).length > 0 && (
        <div>
          <div className="text-xs font-bold text-muted uppercase tracking-widest mb-2">
            🔥 Active Opportunities
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {signals
              .filter(s => (s.signal?.score || s.score || 0) >= 60)
              .sort((a, b) => (b.signal?.score || b.score || 0) - (a.signal?.score || a.score || 0))
              .slice(0, 6)
              .map((s, i) => <SignalCard key={i} signal={s} highlight={i === 0} />)
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { connected, signals } = useStore();
  const [activeTab, setActiveTab] = useState(1);

  const strongCount  = signals.filter(s => (s.signal?.score || s.score || 0) >= 85).length;
  const watchCount   = signals.filter(s => { const sc = s.signal?.score || s.score || 0; return sc >= 75 && sc < 85; }).length;
  const noTradeCount = signals.filter(s => (s.signal?.action || s.action) === "NO_TRADE").length;

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Active Signals" value={signals.length} icon="📡" />
        <StatCard label="Strong (85+)"   value={strongCount}    icon="🔥" color="text-green-400" />
        <StatCard label="Watch (75-84)"  value={watchCount}     icon="👁" color="text-yellow-400" />
        <StatCard label="No Trade"       value={noTradeCount}   icon="⛔" color="text-muted" />
      </div>

      {/* ── Tabbed panel ── */}
      <div className="signal-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="flex border-b border-border">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${
                activeTab === i
                  ? "border-accent text-accent bg-accent/5"
                  : "border-transparent text-muted hover:text-bright"
              }`}
            >{tab}</button>
          ))}
        </div>
        <div className="p-4">
          {activeTab === 0 && <MarketOverviewPanel />}
          {activeTab === 1 && <TradingChart />}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <TopSignals />
          <KillSwitch />
        </div>
        <div className="lg:col-span-1">
          <SignalScanner />
        </div>
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