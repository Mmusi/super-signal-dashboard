import React, { useState, useEffect } from "react";
import KillSwitch from "../components/control/KillSwitch";
import { useStore } from "../store/useStore";

export default function ControlPage() {
  const { mode } = useStore();
  const [systemMode, setSystemMode] = useState(mode || "PAPER");
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
