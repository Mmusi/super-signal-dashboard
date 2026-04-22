import React, { useState } from "react";
import RegimeBadge from "../market/RegimeBadge";
import ConfluenceScore from "./ConfluenceScore";
import TradeEntryModal from "../trade/TradeEntryModal";

function directionColor(dir) {
  if (dir === "LONG")  return "text-green-400";
  if (dir === "SHORT") return "text-red-400";
  return "text-muted";
}
function actionBadge(action) {
  if (action === "TRADE") return "bg-green-500/20 text-green-300 border border-green-500/40";
  if (action === "WATCH") return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40";
  return "bg-gray-500/20 text-gray-400";
}
function fmt(val, d = 4) {
  if (!val) return "—";
  return parseFloat(val).toFixed(d);
}

export default function SignalCard({ signal, highlight = false }) {
  const [showModal, setShowModal] = useState(false);
  if (!signal) return null;

  const asset     = signal.asset   || signal.symbol;
  const action    = signal.action  || signal.signal?.action;
  const direction = signal.direction || signal.signal?.direction;
  const score     = signal.score   || signal.signal?.score || 0;
  const regime    = signal.regime  || signal.context?.regime?.type;
  const entry     = signal.entry   || signal.signal?.tradePlan?.entry;
  const sl        = signal.sl      || signal.signal?.tradePlan?.stopLoss;
  const tp        = signal.tp      || signal.signal?.tradePlan?.takeProfit;
  const rr        = signal.signal?.tradePlan?.riskReward;

  // Build signal object for the modal
  const modalSignal = {
    asset, direction, score, regime,
    entry, sl, tp,
    stopHunt:  signal.stopHunt,
    absorption: signal.absorption || signal.context?.absorption,
    orderflow: signal.orderflow  || signal.context?.orderflow,
    signal: signal.signal,
    context: signal.context,
  };

  const canTrade = action === "TRADE" || action === "WATCH";

  return (
    <>
      <div className={`signal-card ${highlight ? "border-accent/60" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-bright">{asset}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${actionBadge(action)}`}>
              {action}
            </span>
          </div>
          <RegimeBadge regime={regime} />
        </div>

        {/* Direction + Score */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-lg font-extrabold ${directionColor(direction)}`}>
            {direction ? `${direction === "LONG" ? "▲" : "▼"} ${direction}` : "—"}
          </span>
          <ConfluenceScore score={score} />
        </div>

        {/* Trade plan */}
        {entry && (
          <div className="grid grid-cols-3 gap-2 text-xs mt-2 pt-2 border-t border-border">
            <div>
              <div className="text-muted mb-0.5">ENTRY</div>
              <div className="font-mono text-bright">{fmt(entry)}</div>
            </div>
            <div>
              <div className="text-muted mb-0.5">STOP</div>
              <div className="font-mono text-red-400">{fmt(sl)}</div>
            </div>
            <div>
              <div className="text-muted mb-0.5">TARGET</div>
              <div className="font-mono text-green-400">{fmt(tp)}</div>
            </div>
          </div>
        )}
        {rr && (
          <div className="mt-1 text-xs text-muted">
            R:R <span className="font-bold" style={{color:rr>=2?"#22c55e":rr>=1.5?"#f59e0b":"#ef4444"}}>{rr}:1</span>
          </div>
        )}

        {/* Context tags */}
        <div className="flex gap-1 flex-wrap mt-2">
          {signal.stopHunt && <Tag label="💧 Sweep" color="blue" />}
          {(signal.absorption?.absorption || signal.context?.absorption?.absorption) && <Tag label="🧲 Absorbed" color="purple" />}
          {(signal.orderflow?.bias || signal.context?.orderflow?.bias) === "BUYERS_IN_CONTROL"  && <Tag label="⬆ Buy Flow"  color="green" />}
          {(signal.orderflow?.bias || signal.context?.orderflow?.bias) === "SELLERS_IN_CONTROL" && <Tag label="⬇ Sell Flow" color="red"   />}
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-muted">
            {signal.timestamp ? new Date(signal.timestamp).toLocaleTimeString() : ""}
          </div>
          {/* Enter Trade button — shown for TRADE and WATCH signals */}
          {canTrade && (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs px-3 py-1.5 rounded font-bold transition-colors border"
              style={{
                background: direction === "LONG" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                borderColor: direction === "LONG" ? "#22c55e66" : "#ef444466",
                color: direction === "LONG" ? "#22c55e" : "#ef4444",
              }}>
              {direction === "LONG" ? "▲" : "▼"} Enter Trade
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <TradeEntryModal
          signal={modalSignal}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function Tag({ label, color }) {
  const colors = {
    blue:   "bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/10 text-purple-400",
    green:  "bg-green-500/10 text-green-400",
    red:    "bg-red-500/10 text-red-400"
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors[color] || ""}`}>{label}</span>
  );
}