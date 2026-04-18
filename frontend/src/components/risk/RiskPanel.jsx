import React from "react";

export default function RiskPanel({ riskData }) {
  const data = riskData || {};

  return (
    <div className="signal-card">
      <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
        ⚖️ Risk Overview
      </h3>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <Stat label="Account Balance" value={`$${(data.balance || 10000).toLocaleString()}`} />
        <Stat label="Open Positions"  value={data.openPositions || 0} />
        <Stat label="Daily PnL"       value={data.dailyPnl || "—"}   />
        <Stat label="Max Drawdown"    value={`${data.drawdown || 0}%`} warn={(data.drawdown || 0) > 10} />
        <Stat label="Risk Per Trade"  value="1.0%"  />
        <Stat label="Mode"            value={data.mode || "PAPER"} />
      </div>
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className="bg-border/30 rounded p-2">
      <div className="text-muted mb-0.5">{label}</div>
      <div className={`font-bold ${warn ? "text-red-400" : "text-bright"}`}>{value}</div>
    </div>
  );
}
