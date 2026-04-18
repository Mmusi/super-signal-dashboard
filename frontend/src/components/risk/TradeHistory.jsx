import React, { useEffect } from "react";
import { useStore } from "../../store/useStore";

export default function TradeHistory() {
  const { trades, loadTrades } = useStore();

  useEffect(() => { loadTrades(); }, []);

  return (
    <div className="signal-card">
      <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
        📋 Trade History
      </h3>

      {trades.length === 0 ? (
        <div className="text-center text-muted text-sm py-6">No trades recorded yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left py-1 pr-3">Asset</th>
                <th className="text-left py-1 pr-3">Dir</th>
                <th className="text-left py-1 pr-3">Setup</th>
                <th className="text-left py-1 pr-3">Regime</th>
                <th className="text-right py-1 pr-3">Score</th>
                <th className="text-right py-1">Result</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-border/40 hover:bg-border/20">
                  <td className="py-1.5 pr-3 font-bold">{t.asset}</td>
                  <td className={`py-1.5 pr-3 font-bold ${t.direction === "LONG" ? "text-green-400" : "text-red-400"}`}>
                    {t.direction}
                  </td>
                  <td className="py-1.5 pr-3 text-muted">{t.setup_type || "—"}</td>
                  <td className="py-1.5 pr-3 text-muted">{t.regime || "—"}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{t.score}</td>
                  <td className={`py-1.5 text-right font-bold ${t.result === "WIN" ? "text-green-400" : "text-red-400"}`}>
                    {t.result === "WIN" ? "✓" : "✗"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
