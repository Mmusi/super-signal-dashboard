import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

export default function EquityCurve({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="signal-card">
        <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
          📈 Equity Curve
        </h3>
        <div className="text-center text-muted text-sm py-8">
          No trade data yet — run backtest or trade in paper mode
        </div>
      </div>
    );
  }

  const formatted = data.map((d, i) => ({
    i,
    balance: typeof d.balance === "number" ? +d.balance.toFixed(2) : d.balance
  }));

  const startBal = formatted[0]?.balance || 0;
  const endBal   = formatted[formatted.length - 1]?.balance || 0;
  const pnl      = endBal - startBal;
  const isPos    = pnl >= 0;

  return (
    <div className="signal-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-muted uppercase tracking-widest">
          📈 Equity Curve
        </h3>
        <span className={`text-sm font-bold ${isPos ? "text-green-400" : "text-red-400"}`}>
          {isPos ? "+" : ""}{pnl.toFixed(2)}R
        </span>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={formatted} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={isPos ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPos ? "#22c55e" : "#ef4444"} stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="i" hide />
          <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 6 }}
            labelStyle={{ color: "#6b7280" }}
            itemStyle={{ color: "#f9fafb" }}
            formatter={(v) => [v + "R", "Balance"]}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={isPos ? "#22c55e" : "#ef4444"}
            strokeWidth={2}
            fill="url(#eqGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
