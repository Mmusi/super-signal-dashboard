import React, { useEffect } from "react";
import { useStore } from "../../store/useStore";

function StatusDot({ status }) {
  const colors = {
    STABLE:    "bg-green-400",
    WEAKENING: "bg-yellow-400",
    DEGRADED:  "bg-orange-400",
    CRITICAL:  "bg-red-500 animate-pulse"
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-gray-400"}`} />;
}

export default function HealthPanel() {
  const { health, loadHealth } = useStore();

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return (
      <div className="signal-card">
        <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
          🩺 System Health
        </h3>
        <div className="text-muted text-sm text-center py-4">Loading health data...</div>
      </div>
    );
  }

  const scoreColor = health.healthScore >= 70 ? "text-green-400"
    : health.healthScore >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="signal-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-muted uppercase tracking-widest">
          🩺 System Health
        </h3>
        <div className="flex items-center gap-2">
          <StatusDot status={health.status} />
          <span className="text-xs font-bold">{health.status}</span>
        </div>
      </div>

      <div className={`text-3xl font-extrabold mb-1 ${scoreColor}`}>
        {health.healthScore}
        <span className="text-base text-muted">/100</span>
      </div>

      <div className="score-bar mb-3">
        <div
          className="score-bar-fill"
          style={{
            width: `${health.healthScore}%`,
            background: health.healthScore >= 70 ? "#22c55e" : health.healthScore >= 50 ? "#f59e0b" : "#ef4444"
          }}
        />
      </div>

      <div className="text-xs text-muted mb-3 italic">{health.recommendation}</div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Win Rate (Early)"  value={`${health.decay?.earlyWinRate}%`}  />
        <Stat label="Win Rate (Recent)" value={`${health.decay?.recentWinRate}%`} />
        <Stat label="Signal Quality"    value={`${health.quality?.signalQuality}%`} />
        <Stat label="Mismatch Risk"     value={health.mismatch?.riskLevel || "—"} />
        <Stat label="Decay"             value={`${health.decay?.decay}%`} warn={health.decay?.decay > 10} />
        <Stat label="Mismatches"        value={health.mismatch?.mismatches || 0} />
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
