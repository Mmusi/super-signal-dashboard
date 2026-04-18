import React, { useState } from "react";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "LINKUSDT", "ARBUSDT"];

export default function BacktestPage() {
  const [symbol,  setSymbol]  = useState("BTCUSDT");
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  async function runBacktest() {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/performance/backtest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ symbol })
      });
      const json = await res.json();
      if (json.ok) setResult(json.data);
      else         setError(json.error || "Backtest failed");
    } catch (err) {
      setError("Server error: " + err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-extrabold">🧪 Backtest Engine</h1>

      <div className="signal-card">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
          Run Backtest
        </h2>
        <p className="text-xs text-muted mb-4">
          Replays historical 1m data through the exact same live signal engine.
          Fetch historical data first: <code className="bg-border px-1 rounded">node scripts/fetchHistorical.js</code>
        </p>

        <div className="flex gap-3 items-center">
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="bg-border border border-border rounded px-3 py-2 text-sm text-bright"
          >
            {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button
            onClick={runBacktest}
            disabled={running}
            className="px-4 py-2 bg-accent text-dark font-bold text-sm rounded hover:bg-green-400 disabled:opacity-50 transition-colors"
          >
            {running ? "Running..." : "▶ Run Backtest"}
          </button>
        </div>
      </div>

      {error && (
        <div className="signal-card border-red-500/50 text-red-400 text-sm">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="signal-card space-y-4">
          <h2 className="text-sm font-bold text-muted uppercase tracking-widest">
            Results — {result.symbol}
          </h2>

          <div className="grid grid-cols-4 gap-3 text-xs">
            <Stat label="Total Trades" value={result.summary?.totalTrades} />
            <Stat label="Wins"         value={result.summary?.wins} color="text-green-400" />
            <Stat label="Losses"       value={result.summary?.losses} color="text-red-400" />
            <Stat label="Win Rate"     value={result.summary?.winRate} color="text-accent" />
          </div>

          {result.scoreBands && (
            <div>
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">
                Score Band Breakdown
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(result.scoreBands).map(([band, v]) => (
                  <Stat key={band} label={`Score ${band}`} value={`${v.winRate}%`} sub={`${v.trades} trades`} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = "text-bright", sub }) {
  return (
    <div className="bg-border/30 rounded p-3 text-xs">
      <div className="text-muted mb-1">{label}</div>
      <div className={`font-bold text-sm ${color}`}>{value ?? "—"}</div>
      {sub && <div className="text-muted">{sub}</div>}
    </div>
  );
}
