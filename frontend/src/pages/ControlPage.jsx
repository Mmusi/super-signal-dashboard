import React, { useState, useEffect } from "react";
import KillSwitch from "../components/control/KillSwitch";
import { useStore } from "../store/useStore";


// ── BingX Status Panel ────────────────────────────────────────────────────────
function BingXStatusPanel({ status, mode, onRefresh, refreshing }) {
  const configured  = status?.configured;
  const pingOk      = status?.ping?.ok;
  const balance     = status?.balance?.data;
  const balanceAmt  = balance?.balance?.balance || balance?.availableMargin || null;
  const isLive      = mode === "LIVE";

  return (
    <div className="signal-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest">
          ⚡ BingX Connection
        </h2>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-xs px-3 py-1 rounded border border-border text-muted hover:text-bright transition-colors"
        >
          {refreshing ? "Checking..." : "↺ Test Connection"}
        </button>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label:"API Keys",    value:configured?"✅ Configured":"❌ Not set",       color:configured?"text-green-400":"text-red-400"   },
          { label:"Connection",  value:pingOk?"✅ Connected":"❌ Unreachable",         color:pingOk?"text-green-400":"text-red-400"        },
          { label:"System Mode", value:isLive?"⚡ LIVE":"📝 PAPER/TEST",              color:isLive?"text-red-400":"text-yellow-400"       },
        ].map(x=>(
          <div key={x.label} className="bg-border/30 rounded p-3 text-center">
            <div className="text-xs text-muted mb-1">{x.label}</div>
            <div className={`text-sm font-bold ${x.color}`}>{x.value}</div>
          </div>
        ))}
      </div>

      {/* Balance */}
      {configured && pingOk && (
        <div className="rounded p-3 mb-4" style={{ background:"rgba(34,197,94,0.06)", border:"1px solid #22c55e33" }}>
          <div className="text-xs text-muted mb-1">Available Balance (Perpetual Account)</div>
          <div className="text-2xl font-extrabold font-mono text-green-400">
            {balanceAmt ? `$${parseFloat(balanceAmt).toFixed(2)} USDT` : "Fetching..."}
          </div>
          {balance && (
            <div className="text-xs text-muted mt-1">
              Equity: ${parseFloat(balance?.balance?.equity || balance?.equity || 0).toFixed(2)} USDT
            </div>
          )}
        </div>
      )}

      {/* Setup instructions when not configured */}
      {!configured && (
        <div className="rounded p-4 mb-4 space-y-3" style={{ background:"rgba(239,68,68,0.06)", border:"1px solid #ef444433" }}>
          <div className="text-sm font-bold text-red-400">⚠️ BingX API not configured</div>
          <div className="text-xs text-muted leading-relaxed">
            To enable live trading, create a <code className="text-bright bg-border px-1 rounded">.env</code> file
            in your <code className="text-bright bg-border px-1 rounded">backend/</code> folder with:
          </div>
          <div className="rounded p-3 font-mono text-xs" style={{ background:"#0b0e14", border:"1px solid #1e293b" }}>
            <div className="text-green-400">BINGX_API_KEY=your_key_here</div>
            <div className="text-green-400">BINGX_SECRET=your_secret_here</div>
            <div className="text-muted mt-1">MODE=LIVE</div>
          </div>
          <div className="text-xs text-muted">Then restart the backend: <code className="text-bright bg-border px-1 rounded">node app.js</code></div>
        </div>
      )}

      {/* Live mode warning */}
      {isLive && configured && (
        <div className="rounded p-3 text-xs" style={{ background:"rgba(239,68,68,0.08)", border:"1px solid #ef444444" }}>
          <span className="font-bold text-red-400">⚡ LIVE MODE ACTIVE</span>
          <span className="text-muted ml-2">— Trades with BingX toggle ON will place REAL orders with REAL money. There is no undo.</span>
        </div>
      )}
      {!isLive && (
        <div className="rounded p-3 text-xs" style={{ background:"rgba(245,158,11,0.06)", border:"1px solid #f59e0b33" }}>
          <span className="font-bold text-yellow-400">📝 {mode} MODE</span>
          <span className="text-muted ml-2">— BingX toggle in trade modal will log trades to database but NOT place real orders. Switch to LIVE above to enable real execution.</span>
        </div>
      )}
    </div>
  );
}

export default function ControlPage() {
  const { mode, bingxStatus, loadBingXStatus, loadMode } = useStore();
  const [systemMode, setSystemMode] = useState(mode || "PAPER");
  const [bingxRefreshing, setBingxRefreshing] = useState(false);

  useEffect(() => {
    loadMode();
    loadBingXStatus();
  }, []);

  // Keep local mode state in sync with store
  useEffect(() => { if (mode) setSystemMode(mode); }, [mode]);

  async function refreshBingX() {
    setBingxRefreshing(true);
    await loadBingXStatus();
    setBingxRefreshing(false);
  }
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  async function switchMode(newMode) {
    setSaving(true);
    try {
      await fetch("/api/control/mode", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ newMode })
      });
      setSystemMode(newMode);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-extrabold">⚙️ System Control</h1>

      {/* Kill Switch */}
      <KillSwitch />

      {/* Mode switcher */}
      <div className="signal-card">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
          System Mode
        </h2>
        <p className="text-xs text-muted mb-4">
          <span className="text-yellow-400 font-bold">⚠️ LIVE mode</span> places real orders on your exchange.
          Only switch to LIVE if API keys are configured and you accept full risk.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {["PAPER", "BACKTEST", "LIVE"].map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              disabled={saving || systemMode === m}
              className={`py-3 rounded font-bold text-sm border transition-colors ${
                systemMode === m
                  ? m === "LIVE"
                    ? "bg-red-600 border-red-500 text-white"
                    : "bg-accent border-accent text-dark"
                  : "bg-border/30 border-border text-muted hover:text-bright hover:border-bright/20"
              }`}
            >
              {m === "PAPER"    && "📝 "}
              {m === "BACKTEST" && "🧪 "}
              {m === "LIVE"     && "⚡ "}
              {m}
            </button>
          ))}
        </div>

        {saved && (
          <div className="mt-3 text-xs text-accent">✅ Mode updated to {systemMode}</div>
        )}
      </div>

      {/* Info cards */}
      {/* ── BingX Connection Status ───────────────────────────────────── */}
      <BingXStatusPanel
        status={bingxStatus}
        mode={systemMode}
        onRefresh={refreshBingX}
        refreshing={bingxRefreshing}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <InfoCard
          title="📝 Paper Mode"
          desc="Default. Simulates fills with slippage. Tracks equity curve. Safe for testing."
          safe
        />
        <InfoCard
          title="🧪 Backtest Mode"
          desc="Replays historical data through live engine. Use the Backtest page to run."
          safe
        />
        <InfoCard
          title="⚡ Live Mode"
          desc="Places real exchange orders. Requires API keys in .env. Trade at your own risk."
          warn
        />
      </div>
    </div>
  );
}

function InfoCard({ title, desc, safe, warn }) {
  return (
    <div className={`signal-card border ${warn ? "border-red-500/30" : "border-border"}`}>
      <div className="font-bold mb-1">{title}</div>
      <div className="text-muted leading-relaxed">{desc}</div>
    </div>
  );
}