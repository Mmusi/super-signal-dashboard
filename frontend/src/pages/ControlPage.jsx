import React, { useState, useEffect } from "react";
import KillSwitch from "../components/control/KillSwitch";
import { useStore } from "../store/useStore";

export default function ControlPage() {
  const { mode, loadMode } = useStore();
  const [systemMode,  setSystemMode]  = useState(mode || "PAPER");
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [bingx,       setBingx]       = useState(null);  // { configured, ping, balance }
  const [checking,    setChecking]    = useState(false);

  // Load mode from server on mount
  useEffect(() => { loadMode?.(); fetchBingX(); }, []);

  // Keep local state in sync with store
  useEffect(() => { if (mode) setSystemMode(mode); }, [mode]);

  async function switchMode(newMode) {
    setSaving(true);
    try {
      await fetch("/api/control/mode", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ newMode }),
      });
      setSystemMode(newMode);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch(err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function fetchBingX() {
    setChecking(true);
    try {
      const r = await fetch("/api/trades/bingx-status");
      const j = await r.json();
      setBingx(j);
      console.log("BingX status raw:", JSON.stringify(j));
    } catch(e) {
      setBingx({ ok:false, error:e.message });
    } finally {
      setChecking(false);
    }
  }

  // Parse balance from BingX response — handle multiple possible structures
  function parseBalance(bingxData) {
    if (!bingxData?.balance?.ok) return null;
    const d = bingxData.balance.data;
    if (!d) return null;
    // BingX balance can be in different places depending on account type
    const usdt = d?.balance?.USDT
      || d?.balance?.usdt
      || d?.availableMargin
      || d?.balance
      || d?.[0]?.balance
      || null;
    const equity = d?.equity
      || d?.balance?.equity
      || d?.[0]?.equity
      || null;
    return { usdt, equity, raw: d };
  }

  const configured  = bingx?.configured;
  const pingOk      = bingx?.ping?.ok;
  const balanceParsed = parseBalance(bingx);
  const isLive      = systemMode === "LIVE";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">⚙️ System Control</h1>

      {/* ── Kill Switch ── */}
      <KillSwitch />

      {/* ── Mode switcher ── */}
      <div className="signal-card">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
          System Mode
        </h2>
        <p className="text-xs text-muted mb-4">
          <span className="text-yellow-400 font-bold">⚠️ LIVE mode</span> places real orders on BingX.
          Only switch to LIVE after confirming API keys work below.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {["PAPER","BACKTEST","LIVE"].map(m=>(
            <button key={m} onClick={()=>switchMode(m)}
              disabled={saving||systemMode===m}
              className={`py-3 rounded font-bold text-sm border transition-colors ${
                systemMode===m
                  ? m==="LIVE" ? "bg-red-600 border-red-500 text-white" : "bg-accent border-accent text-dark"
                  : "bg-border/30 border-border text-muted hover:text-bright hover:border-bright/20"
              }`}>
              {m==="PAPER"?"📝 ":m==="BACKTEST"?"🧪 ":"⚡ "}{m}
            </button>
          ))}
        </div>
        {saved && <div className="mt-3 text-xs text-accent">✅ Mode updated to {systemMode}</div>}
      </div>

      {/* ── BingX Connection Panel ── */}
      <div className="signal-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-muted uppercase tracking-widest">
            ⚡ BingX Connection
          </h2>
          <button onClick={fetchBingX} disabled={checking}
            className="text-xs px-3 py-1.5 rounded border border-border text-muted hover:text-bright transition-colors">
            {checking ? "Checking..." : "↺ Test Connection"}
          </button>
        </div>

        {/* Status boxes */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label:"API Keys",    value:bingx===null?"Checking...":configured?"✅ Configured":"❌ Not set",   color:bingx===null?"text-muted":configured?"text-green-400":"text-red-400" },
            { label:"Connection",  value:bingx===null?"Checking...":pingOk?"✅ Connected":"❌ Unreachable",    color:bingx===null?"text-muted":pingOk?"text-green-400":"text-red-400"    },
            { label:"System Mode", value:isLive?"⚡ LIVE":"📝 "+systemMode,                                    color:isLive?"text-red-400":"text-yellow-400"                              },
          ].map(x=>(
            <div key={x.label} className="bg-border/30 rounded p-3 text-center">
              <div className="text-xs text-muted mb-1">{x.label}</div>
              <div className={`text-sm font-bold ${x.color}`}>{x.value}</div>
            </div>
          ))}
        </div>

        {/* Balance display */}
        {configured && pingOk && (
          <div className="rounded p-4 mb-4" style={{ background:"rgba(34,197,94,0.06)", border:"1px solid #22c55e33" }}>
            <div className="text-xs text-muted mb-2">Available Balance — Perpetual Futures Account</div>
            {balanceParsed ? (
              <>
                <div className="text-2xl font-extrabold font-mono text-green-400">
                  {balanceParsed.usdt != null
                    ? `$${parseFloat(balanceParsed.usdt).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} USDT`
                    : "Connected — see raw data below"}
                </div>
                {balanceParsed.equity != null && (
                  <div className="text-xs text-muted mt-1">
                    Total equity: ${parseFloat(balanceParsed.equity).toFixed(2)} USDT
                  </div>
                )}
                {/* Raw data fallback — always show so you can see what BingX returns */}
                <details className="mt-3">
                  <summary className="text-xs text-muted cursor-pointer hover:text-bright">
                    🔍 Raw balance data (click to expand)
                  </summary>
                  <pre className="text-xs text-muted mt-2 overflow-auto" style={{ maxHeight:120 }}>
                    {JSON.stringify(balanceParsed.raw, null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              <div className="text-muted text-sm">
                Connected ✅ — expand raw data to see balance
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer hover:text-bright">🔍 Raw balance data</summary>
                  <pre className="text-xs text-muted mt-2 overflow-auto" style={{ maxHeight:120 }}>
                    {JSON.stringify(bingx?.balance?.data, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Not configured — setup guide */}
        {bingx && !configured && (
          <div className="rounded p-4 mb-4 space-y-3" style={{ background:"rgba(239,68,68,0.06)", border:"1px solid #ef444433" }}>
            <div className="text-sm font-bold text-red-400">⚠️ BingX API keys not found</div>
            <div className="text-xs text-muted leading-relaxed">
              Create a file called <code className="text-bright bg-border px-1 py-0.5 rounded">.env</code> inside
              your <code className="text-bright bg-border px-1 py-0.5 rounded">backend/</code> folder with:
            </div>
            <div className="rounded p-3 font-mono text-xs" style={{ background:"#0b0e14", border:"1px solid #1e293b" }}>
              <div className="text-green-400">BINGX_API_KEY=paste_your_api_key_here</div>
              <div className="text-green-400">BINGX_SECRET=paste_your_secret_here</div>
              <div className="text-muted mt-1">MODE=PAPER</div>
              <div className="text-muted">PORT=3001</div>
            </div>
            <div className="text-xs text-muted">
              Then restart backend: <code className="text-bright bg-border px-1 py-0.5 rounded">node app.js</code>
              <br/>Then click <strong className="text-bright">↺ Test Connection</strong> above.
            </div>
          </div>
        )}

        {/* Mode warning */}
        {isLive && configured && (
          <div className="rounded p-3 text-xs" style={{ background:"rgba(239,68,68,0.08)", border:"1px solid #ef444444" }}>
            <span className="font-bold text-red-400">⚡ LIVE MODE ACTIVE</span>
            <span className="text-muted ml-2">
              — Trades with BingX toggle ON will place REAL orders with REAL money instantly. There is no undo.
            </span>
          </div>
        )}
        {!isLive && (
          <div className="rounded p-3 text-xs" style={{ background:"rgba(245,158,11,0.06)", border:"1px solid #f59e0b33" }}>
            <span className="font-bold text-yellow-400">📝 {systemMode} MODE</span>
            <span className="text-muted ml-2">
              — BingX toggle in trade modal logs trades to database but does NOT place real orders.
              Switch to LIVE above to enable real execution.
            </span>
          </div>
        )}
      </div>

      {/* ── Info cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <InfoCard title="📝 Paper Mode"    desc="Default. Logs all trades to database. No real money. Safe for testing and learning." safe/>
        <InfoCard title="🧪 Backtest Mode" desc="Replays historical data through live engine. Use the Backtest page to run." safe/>
        <InfoCard title="⚡ Live Mode"     desc="Places real BingX orders. Requires API keys in .env. Trade at your own risk." warn/>
      </div>
    </div>
  );
}

function InfoCard({ title, desc, safe, warn }) {
  return (
    <div className={`signal-card border ${warn?"border-red-500/30":"border-border"}`}>
      <div className="font-bold mb-1">{title}</div>
      <div className="text-muted leading-relaxed">{desc}</div>
    </div>
  );
}