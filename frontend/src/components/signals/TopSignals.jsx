import React from "react";
import { useStore } from "../../store/useStore";
import SignalCard from "./SignalCard";

export default function TopSignals() {
  const { topSignals } = useStore();

  return (
    <div>
      <h2 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
        🔥 Top Signals
      </h2>
      {topSignals.length === 0 ? (
        <div className="text-center text-muted text-sm py-6">No strong signals yet</div>
      ) : (
        <div className="grid gap-3">
          {topSignals.map((s, i) => (
            <SignalCard key={i} signal={s} highlight={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
