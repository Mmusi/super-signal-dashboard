import React, { useState } from "react";
import { useStore } from "../../store/useStore";

export default function KillSwitch() {
  const { killSwitch, engageKillSwitch, disengageKillSwitch } = useStore();
  const [confirming, setConfirming] = useState(false);

  function handleEngage() {
    if (!confirming) { setConfirming(true); return; }
    engageKillSwitch();
    setConfirming(false);
  }

  return (
    <div className={`signal-card border-2 ${killSwitch ? "border-red-500" : "border-border"}`}>
      <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
        🛑 Kill Switch
      </h3>

      {killSwitch ? (
        <div className="text-center">
          <div className="text-red-400 font-extrabold text-lg mb-2 animate-pulse">
            ⚠ SYSTEM HALTED
          </div>
          <p className="text-xs text-muted mb-3">All trading suspended. No new signals will route.</p>
          <button
            onClick={disengageKillSwitch}
            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold text-sm transition-colors"
          >
            ✅ RESUME SYSTEM
          </button>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-green-400 font-bold text-sm mb-2">System Running</div>
          <p className="text-xs text-muted mb-3">
            {confirming ? "⚠️ Click again to confirm halt" : "Emergency stop — halts all signal routing immediately"}
          </p>
          <button
            onClick={handleEngage}
            onMouseLeave={() => setConfirming(false)}
            className={`w-full py-2 rounded font-bold text-sm transition-colors ${
              confirming
                ? "bg-red-600 animate-pulse text-white"
                : "bg-red-900/50 hover:bg-red-700 text-red-300 border border-red-800"
            }`}
          >
            🛑 {confirming ? "CONFIRM HALT" : "ENGAGE KILL SWITCH"}
          </button>
        </div>
      )}
    </div>
  );
}
