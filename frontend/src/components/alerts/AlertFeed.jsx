import React from "react";
import { useStore } from "../../store/useStore";

function dirColor(dir) {
  if (dir === "LONG")  return "text-green-400";
  if (dir === "SHORT") return "text-red-400";
  return "text-muted";
}

export default function AlertFeed() {
  const { alerts } = useStore();

  return (
    <div className="p-3">
      <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3 px-1">
        🔔 Live Alerts
      </h3>

      {alerts.length === 0 ? (
        <div className="text-center text-muted text-xs py-8 px-2">
          No alerts yet — engine is scanning...
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="bg-panel border border-border rounded p-2.5 text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">{a.asset || a.symbol}</span>
                <span className="text-muted">
                  {new Date(a.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className={`font-bold ${dirColor(a.direction)}`}>
                {a.action} {a.direction || ""}
              </div>
              <div className="text-muted">Score: {a.score}</div>
              {a.regime && (
                <div className="text-muted text-xs mt-0.5">{a.regime}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
