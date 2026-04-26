// TradeEntryModal.jsx
// Opens when:
//   1. System generates TRADE signal → user clicks "Enter Trade"
//   2. User manually clicks "Open Trade" from dashboard
// Computes P&L preview live, saves to SQLite via /api/trades/open
import { useStore } from "../../store/useStore";
import React, { useState, useEffect, useCallback } from "react";

const LEVERAGES = [1, 2, 3, 5, 10, 15, 20, 25];
const ASSETS    = ["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"];

function fmt(n, d = 4) {
  if (n == null || n === "") return "";
  const f = parseFloat(n);
  if (isNaN(f)) return "";
  return f > 100
    ? f.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : f.toFixed(d);
}
function fmtUsd(n) {
  if (n == null) return "—";
  return `$${parseFloat(n).toFixed(2)}`;
}

export default function TradeEntryModal({ signal = null, onClose, onSaved }) {
  // If opened from a signal, pre-fill asset/direction/entry/SL/TP from it
  const prefill = signal ? {
    asset:      signal.asset || signal.symbol || "BTCUSDT",
    direction:  signal.direction || "LONG",
    entryPrice: signal.entry || signal.signal?.tradePlan?.entry || "",
    stopLoss:   signal.sl    || signal.signal?.tradePlan?.stopLoss || "",
    takeProfit: signal.tp    || signal.signal?.tradePlan?.takeProfit || "",
    source:     "SIGNAL",
    signalScore: signal.score || signal.signal?.score || 0,
    regime:     signal.regime || signal.context?.regime?.type || "",
    setupType:  signal.signal?.setupType || "UNKNOWN",
    liquiditySweep: !!signal.stopHunt,
    absorption: !!signal.absorption?.absorption,
    orderflowBias: signal.orderflow?.bias || "",
  } : {
    asset: "BTCUSDT", direction: "LONG", entryPrice: "", stopLoss: "", takeProfit: "",
    source: "MANUAL", signalScore: 0, regime: "", setupType: "MANUAL",
    liquiditySweep: false, absorption: false, orderflowBias: "",
  };

  const [asset,       setAsset]       = useState(prefill.asset);
  const [direction,   setDirection]   = useState(prefill.direction);
  const [entryPrice,  setEntryPrice]  = useState(prefill.entryPrice);
  const [stopLoss,    setStopLoss]    = useState(prefill.stopLoss);
  const [takeProfit,  setTakeProfit]  = useState(prefill.takeProfit);
  const [amountUsdt,  setAmountUsdt]  = useState("");
  const [leverage,    setLeverage]    = useState(1);
  const [notes,       setNotes]       = useState("");
  const [tpLevels,    setTpLevels]    = useState([]);  // alternative TP levels
  const [tpMethod,    setTpMethod]    = useState("");   // how TP was calculated
  const [loadingTP,   setLoadingTP]   = useState(false);
  const [loadingCtx,  setLoadingCtx]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const { mode: systemMode, bingxStatus } = useStore();
  // Auto-enable BingX when system is in LIVE mode with configured keys
  const [executeBingX,setExecuteBingX] = useState(
    () => systemMode === "LIVE" && !!(bingxStatus?.configured)
  );
  const [bingxResult, setBingxResult] = useState(null); // result after submit

  // ── Fetch current price + SL suggestion if manual ────────────────────────
  useEffect(() => {
    if (signal) return; // signal already provides these
    setLoadingCtx(true);
    fetch(`/api/trades/context/${asset}`)
      .then(r => r.json())
      .then(j => {
        if (j.ok && j.data.currentPrice) {
          setEntryPrice(j.data.currentPrice.toFixed(4));
          if (direction === "LONG")  setStopLoss(j.data.suggestedSL_long?.toFixed(4)  || "");
          if (direction === "SHORT") setStopLoss(j.data.suggestedSL_short?.toFixed(4) || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCtx(false));
  }, [asset, direction, signal]);

  // ── Fetch TP prediction whenever entry/SL change ─────────────────────────
  const fetchTP = useCallback(() => {
    const ep = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    if (!ep || !sl || ep === sl) return;
    setLoadingTP(true);
    fetch("/api/trades/predict-tp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset, direction, entryPrice: ep, stopLoss: sl }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.ok) {
          if (!takeProfit) setTakeProfit(j.data.tp?.toFixed(4) || "");
          setTpLevels(j.data.levels || []);
          setTpMethod(j.data.method || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTP(false));
  }, [asset, direction, entryPrice, stopLoss, takeProfit]);

  useEffect(() => {
    const t = setTimeout(fetchTP, 600);
    return () => clearTimeout(t);
  }, [fetchTP]);

  // ── Live P&L preview ─────────────────────────────────────────────────────
  const ep  = parseFloat(entryPrice)  || 0;
  const sl  = parseFloat(stopLoss)    || 0;
  const tp  = parseFloat(takeProfit)  || 0;
  const amt = parseFloat(amountUsdt)  || 0;
  const lev = leverage;

  const positionSize    = amt * lev;
  const units           = ep > 0 ? positionSize / ep : 0;
  const riskUsd         = units * Math.abs(ep - sl);
  const potentialProfit = units * Math.abs(tp - ep);
  const rr              = riskUsd > 0 ? potentialProfit / riskUsd : 0;

  // Distance to SL/TP as %
  const slPct = ep > 0 && sl > 0 ? Math.abs((sl - ep) / ep * 100) : 0;
  const tpPct = ep > 0 && tp > 0 ? Math.abs((tp - ep) / ep * 100) : 0;

  // ── Fee estimates ────────────────────────────────────────────────────────
  const BINGX_TAKER_FEE = 0.00075; // 0.075%
  const estimatedFee = positionSize > 0 ? positionSize * BINGX_TAKER_FEE * 2 : 0; // entry + exit
  const estimatedFunding = positionSize > 0 ? positionSize * 0.0001 : 0; // ~0.01% per 8h

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError(null);
    setBingxResult(null);
    if (!entryPrice || !stopLoss || !takeProfit || !amountUsdt) {
      setError("Fill in Entry Price, Amount, Stop Loss, and Take Profit.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/trades/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          direction,
          entryPrice:     parseFloat(entryPrice),
          amountUsdt:     parseFloat(amountUsdt),
          leverage:       lev,
          stopLoss:       parseFloat(stopLoss),
          takeProfit:     parseFloat(takeProfit),
          source:         prefill.source,
          signalScore:    prefill.signalScore,
          regime:         prefill.regime,
          setupType:      prefill.setupType,
          liquiditySweep: prefill.liquiditySweep,
          absorption:     prefill.absorption,
          orderflowBias:  prefill.orderflowBias,
          notes,
          executeBingX,   // pass to backend
        }),
      });
      const j = await res.json();
      if (!j.ok) { setError(j.error); return; }
      if (j.warning) {
        // Logged to DB but BingX had an issue — show warning then close
        setBingxResult({ warning: j.warning });
        setTimeout(() => { onSaved?.(); onClose(); }, 3000);
        return;
      }
      setBingxResult(j);
      onSaved?.();
      // Brief success flash before close
      setTimeout(() => onClose(), executeBingX && j.bingxExecuted ? 1500 : 300);
    } catch (err) {
      setError("Server error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const S = {
    overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
    modal:   { background:"#0f172a", border:"1px solid #1e293b", borderRadius:12, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", padding:24, color:"#f1f5f9" },
    header:  { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 },
    section: { marginBottom:18 },
    label:   { fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 },
    input:   { width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:6, padding:"9px 12px", fontSize:14, color:"#f1f5f9", fontFamily:"monospace", outline:"none", boxSizing:"border-box" },
    row2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
    preview: { background:"#0b1628", border:"1px solid #1e3a5f", borderRadius:8, padding:14, marginBottom:18 },
    previewRow: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, fontSize:13 },
    btn:     { padding:"11px 20px", borderRadius:7, border:"none", fontWeight:700, fontSize:14, cursor:"pointer", transition:"all 0.15s" },
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>
              {signal ? "⚡ Enter Signal Trade" : "📝 Manual Trade Entry"}
            </div>
            {signal && (
              <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>
                Signal score: <span style={{ color:"#22c55e", fontWeight:700 }}>{prefill.signalScore}</span>
                {prefill.regime && <span style={{ marginLeft:8, color:"#f59e0b" }}>{prefill.regime}</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        {/* Asset + Direction */}
        <div style={{ ...S.row2, marginBottom:18 }}>
          <div>
            <label style={S.label}>Asset</label>
            <select value={asset} onChange={e => { setAsset(e.target.value); setTakeProfit(""); }}
              style={S.input} disabled={!!signal}>
              {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Direction</label>
            <div style={{ display:"flex", gap:8 }}>
              {["LONG","SHORT"].map(d => (
                <button key={d} disabled={!!signal}
                  onClick={() => { setDirection(d); setStopLoss(""); setTakeProfit(""); }}
                  style={{ ...S.btn, flex:1, fontSize:13,
                    background: direction === d ? (d === "LONG" ? "#16a34a" : "#dc2626") : "#1e293b",
                    color: direction === d ? "#fff" : "#94a3b8",
                    opacity: signal ? 0.7 : 1,
                  }}>{d === "LONG" ? "▲ LONG" : "▼ SHORT"}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Prices */}
        <div style={{ ...S.row2, marginBottom:18 }}>
          <div>
            <label style={S.label}>Entry Price {loadingCtx && <span style={{ color:"#3b82f6" }}>↻</span>}</label>
            <input style={S.input} type="number" step="any" value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)} placeholder="0.0000" />
          </div>
          <div>
            <label style={S.label}>Amount (USDT)</label>
            <input style={S.input} type="number" step="any" value={amountUsdt}
              onChange={e => setAmountUsdt(e.target.value)} placeholder="e.g. 100" autoFocus={!signal} />
          </div>
        </div>

        {/* Leverage */}
        <div style={S.section}>
          <label style={S.label}>Leverage: <span style={{ color:"#f1f5f9", fontFamily:"monospace" }}>{lev}×</span>
            <span style={{ marginLeft:8, color:"#334155", textTransform:"none", fontSize:11 }}>
              (Position size: <span style={{ color:"#94a3b8" }}>{fmtUsd(positionSize)}</span>)
            </span>
          </label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {LEVERAGES.map(l => (
              <button key={l} onClick={() => setLeverage(l)}
                style={{ ...S.btn, padding:"5px 12px", fontSize:12,
                  background: leverage === l ? "#2563eb" : "#1e293b",
                  color:      leverage === l ? "#fff"    : "#64748b",
                }}>{l}×</button>
            ))}
          </div>
          {leverage > 10 && (
            <div style={{ marginTop:6, fontSize:11, color:"#f59e0b" }}>
              ⚠ High leverage amplifies both gains and losses. Risk is {fmtUsd(riskUsd * leverage / 1)} with {lev}×.
            </div>
          )}
        </div>

        {/* Stop Loss + Take Profit */}
        <div style={{ ...S.row2, marginBottom:18 }}>
          <div>
            <label style={S.label}>Stop Loss
              {ep > 0 && sl > 0 && <span style={{ marginLeft:6, color:"#ef4444", fontSize:10, fontWeight:400 }}>−{slPct.toFixed(2)}%</span>}
            </label>
            <input style={{ ...S.input, borderColor:"rgba(239,68,68,0.4)" }} type="number" step="any"
              value={stopLoss} onChange={e => { setStopLoss(e.target.value); setTakeProfit(""); }}
              placeholder="SL price" />
          </div>
          <div>
            <label style={S.label}>Take Profit
              {ep > 0 && tp > 0 && <span style={{ marginLeft:6, color:"#22c55e", fontSize:10, fontWeight:400 }}>+{tpPct.toFixed(2)}%</span>}
              {loadingTP && <span style={{ color:"#3b82f6", marginLeft:6 }}>↻ predicting...</span>}
            </label>
            <input style={{ ...S.input, borderColor:"rgba(34,197,94,0.4)" }} type="number" step="any"
              value={takeProfit} onChange={e => setTakeProfit(e.target.value)}
              placeholder="TP price" />
          </div>
        </div>

        {/* TP alternatives from prediction */}
        {tpLevels.length > 0 && (
          <div style={{ marginBottom:18 }}>
            <label style={S.label}>Alternative TP Levels
              {tpMethod && <span style={{ marginLeft:6, color:"#3b82f6", textTransform:"none", fontWeight:400 }}>
                (suggested: {tpMethod})
              </span>}
            </label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {tpLevels.map((lv, i) => (
                <button key={i} onClick={() => setTakeProfit(lv.price.toFixed(6))}
                  style={{ ...S.btn, padding:"4px 10px", fontSize:11,
                    background: parseFloat(takeProfit) === lv.price ? "#065f46" : "#1e293b",
                    color:      parseFloat(takeProfit) === lv.price ? "#4ade80" : "#94a3b8",
                    border: "1px solid #334155",
                  }}>
                  {lv.type}: {fmt(lv.price)}
                </button>
              ))}
            </div>
            <div style={{ fontSize:11, color:"#475569", marginTop:5 }}>
              These are liquidity zones / S&R levels where a reversal is likely — pick one as your TP.
            </div>
          </div>
        )}

        {/* P&L Preview */}
        {amt > 0 && ep > 0 && sl > 0 && tp > 0 && (
          <div style={S.preview}>
            <div style={{ fontSize:11, fontWeight:700, color:"#3b82f6", marginBottom:10, letterSpacing:"0.06em", textTransform:"uppercase" }}>
              Trade Preview
            </div>
            <div style={S.previewRow}>
              <span style={{ color:"#64748b" }}>Position size</span>
              <span style={{ fontFamily:"monospace", fontWeight:700 }}>{fmtUsd(positionSize)}</span>
            </div>
            <div style={S.previewRow}>
              <span style={{ color:"#64748b" }}>Max risk (to SL)</span>
              <span style={{ fontFamily:"monospace", color:"#f87171", fontWeight:700 }}>{fmtUsd(riskUsd)}</span>
            </div>
            <div style={S.previewRow}>
              <span style={{ color:"#64748b" }}>Potential profit (to TP)</span>
              <span style={{ fontFamily:"monospace", color:"#4ade80", fontWeight:700 }}>{fmtUsd(potentialProfit)}</span>
            </div>
            <div style={{ ...S.previewRow, borderTop:"1px solid #1e3a5f", paddingTop:8, marginTop:4 }}>
              <span style={{ color:"#94a3b8", fontWeight:700 }}>Risk:Reward</span>
              <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:16,
                color: rr >= 2 ? "#4ade80" : rr >= 1.5 ? "#f59e0b" : "#f87171" }}>
                1 : {rr.toFixed(2)}
              </span>
            </div>
            {rr < 1.5 && (
              <div style={{ fontSize:11, color:"#f59e0b", marginTop:6 }}>
                ⚠ R:R below 1.5 — consider moving your TP further or tightening your SL.
              </div>
            )}
          </div>
        )}

        {/* ── Fee Estimate ─────────────────────────────────────────────── */}
        {amt > 0 && ep > 0 && (
          <div style={{ marginBottom:16, padding:"10px 14px", background:"#0a1628", borderRadius:6, border:"1px solid #1e3a5f" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
              Fee Estimate (BingX)
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[
                { label:"Trading fees (in+out)", value:`~$${estimatedFee.toFixed(4)}`, color:"#f87171" },
                { label:"Funding fee (est/8h)",  value:`~$${estimatedFunding.toFixed(4)}`, color:"#f59e0b" },
                { label:"Net after fees",         value:`~$${(potentialProfit - estimatedFee - estimatedFunding).toFixed(4)}`, color: potentialProfit - estimatedFee - estimatedFunding >= 0 ? "#4ade80" : "#f87171" },
              ].map(f => (
                <div key={f.label} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#64748b", marginBottom:3 }}>{f.label}</div>
                  <div style={{ fontSize:13, fontWeight:700, fontFamily:"monospace", color:f.color }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BingX Execution Toggle ──────────────────────────────────────── */}
        <div style={{ marginBottom:18, padding:"12px 16px", background: executeBingX ? "rgba(21,128,61,0.12)" : "#0f172a", border:`1px solid ${executeBingX ? "#16a34a" : "#1e293b"}`, borderRadius:8, transition:"all 0.2s" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color: executeBingX ? "#4ade80" : "#94a3b8" }}>
                {executeBingX
                ? "⚡ LIVE — Will execute on BingX"
                : systemMode === "LIVE"
                ? "📋 BingX OFF — will log only (toggle to execute)"
                : `📋 ${systemMode} MODE — switch to LIVE in Control panel for real orders`}
              </div>
              <div style={{ fontSize:11, color:"#475569", marginTop:3 }}>
                {executeBingX
                  ? "Real money trade. SL and TP will be placed automatically."
                  : "Safe — records trade in your journal without placing any order."}
              </div>
            </div>
            <button
              onClick={() => setExecuteBingX(v => !v)}
              style={{
                padding:"8px 18px", borderRadius:6, border:"none", fontWeight:700, fontSize:13,
                cursor:"pointer", transition:"all 0.2s", flexShrink:0, marginLeft:16,
                background: executeBingX ? "#15803d" : "#1e293b",
                color:      executeBingX ? "#fff"    : "#64748b",
              }}>
              {executeBingX ? "BingX: ON" : "BingX: OFF"}
            </button>
          </div>
          {executeBingX && systemMode !== "LIVE" && (
            <div style={{ marginTop:8, fontSize:11, color:"#ef4444", padding:"6px 10px", background:"rgba(239,68,68,0.08)", borderRadius:4, border:"1px solid rgba(239,68,68,0.2)" }}>
              ⚠ System is in {systemMode} mode. Switch to LIVE in Control panel — trade will be logged only.
            </div>
          )}
          {executeBingX && systemMode === "LIVE" && (
            <div style={{ marginTop:8, fontSize:11, color:"#f59e0b", padding:"6px 10px", background:"rgba(245,158,11,0.08)", borderRadius:4, border:"1px solid rgba(245,158,11,0.2)" }}>
              ⚡ LIVE: Order will execute immediately at market price on BingX. Ensure BINGX_API_KEY and BINGX_SECRET are in .env.
            </div>
          )}
        </div>

        {/* BingX result flash */}
        {bingxResult && !bingxResult.warning && bingxResult.bingxExecuted && (
          <div style={{ marginBottom:16, padding:"10px 14px", background:"rgba(21,128,61,0.12)", border:"1px solid #16a34a", borderRadius:6, fontSize:12, color:"#4ade80" }}>
            ✅ BingX order placed! Order ID: {bingxResult.bingxOrderId} | SL & TP attached automatically
          </div>
        )}
        {bingxResult?.warning && (
          <div style={{ marginBottom:16, padding:"10px 14px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:6, fontSize:12, color:"#f59e0b" }}>
            ⚠ {bingxResult.warning}
          </div>
        )}

        {/* Notes */}
        <div style={S.section}>
          <label style={S.label}>Notes (optional)</label>
          <textarea style={{ ...S.input, height:54, resize:"vertical", fontFamily:"inherit", fontSize:13 }}
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Entered on BTC compression breakout after sweep of lows..." />
        </div>

        {error && (
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:6, padding:"8px 12px", fontSize:12, color:"#f87171", marginBottom:16 }}>
            ❌ {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={onClose}
            style={{ ...S.btn, flex:1, background:"#1e293b", color:"#64748b" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ ...S.btn, flex:2, fontSize:15,
              background: direction === "LONG" ? "#15803d" : "#b91c1c",
              color: "#fff",
              opacity: saving ? 0.6 : 1,
            }}>
            {saving
              ? (executeBingX ? "Placing BingX order..." : "Saving...")
              : executeBingX
              ? `⚡ ${direction === "LONG" ? "▲" : "▼"} Execute ${direction} on BingX`
              : `📋 ${direction === "LONG" ? "▲" : "▼"} Log ${direction} Trade`}
          </button>
        </div>

      </div>
    </div>
  );
}