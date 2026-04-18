import React, { useEffect, useState } from "react";
import HeatmapChart from "../components/chart/HeatmapChart";
import RegimeBadge  from "../components/market/RegimeBadge";
import { useStore } from "../store/useStore";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "LINKUSDT", "ARBUSDT"];

export default function MarketPage() {
  const { signals } = useStore();
  const [regimes, setRegimes] = useState({});

  // Build regime map from live signals
  useEffect(() => {
    const map = {};
    signals.forEach(s => {
      const sym    = s.asset || s.symbol;
      const regime = s.regime || s.context?.regime?.type;
      if (sym && regime) map[sym] = regime;
    });
    setRegimes(map);
  }, [signals]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">📊 Market Intelligence</h1>

      {/* Asset regime table */}
      <div className="signal-card">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
          Asset Regime Map
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SYMBOLS.map(sym => {
            const regime = regimes[sym];
            const signal = signals.find(s => (s.asset || s.symbol) === sym);
            const score  = signal?.signal?.score || signal?.score || 0;

            return (
              <div key={sym} className="bg-border/30 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{sym}</span>
                  {regime && <RegimeBadge regime={regime} />}
                </div>
                {score > 0 && (
                  <div className="text-xs text-muted">Score: <span className="text-bright font-bold">{score}</span></div>
                )}
                {!regime && (
                  <div className="text-xs text-muted">Scanning...</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Heatmap */}
      <div className="max-w-lg">
        <HeatmapChart />
      </div>
    </div>
  );
}
