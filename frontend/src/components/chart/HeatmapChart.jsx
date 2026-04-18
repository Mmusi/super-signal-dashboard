import React from "react";
import { useStore } from "../../store/useStore";

function HeatRow({ price, heat, side }) {
  const color = side === "bid" ? `rgba(34,197,94,${heat})` : `rgba(239,68,68,${heat})`;
  const width = `${Math.max(4, heat * 100)}%`;

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-xs font-mono text-muted w-20 text-right">
        {price.toFixed(2)}
      </span>
      <div className="flex-1 h-3 bg-border rounded overflow-hidden">
        <div className="h-full rounded transition-all" style={{ width, background: color }} />
      </div>
      <span className="text-xs text-muted w-10 text-right">
        {(heat * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function HeatmapChart() {
  const { heatmap } = useStore();

  if (!heatmap) {
    return (
      <div className="signal-card">
        <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
          💧 Liquidity Heatmap
        </h3>
        <div className="text-center text-muted text-sm py-6">
          Connecting to order book stream...
        </div>
      </div>
    );
  }

  const topAsks = [...(heatmap.asks || [])].sort((a, b) => b.heat - a.heat).slice(0, 8);
  const topBids = [...(heatmap.bids || [])].sort((a, b) => b.heat - a.heat).slice(0, 8);

  return (
    <div className="signal-card">
      <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
        💧 Liquidity Heatmap
      </h3>

      <div className="mb-3">
        <div className="text-xs text-red-400 font-semibold mb-1">ASKS (Sell-side)</div>
        {topAsks.map((a, i) => (
          <HeatRow key={i} price={a.price} heat={a.heat} side="ask" />
        ))}
      </div>

      <div className="border-t border-border my-2" />

      <div>
        <div className="text-xs text-green-400 font-semibold mb-1">BIDS (Buy-side)</div>
        {topBids.map((b, i) => (
          <HeatRow key={i} price={b.price} heat={b.heat} side="bid" />
        ))}
      </div>
    </div>
  );
}
