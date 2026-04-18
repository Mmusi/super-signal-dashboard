import React from "react";
import { useStore } from "../../store/useStore";
import SignalCard from "./SignalCard";

export default function SignalScanner() {
  const { signals } = useStore();

  const sorted = [...signals].sort((a, b) => {
    const sa = a.signal?.score || a.score || 0;
    const sb = b.signal?.score || b.score || 0;
    return sb - sa;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest">
          Signal Scanner
        </h2>
        <span className="text-xs text-muted">{signals.length} active</span>
      </div>

      {sorted.length === 0 ? (
        <div className="signal-card text-center py-8 text-muted text-sm">
          <div className="text-2xl mb-2">📡</div>
          Scanning markets — waiting for signals...
        </div>
      ) : (
        <div className="grid gap-3">
          {sorted.map((s, i) => (
            <SignalCard
              key={s.asset || s.symbol || i}
              signal={s}
              highlight={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
