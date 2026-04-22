// TradeJournal.jsx
// Displays your real manual trades from SQLite
// Shows: amount, leverage, entry, SL, TP, actual P&L in $
// NO R-multiples — real money numbers you can understand
import React, { useEffect, useState } from "react";
import TradeEntryModal from "./TradeEntryModal";

function fmtPrice(p) {
  if (p == null) return "—";
  const f = parseFloat(p);
  return f > 100
    ? f.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : f.toFixed(6);
}
function fmtUsd(n) {
  if (n == null) return "—";
  const f = parseFloat(n);
  return (f >= 0 ? "+$" : "-$") + Math.abs(f).toFixed(2);
}
function fmtPct(n) {
  if (n == null) return "—";
  const f = parseFloat(n);
  return (f >= 0 ? "+" : "") + f.toFixed(2) + "%";
}
function fmtDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, padding:"12px 16px" }}>
      <div style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color: color || "#f1f5f9", fontFamily:"monospace" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function CloseTradeModal({ trade, onClose, onClosed }) {
  const [exitPrice, setExitPrice] = useState("");
  const [reason,    setReason]    = useState("MANUAL_CLOSE");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);

  async function handleClose() {
    if (!exitPrice) { setError("Enter exit price"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/trades/close/${trade.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exitPrice: parseFloat(exitPrice), exitReason: reason }),
      });
      const j = await res.json();
      if (!j.ok) { setError(j.error); return; }
      onClosed(j.data);
      onClose();
    } catch(err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const ep = parseFloat(exitPrice) || 0;
  const entry = parseFloat(trade.entry_price) || 0;
  const units = trade.position_size / entry;
  const pnl = ep > 0 ? (trade.direction === "LONG" ? units * (ep - entry) : units * (entry - ep)) : null;

  const S = {
    overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:9100, display:"flex", alignItems:"center", justifyContent:"center" },
    modal:   { background:"#0f172a", border:"1px solid #1e293b", borderRadius:10, padding:24, width:360, color:"#f1f5f9" },
    input:   { width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:6, padding:"9px 12px", fontSize:14, color:"#f1f5f9", fontFamily:"monospace", boxSizing:"border-box" },
  };

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>
          Close Trade — {trade.direction} {trade.signal_asset}
        </div>
        <div style={{ fontSize:12, color:"#64748b", marginBottom:14 }}>
          Opened @ {fmtPrice(trade.entry_price)} | {trade.amount_usdt} USDT × {trade.leverage}×
        </div>

        <label style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", display:"block", marginBottom:5 }}>
          Exit Price
        </label>
        <input style={{ ...S.input, marginBottom:12 }} type="number" step="any"
          value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="Current price" autoFocus />

        {pnl !== null && (
          <div style={{ background:"#0b1628", borderRadius:6, padding:"10px 14px", marginBottom:14, textAlign:"center" }}>
            <div style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>Estimated P&L</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:"monospace",
              color: pnl >= 0 ? "#4ade80" : "#f87171" }}>
              {fmtUsd(pnl)}
            </div>
            <div style={{ fontSize:11, color:pnl >= 0 ? "#4ade80" : "#f87171" }}>
              {pnl >= 0 ? "+" : ""}{((pnl / trade.amount_usdt) * 100).toFixed(2)}% on capital
            </div>
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", display:"block", marginBottom:5 }}>Reason</label>
          <select style={S.input} value={reason} onChange={e => setReason(e.target.value)}>
            <option value="MANUAL_CLOSE">Manual close</option>
            <option value="TP_HIT">Take Profit hit</option>
            <option value="SL_HIT">Stop Loss hit</option>
          </select>
        </div>

        {error && <div style={{ color:"#f87171", fontSize:12, marginBottom:12 }}>❌ {error}</div>}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", background:"#1e293b", border:"none", borderRadius:6, color:"#94a3b8", fontWeight:700, cursor:"pointer" }}>Cancel</button>
          <button onClick={handleClose} disabled={saving} style={{ flex:2, padding:"10px", background: pnl >= 0 ? "#15803d" : "#b91c1c", border:"none", borderRadius:6, color:"#fff", fontWeight:700, cursor:"pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Closing..." : "Close Trade"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TradeJournal() {
  const [trades,     setTrades]     = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [showEntry,  setShowEntry]  = useState(false);
  const [closingTrade, setClosingTrade] = useState(null);
  const [tab,        setTab]        = useState("open"); // "open" | "all"

  async function load() {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        fetch("/api/trades?limit=200").then(r => r.json()),
        fetch("/api/trades/stats").then(r => r.json()),
      ]);
      if (t.ok) setTrades(t.data);
      if (s.ok) setStats(s.data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!window.confirm("Delete this trade? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (j.ok) load();
    } catch(e) { console.error(e); }
  }

  const openTrades  = trades.filter(t => t.status === "OPEN");
  const closedTrades= trades.filter(t => t.status === "CLOSED").sort((a,b) => b.closed_at - a.closed_at);
  const display     = tab === "open" ? openTrades : closedTrades;

  return (
    <div style={{ color:"#f1f5f9" }}>
      {/* Stats bar */}
      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:20 }}>
          <StatCard label="Total P&L"  value={`${stats.totalPnl >= 0 ? "+" : ""}$${Math.abs(stats.totalPnl).toFixed(2)}`}
            color={stats.totalPnl >= 0 ? "#4ade80" : "#f87171"} />
          <StatCard label="Win Rate"   value={`${stats.winRate}%`}
            sub={`${stats.wins}W / ${stats.losses}L`}
            color={stats.winRate >= 55 ? "#4ade80" : stats.winRate >= 45 ? "#f59e0b" : "#f87171"} />
          <StatCard label="Open"       value={stats.openCount} sub="positions" />
          <StatCard label="Closed"     value={stats.closedCount} sub="trades" />
          <StatCard label="Avg P&L %"  value={`${stats.avgPnlPct >= 0 ? "+" : ""}${stats.avgPnlPct}%`}
            color={stats.avgPnlPct >= 0 ? "#4ade80" : "#f87171"} />
        </div>
      )}

      {/* Actions + tabs */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:4 }}>
          {[["open","Open Positions"],["all","Closed Trades"]].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding:"6px 14px", borderRadius:6, border:"none", fontWeight:700, fontSize:12, cursor:"pointer",
              background: tab === key ? "#1d4ed8" : "#1e293b",
              color:      tab === key ? "#fff"    : "#64748b",
            }}>{label} {key === "open" ? `(${openTrades.length})` : `(${closedTrades.length})`}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={load} style={{ padding:"6px 14px", borderRadius:6, border:"1px solid #334155", background:"none", color:"#64748b", fontSize:12, cursor:"pointer" }}>
            ↻ Refresh
          </button>
          <button onClick={() => setShowEntry(true)} style={{ padding:"7px 16px", borderRadius:6, border:"none", background:"#15803d", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            + Open Trade
          </button>
        </div>
      </div>

      {/* Trade table */}
      {loading ? (
        <div style={{ textAlign:"center", color:"#475569", padding:"40px 0", fontSize:13 }}>Loading trades...</div>
      ) : display.length === 0 ? (
        <div style={{ textAlign:"center", color:"#475569", padding:"40px 0" }}>
          <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
          <div style={{ fontSize:13 }}>{tab === "open" ? "No open positions" : "No closed trades yet"}</div>
          {tab === "open" && <div style={{ fontSize:12, color:"#334155", marginTop:4 }}>Enter a trade manually or from a signal</div>}
        </div>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid #1e293b", color:"#475569" }}>
                <th style={{ textAlign:"left", padding:"6px 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", fontSize:10 }}>Asset</th>
                <th style={{ textAlign:"left", padding:"6px 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", fontSize:10 }}>Dir</th>
                <th style={{ textAlign:"right", padding:"6px 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", fontSize:10 }}>Entry</th>
                <th style={{ textAlign:"right", padding:"6px 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", fontSize:10 }}>SL</th>
                <th style={{ textAlign:"right", padding:"6px 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", fontSize:10 }}>TP</th>
                <th style={{ textAlign:"right", padding:"6px 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", fontSize:10 }}>Amount</th>
                <th style={{ textAlign:"center", padding:"6px 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", fontSize:10 }}>Lev</th>
                <th style={{ textAlign:"right", padding:"6px 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", fontSize:10 }}>P&L</th>
                <th style={{ textAlign:"left", padding:"6px 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", fontSize:10 }}>Source</th>
                <th style={{ textAlign:"left", padding:"6px 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", fontSize:10 }}>Opened</th>
                <th style={{ padding:"6px 8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {display.map(t => {
                const isOpen = t.status === "OPEN";
                const pnl    = isOpen ? null : t.pnl_usdt;
                const pnlPos = pnl === null ? null : pnl >= 0;
                return (
                  <tr key={t.id} style={{ borderBottom:"1px solid #0f172a" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#0b1628"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding:"8px", fontWeight:700 }}>{t.signal_asset}</td>
                    <td style={{ padding:"8px" }}>
                      <span style={{ fontWeight:700, fontSize:11, padding:"2px 7px", borderRadius:4,
                        background: t.direction === "LONG" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                        color:      t.direction === "LONG" ? "#4ade80" : "#f87171" }}>
                        {t.direction === "LONG" ? "▲" : "▼"} {t.direction}
                      </span>
                    </td>
                    <td style={{ padding:"8px", textAlign:"right", fontFamily:"monospace" }}>{fmtPrice(t.entry_price)}</td>
                    <td style={{ padding:"8px", textAlign:"right", fontFamily:"monospace", color:"#f87171" }}>{fmtPrice(t.stop_loss)}</td>
                    <td style={{ padding:"8px", textAlign:"right", fontFamily:"monospace", color:"#4ade80" }}>{fmtPrice(t.take_profit)}</td>
                    <td style={{ padding:"8px", textAlign:"right", fontFamily:"monospace" }}>${parseFloat(t.amount_usdt).toFixed(0)}</td>
                    <td style={{ padding:"8px", textAlign:"center" }}>
                      <span style={{ fontSize:11, fontWeight:700, color: t.leverage > 5 ? "#f59e0b" : "#64748b" }}>
                        {t.leverage}×
                      </span>
                    </td>
                    <td style={{ padding:"8px", textAlign:"right", fontFamily:"monospace", fontWeight:700 }}>
                      {isOpen ? (
                        <span style={{ color:"#3b82f6", fontSize:11 }}>OPEN</span>
                      ) : (
                        <div>
                          <div style={{ color: pnlPos ? "#4ade80" : "#f87171" }}>{fmtUsd(pnl)}</div>
                          <div style={{ fontSize:10, color: pnlPos ? "#4ade80" : "#f87171", opacity:0.8 }}>{fmtPct(t.pnl_pct)}</div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding:"8px" }}>
                      <span style={{ fontSize:10, color:"#64748b",
                        background: t.source === "SIGNAL" ? "rgba(59,130,246,0.12)" : "rgba(100,116,139,0.12)",
                        color:      t.source === "SIGNAL" ? "#60a5fa" : "#94a3b8",
                        padding:"2px 6px", borderRadius:4, fontWeight:700 }}>
                        {t.source === "SIGNAL" ? `⚡ ${t.signal_score}` : "MANUAL"}
                      </span>
                    </td>
                    <td style={{ padding:"8px", color:"#475569" }}>{fmtDate(t.opened_at)}</td>
                    <td style={{ padding:"8px" }}>
                      <div style={{ display:"flex", gap:4 }}>
                        {tab === "open" && (
                          <button onClick={() => setClosingTrade(t)}
                            style={{ padding:"4px 8px", background:"#7f1d1d", border:"1px solid #991b1b", borderRadius:4, color:"#fca5a5", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                            Close
                          </button>
                        )}
                        <button onClick={() => handleDelete(t.id)}
                          style={{ padding:"4px 8px", background:"rgba(127,29,29,0.3)", border:"1px solid #7f1d1d", borderRadius:4, color:"#6b7280", fontSize:11, cursor:"pointer" }}
                          title="Delete trade">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Risk:Reward explanation */}
      {closedTrades.length > 0 && (
        <div style={{ marginTop:16, padding:"10px 14px", background:"#0b1628", borderRadius:6, fontSize:11, color:"#475569", lineHeight:1.7 }}>
          <strong style={{ color:"#64748b" }}>How P&L is calculated:</strong> Position size = Amount × Leverage.
          P&L = units × (exit − entry). A $100 trade at 5× gives $500 position.
          If price moves 1% your way = +$5 profit on $100 capital = 5% return.
        </div>
      )}

      {/* Modals */}
      {showEntry && (
        <TradeEntryModal
          signal={null}
          onClose={() => setShowEntry(false)}
          onSaved={() => { load(); }}
        />
      )}
      {closingTrade && (
        <CloseTradeModal
          trade={closingTrade}
          onClose={() => setClosingTrade(null)}
          onClosed={() => { load(); setClosingTrade(null); }}
        />
      )}
    </div>
  );
}