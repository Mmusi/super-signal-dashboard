import React, { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import TradeEntryModal from "../trade/TradeEntryModal";

// ── Palette ────────────────────────────────────────────────────────────────────
const P = {
  bg:"#0b0e14", panel:"#0f172a", border:"#1e293b", dim:"#334155",
  muted:"#475569", sub:"#64748b", text:"#94a3b8", bright:"#e2e8f0",
  green:"#22c55e", red:"#ef4444", amber:"#f59e0b", blue:"#60a5fa",
  bull:"rgba(38,166,154,0.85)", bear:"rgba(239,83,80,0.85)",
};

const SYMS = ["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"];

const TF_CONFIG = [
  { tf:"4h",  label:"4H",  role:"Trend Bias",     weight:3, color:"#60a5fa",  icon:"📐" },
  { tf:"1h",  label:"1H",  role:"Structure / FVG", weight:3, color:"#a78bfa",  icon:"🏗️"  },
  { tf:"15m", label:"15M", role:"Confirmation",    weight:2, color:"#f59e0b",  icon:"⚡" },
  { tf:"5m",  label:"5M",  role:"Entry Trigger",   weight:2, color:"#22c55e",  icon:"🎯" },
];

// ── Price helpers ──────────────────────────────────────────────────────────────
function fp(p) {
  if (!p && p !== 0) return "—";
  return p > 100
    ? p.toLocaleString(undefined, { minimumFractionDigits:1, maximumFractionDigits:1 })
    : p.toFixed(4);
}

// ── Indicator math ─────────────────────────────────────────────────────────────
function emaArr(data, period) {
  const k = 2 / (period + 1);
  const out = Array(data.length).fill(null);
  let val = null;
  for (let i = 0; i < data.length; i++) {
    if (data[i] == null) continue;
    val = val === null ? data[i] : data[i] * k + val * (1 - k);
    out[i] = val;
  }
  return out;
}

function detectFVGs(candles, count = 4) {
  const fvgs = [];
  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2], c2 = candles[i - 1], c3 = candles[i];
    // Bullish FVG: c1.high < c3.low (gap between c1 top and c3 bottom)
    if (c1.high < c3.low) {
      fvgs.push({ type:"bull", top:c3.low, bottom:c1.high, mid:(c3.low+c1.high)/2, idx:i });
    }
    // Bearish FVG: c1.low > c3.high
    if (c1.low > c3.high) {
      fvgs.push({ type:"bear", top:c1.low, bottom:c3.high, mid:(c1.low+c3.high)/2, idx:i });
    }
  }
  return fvgs.slice(-count);
}

function analyzeCandles(candles) {
  if (!candles || candles.length < 20) return null;
  const closes = candles.map(c => c.close);
  const last = candles[candles.length - 1];
  const ema21 = emaArr(closes, 21);
  const ema50 = emaArr(closes, 50);
  const lastEma21 = ema21[ema21.length - 1];
  const lastEma50 = ema50[ema50.length - 1];

  // Trend: EMA21 vs EMA50 vs price
  let trend = "NEUTRAL";
  if (last.close > lastEma21 && lastEma21 > lastEma50) trend = "BULLISH";
  else if (last.close < lastEma21 && lastEma21 < lastEma50) trend = "BEARISH";
  else if (Math.abs(lastEma21 - lastEma50) / lastEma50 < 0.003) trend = "RANGING";

  // FVGs
  const fvgs = detectFVGs(candles);
  const lastPrice = last.close;
  const inFVG = fvgs.find(f => lastPrice >= f.bottom && lastPrice <= f.top);

  // Swing highs/lows for structure
  const recent = candles.slice(-30);
  let swingHigh = Math.max(...recent.map(c => c.high));
  let swingLow  = Math.min(...recent.map(c => c.low));
  const range   = swingHigh - swingLow;
  const midpoint = swingLow + range / 2;
  const inDiscount = lastPrice < midpoint;
  const inPremium  = lastPrice > midpoint;

  // Momentum: last 3 candles
  const last3 = candles.slice(-3);
  const bullCandles = last3.filter(c => c.close > c.open).length;
  const momentum = bullCandles >= 2 ? "BULL" : bullCandles <= 1 ? "BEAR" : "FLAT";

  return {
    trend, fvgs, inFVG, momentum,
    swingHigh, swingLow, midpoint, range,
    inDiscount, inPremium,
    lastPrice,
    ema21: lastEma21, ema50: lastEma50,
    ema21arr: ema21, ema50arr: ema50,
  };
}

// ── State per timeframe → color + score ──────────────────────────────────────
function evaluateTF(analysis, tfLabel, sig) {
  if (!analysis) return { color:"#6b7280", status:"⚪ No Data", score:0, detail:"Loading..." };

  const { trend, inFVG, fvgs, momentum } = analysis;

  if (tfLabel === "4H") {
    if (trend === "BULLISH") return { color:P.green,  status:"🟢 Bullish",  score:3, detail:`EMA21 > EMA50 — price above both. Bias: UP.` };
    if (trend === "BEARISH") return { color:P.red,    status:"🔴 Bearish",  score:3, detail:`EMA21 < EMA50 — price below both. Bias: DOWN.` };
    if (trend === "RANGING") return { color:P.amber,  status:"🟡 Ranging",  score:1, detail:`EMAs flat — market in equilibrium. Low probability.` };
    return                          { color:"#6b7280", status:"⚪ Neutral",  score:0, detail:"Insufficient data for bias." };
  }

  if (tfLabel === "1H") {
    if (inFVG)    return { color:P.green,  status:"🟢 In FVG Zone", score:3, detail:`Price inside Fair Value Gap ${fp(inFVG.bottom)}–${fp(inFVG.top)}. Structure confirmed.` };
    if (fvgs.length > 0) {
      const nearest = fvgs.sort((a,b) => Math.abs(a.mid - analysis.lastPrice) - Math.abs(b.mid - analysis.lastPrice))[0];
      const dist    = Math.abs(nearest.mid - analysis.lastPrice);
      const pct     = (dist / analysis.lastPrice * 100).toFixed(2);
      if (dist / analysis.lastPrice < 0.015)
        return { color:P.amber, status:"🟡 Near FVG",    score:2, detail:`${pct}% from nearest FVG. Developing — watch for price to enter zone.` };
      return   { color:"#6b7280", status:"⚪ No Zone",   score:0, detail:`${pct}% from nearest FVG. Not at key zone. Wait.` };
    }
    return       { color:"#6b7280", status:"⚪ No FVG",   score:0, detail:"No Fair Value Gaps identified. No structure to trade from." };
  }

  if (tfLabel === "15M") {
    const stopHunt = sig?.context?.stopHunt || sig?.stopHunt;
    const ofBias   = sig?.context?.orderflow?.bias;
    if (stopHunt && momentum !== "FLAT")
      return { color:P.green, status:"🟢 Confirmed",   score:2, detail:`Liquidity sweep + ${ofBias?.replace(/_IN_CONTROL/,"")?.replace(/_/," ")||"orderflow"} aligned. Confirmation complete.` };
    if (stopHunt)
      return { color:P.amber, status:"🟡 Developing",  score:1, detail:"Sweep detected — waiting for momentum to align with direction." };
    if (momentum !== "FLAT" && trend !== "NEUTRAL")
      return { color:P.amber, status:"🟡 Momentum",    score:1, detail:`${momentum === "BULL" ? "Bullish" : "Bearish"} momentum building. No sweep yet.` };
    return { color:"#6b7280",  status:"⚪ Waiting",     score:0, detail:"No confirmation signal yet. Watching for liquidity sweep." };
  }

  if (tfLabel === "5M") {
    const action  = sig?.signal?.action || sig?.action;
    const score   = sig?.signal?.score  || sig?.score || 0;
    const plan    = sig?.signal?.tradePlan;
    const stopHunt= sig?.context?.stopHunt || sig?.stopHunt;
    if ((action === "TRADE") && score >= 85)
      return { color:P.green, status:"🟢 ENTRY READY",  score:2, detail:`Score ${score} — ${sig?.signal?.direction||""}. Entry ${fp(plan?.entry)} SL ${fp(plan?.stopLoss)} TP ${fp(plan?.takeProfit)}.` };
    if ((action === "TRADE" || action === "WATCH") && score >= 70)
      return { color:P.amber, status:"🟡 FVG Forming",   score:1, detail:`Score ${score} — watch mode. Entry zone forming. Prepare order.` };
    if (stopHunt)
      return { color:P.amber, status:"🟡 Sweep Seen",    score:1, detail:"Sweep detected on 5M. Waiting for FVG to form as entry zone." };
    return { color:"#6b7280",  status:"⚪ Waiting",       score:0, detail:"No 5M entry trigger. System scanning. Patience." };
  }

  return { color:"#6b7280", status:"⚪ —", score:0, detail:"—" };
}

// ── Mini canvas chart for each TF panel ───────────────────────────────────────
function TFChart({ candles, analysis, tfCfg, height = 240 }) {
  const ref = useRef(null);

  const draw = useCallback(() => {
    const cvs = ref.current;
    if (!cvs || !candles?.length) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0, 0, W, H);

    const display = candles.slice(-50);
    const PL = 48, PR = 50, PT = 8, PB = 22;
    const cW = W - PL - PR, cH = H - PT - PB;

    const prices = display.flatMap(c => [c.high, c.low]);
    if (analysis?.fvgs) analysis.fvgs.forEach(f => prices.push(f.top, f.bottom));
    const rawMin = Math.min(...prices), rawMax = Math.max(...prices);
    const pad = (rawMax - rawMin) * 0.08;
    const minP = rawMin - pad, maxP = rawMax + pad, rng = maxP - minP || 1;

    const toX = i => PL + (i / (display.length - 1 || 1)) * cW;
    const toY = p => PT + (1 - (p - minP) / rng) * cH;

    // BG
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);

    // Grid (minimal)
    for (let i = 0; i <= 4; i++) {
      const y = PT + (i / 4) * cH;
      ctx.strokeStyle = "#131b28"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(W - PR, y); ctx.stroke();
      ctx.fillStyle = "#374151"; ctx.font = "8px monospace"; ctx.textAlign = "right";
      ctx.fillText(fp(maxP - (i / 4) * rng), PL - 2, y + 3);
    }

    // FVG shading
    if (analysis?.fvgs) {
      analysis.fvgs.forEach(f => {
        const yTop = toY(f.top), yBot = toY(f.bottom);
        if (yTop > PT + cH || yBot < PT) return;
        ctx.fillStyle = f.type === "bull" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
        ctx.fillRect(PL, yTop, cW, yBot - yTop);
        ctx.strokeStyle = f.type === "bull" ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)";
        ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(PL, yTop); ctx.lineTo(W - PR - 2, yTop); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(PL, yBot); ctx.lineTo(W - PR - 2, yBot); ctx.stroke();
        ctx.setLineDash([]);
        // Label
        ctx.fillStyle = f.type === "bull" ? "#22c55e" : "#ef4444";
        ctx.font = "bold 7px monospace"; ctx.textAlign = "left";
        ctx.fillText("FVG", PL + 2, (yTop + yBot) / 2 + 3);
        // Right price label
        ctx.textAlign = "left";
        ctx.fillText(fp(f.mid), W - PR + 2, (yTop + yBot) / 2 + 3);
      });
    }

    // EMA lines
    if (analysis?.ema21arr && display.length === candles.slice(-50).length) {
      const ema21 = analysis.ema21arr.slice(-50);
      const ema50 = (analysis.ema50arr || []).slice(-50);
      [[ema21, tfCfg.color, 1.5], [ema50, "#a78bfa", 1]].forEach(([vals, col, lw]) => {
        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash([]);
        let started = false;
        vals.forEach((v, i) => {
          if (v == null) { started = false; return; }
          if (!started) { ctx.moveTo(toX(i), toY(v)); started = true; }
          else ctx.lineTo(toX(i), toY(v));
        });
        ctx.stroke();
      });
    }

    // Candlesticks
    const cw = Math.max(2, (cW / display.length) * 0.72);
    display.forEach((c, i) => {
      const x = toX(i), bull = c.close >= c.open;
      ctx.strokeStyle = bull ? "#26a69a" : "#ef5350"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, toY(c.high)); ctx.lineTo(x, toY(c.low)); ctx.stroke();
      const bt = toY(Math.max(c.open, c.close));
      const bh = Math.max(1, toY(Math.min(c.open, c.close)) - bt);
      ctx.fillStyle = bull ? P.bull : P.bear;
      ctx.fillRect(x - cw / 2, bt, cw, bh);
    });

    // Current price line + tag
    const last = display[display.length - 1];
    if (last) {
      const y = toY(last.close);
      ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(W - PR, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#1f2937"; ctx.fillRect(W - PR + 2, y - 7, 46, 14);
      ctx.fillStyle = "#f9fafb"; ctx.font = "bold 8px monospace"; ctx.textAlign = "left";
      ctx.fillText(fp(last.close), W - PR + 5, y + 4);
    }

    // Premium/Discount midline (only on 4H + 1H)
    if (analysis?.midpoint) {
      const midY = toY(analysis.midpoint);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PL, midY); ctx.lineTo(W - PR, midY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#334155"; ctx.font = "8px monospace"; ctx.textAlign = "left";
      ctx.fillText("50%", PL + 2, midY - 2);
    }

    // TF badge top-left
    ctx.fillStyle = `${tfCfg.color}18`; ctx.fillRect(PL, PT, 58, 14);
    ctx.fillStyle = tfCfg.color; ctx.font = "bold 8px monospace"; ctx.textAlign = "left";
    ctx.fillText(`${tfCfg.label} — ${tfCfg.role}`, PL + 3, PT + 10);

  }, [candles, analysis, tfCfg]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas
      ref={ref}
      width={740}
      height={height}
      style={{ width:"100%", height, display:"block", borderRadius:6, background:P.bg }}
    />
  );
}

// ── Single TF Panel ────────────────────────────────────────────────────────────
function TFPanel({ tfCfg, candles, analysis, state }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      background: P.panel,
      borderRadius: 10,
      border: `1px solid ${state.color}44`,
      overflow: "hidden",
      transition: "border-color 0.3s",
      flex: 1,
    }}>
      {/* Header bar */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: "10px 14px",
          background: `${state.color}10`,
          borderBottom: `1px solid ${state.color}33`,
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>{tfCfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
            <span style={{ fontSize:13, fontWeight:800, color: tfCfg.color }}>{tfCfg.label}</span>
            <span style={{ fontSize:10, color: P.muted }}>— {tfCfg.role}</span>
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:state.color, marginTop:2 }}>{state.status}</div>
        </div>
        {/* Score dots */}
        <div style={{ display:"flex", gap:3 }}>
          {Array.from({ length: tfCfg.weight }).map((_, i) => (
            <div key={i} style={{
              width:8, height:8, borderRadius:"50%",
              background: i < state.score ? state.color : "#1e293b",
              transition: "background 0.3s",
            }}/>
          ))}
        </div>
        <span style={{ fontSize:16, color:P.muted }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div>
          {/* Chart */}
          <div style={{ padding:"10px 10px 0" }}>
            {candles?.length ? (
              <TFChart candles={candles} analysis={analysis} tfCfg={tfCfg} height={240} />
            ) : (
              <div style={{ height:240, display:"flex", alignItems:"center", justifyContent:"center", color:P.muted, fontSize:11 }}>
                Loading {tfCfg.label} candles...
              </div>
            )}
          </div>

          {/* Detail row */}
          <div style={{ padding:"10px 14px 12px", fontSize:11, color:P.text, lineHeight:1.6 }}>
            {state.detail}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sync bar ───────────────────────────────────────────────────────────────────
function SyncBar({ states }) {
  return (
    <div style={{ background:P.panel, borderRadius:10, border:`1px solid ${P.border}`, padding:"12px 16px" }}>
      <div style={{ fontSize:10, fontWeight:700, color:P.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>
        📊 Timeframe Synchronization
      </div>
      {TF_CONFIG.map((tf, i) => {
        const s = states[i];
        const pct = s ? Math.round((s.score / tf.weight) * 100) : 0;
        return (
          <div key={tf.tf} style={{ marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:11, fontWeight:700, color:tf.color }}>{tf.label}</span>
              <span style={{ fontSize:10, color:s?.color || P.muted }}>{s?.status || "⚪ Loading"}</span>
            </div>
            <div style={{ height:6, background:"#1e293b", borderRadius:3, overflow:"hidden" }}>
              <div style={{
                width:`${pct}%`, height:"100%", borderRadius:3,
                background:s?.color || "#1e293b",
                transition:"width 0.6s, background 0.4s",
              }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Market State Engine ────────────────────────────────────────────────────────
function MarketStateCard({ states, sig, sym, onExecute }) {
  const totalScore    = states.reduce((s, st) => s + (st?.score || 0), 0);
  const maxScore      = TF_CONFIG.reduce((s, t) => s + t.weight, 0); // 10
  const probability   = totalScore >= 8 ? "HIGH" : totalScore >= 6 ? "MEDIUM" : "LOW";
  const probColor     = probability === "HIGH" ? P.green : probability === "MEDIUM" ? P.amber : P.red;
  const action        = totalScore >= 8 ? "EXECUTE TRADE" : totalScore >= 6 ? "WAIT — DEVELOPING" : "STAND DOWN";

  const regime   = sig?.context?.regime?.type || sig?.regime || "—";
  const score    = sig?.signal?.score || sig?.score || 0;
  const dir      = sig?.signal?.direction || sig?.direction;
  const stopHunt = sig?.context?.stopHunt || sig?.stopHunt;

  // Session
  const now    = new Date();
  const utc2H  = (now.getUTCHours() + 2) % 24;
  const utc2M  = now.getUTCMinutes();
  const dec    = utc2H + utc2M / 60;
  const sessionName = dec >= 15 && dec < 18 ? "🔥 Overlap (High Quality)"
    : dec >= 9  && dec < 18 ? "🏦 London (Primary)"
    : dec >= 18 && dec < 22 ? "🗽 New York (Selective)"
    : dec >= 2  && dec < 8  ? "🌏 Asia (Blocked)"
    : "⛔ Off-Hours";
  const sessionOk = dec >= 9 && dec < 22 && !(dec >= 2 && dec < 8);

  const confirmed = states.filter(s => s?.score === TF_CONFIG[states.indexOf(s)]?.weight).length;

  const alerts = [];
  if (states[1]?.score >= 2 && states[0]?.score === 3) alerts.push("🔔 Price in 1H FVG zone");
  if (states[2]?.score >= 1 && states[3]?.score >= 1) alerts.push("🔔 5M trigger forming — prepare entry");
  if (totalScore >= 8) alerts.push("🔔 All timeframes aligned — EXECUTE");

  return (
    <div style={{
      background: totalScore >= 8 ? "rgba(34,197,94,0.07)" : totalScore >= 6 ? "rgba(245,158,11,0.05)" : P.panel,
      borderRadius:10,
      border:`2px solid ${probColor}44`,
      padding:16,
      transition:"all 0.4s",
    }}>
      {/* Title */}
      <div style={{ fontSize:11, fontWeight:700, color:P.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>
        🧠 Live Market State — {sym.replace("USDT","")}
      </div>

      {/* Score ring + verdict */}
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:14 }}>
        {/* SVG donut */}
        <div style={{ position:"relative", width:80, height:80, flexShrink:0 }}>
          <svg viewBox="0 0 36 36" style={{ width:80, height:80, transform:"rotate(-90deg)" }}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3.5"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={probColor} strokeWidth="3.5"
              strokeDasharray={`${(totalScore/maxScore)*100} ${100-(totalScore/maxScore)*100}`}
              strokeLinecap="round" style={{ transition:"all 0.6s" }}/>
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:16, fontWeight:800, color:probColor, lineHeight:1 }}>{totalScore}</span>
            <span style={{ fontSize:8, color:P.muted }}>/ {maxScore}</span>
          </div>
        </div>

        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:800, color:probColor, marginBottom:4 }}>
            {probability === "HIGH" ? "🔥" : probability === "MEDIUM" ? "⏳" : "🚫"} {action}
          </div>
          <div style={{ fontSize:11, color:P.text, marginBottom:6 }}>
            Trade Probability: <span style={{ fontWeight:700, color:probColor }}>{probability}</span>
            {" · "}{confirmed}/4 timeframes confirmed
          </div>
          {totalScore >= 8 && (
            <button onClick={onExecute} style={{
              padding:"8px 20px", borderRadius:7, border:"none", cursor:"pointer",
              background:"linear-gradient(135deg,#15803d,#22c55e)",
              color:"#fff", fontWeight:800, fontSize:12,
              boxShadow:"0 4px 20px rgba(34,197,94,0.4)",
            }}>
              {dir ? `▲ Execute ${dir}` : "Execute Trade →"}
            </button>
          )}
        </div>
      </div>

      {/* State grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        {[
          { l:"Trend",    v:states[0]?.status||"—",      c:states[0]?.color||P.muted },
          { l:"Location", v:states[1]?.score>=2?"✅ In FVG":"⏳ Seeking zone", c:states[1]?.color||P.muted },
          { l:"Session",  v:sessionName,                  c:sessionOk?P.green:P.red },
          { l:"System Score", v:score,                   c:score>=85?P.green:score>=70?P.amber:P.red },
          { l:"Regime",   v:regime.replace(/_/g," "),    c:["TRENDING_UP","TRENDING_DOWN"].includes(regime)?P.green:P.amber },
          { l:"Stop Hunt",v:stopHunt?"DETECTED":"—",     c:stopHunt?P.green:P.muted },
        ].map(x=>(
          <div key={x.l} style={{ background:P.bg, borderRadius:6, padding:"7px 10px" }}>
            <div style={{ fontSize:9, color:P.muted, textTransform:"uppercase", marginBottom:2 }}>{x.l}</div>
            <div style={{ fontSize:11, fontWeight:700, color:x.c }}>{x.v}</div>
          </div>
        ))}
      </div>

      {/* Score interpretation */}
      <div style={{ background:P.bg, borderRadius:7, padding:10, marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, color:P.muted, textTransform:"uppercase", marginBottom:8 }}>Score Calculation</div>
        {TF_CONFIG.map((tf, i) => {
          const s = states[i];
          return (
            <div key={tf.tf} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ fontSize:10, color:tf.color, fontWeight:700, width:30 }}>{tf.label}</span>
              <span style={{ fontSize:10, color:P.muted }}>+{tf.weight} pts if confirmed</span>
              <div style={{ flex:1, height:4, background:"#1e293b", borderRadius:2, overflow:"hidden" }}>
                <div style={{ width:`${s ? (s.score/tf.weight)*100 : 0}%`, height:"100%", background:s?.color||"#1e293b", transition:"width 0.5s" }}/>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:s?.color||P.muted, width:24, textAlign:"right" }}>
                {s?.score||0}/{tf.weight}
              </span>
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ space:"y-2" }}>
          {alerts.map((a,i)=>(
            <div key={i} style={{
              padding:"7px 12px", borderRadius:6, marginBottom:5,
              background:a.includes("EXECUTE")?"rgba(34,197,94,0.1)":"rgba(245,158,11,0.07)",
              border:`1px solid ${a.includes("EXECUTE")?"#22c55e44":"#f59e0b33"}`,
              fontSize:11, color:a.includes("EXECUTE")?P.green:P.amber, fontWeight:600,
            }}>{a}</div>
          ))}
        </div>
      )}

      {/* Status legend */}
      <div style={{ display:"flex", gap:12, marginTop:12, paddingTop:10, borderTop:`1px solid ${P.border}`, flexWrap:"wrap" }}>
        {[
          {col:P.green,  lbl:"🟢 Confirmed"},
          {col:P.amber,  lbl:"🟡 Developing"},
          {col:P.red,    lbl:"🔴 Invalid"},
          {col:"#6b7280",lbl:"⚪ Not ready"},
        ].map(x=>(
          <div key={x.lbl} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:x.col }}/>
            <span style={{ fontSize:10, color:P.text }}>{x.lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root Component ─────────────────────────────────────────────────────────────
export default function CandlestickAlignment({ signals }) {
  const { candles:allCandles, loadCandles } = useStore();
  const [sym,       setSym]       = useState("BTCUSDT");
  const [showModal, setShowModal] = useState(false);

  // Load all 4 timeframes
  useEffect(() => {
    ["4h","1h","15m","5m"].forEach(tf => loadCandles(sym, tf));
  }, [sym]);

  // Polling: refresh every 60s
  useEffect(() => {
    const id = setInterval(() => {
      ["4h","1h","15m","5m"].forEach(tf => loadCandles(sym, tf));
    }, 60000);
    return () => clearInterval(id);
  }, [sym]);

  const sig = signals.find(s => (s.asset || s.symbol) === sym);

  // Get candles for each TF
  const tfCandles = TF_CONFIG.map(t => allCandles[`${sym}_${t.tf}`] || []);

  // Analyse each TF
  const analyses = tfCandles.map(c => analyzeCandles(c));

  // Evaluate state for each TF
  const states = TF_CONFIG.map((tf, i) => evaluateTF(analyses[i], tf.label, sig));

  const plan = sig?.signal?.tradePlan;
  const dir  = sig?.signal?.direction || sig?.direction;
  const modalSignal = sig ? {
    asset:sym, direction:dir||"LONG",
    score:sig?.signal?.score||0,
    regime:sig?.context?.regime?.type||sig?.regime,
    entry:plan?.entry, sl:plan?.stopLoss, tp:plan?.takeProfit,
    stopHunt:sig?.context?.stopHunt||sig?.stopHunt,
    signal:sig?.signal, context:sig?.context,
  } : { asset:sym, direction:"LONG" };

  return (
    <div style={{ color:P.bright }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontSize:17, fontWeight:800, margin:0 }}>🧠 Market State Visualizer</h2>
          <p style={{ fontSize:11, color:P.sub, margin:"4px 0 0" }}>
            4H Bias → 1H Structure → 15M Confirmation → 5M Entry — all stacked, all live
          </p>
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {SYMS.map(s => (
            <button key={s} onClick={() => setSym(s)} style={{
              padding:"4px 10px", borderRadius:5, border:"none", fontWeight:700, fontSize:11, cursor:"pointer",
              background:sym===s?"#22c55e":"#1e293b", color:sym===s?"#000":"#475569", transition:"all 0.2s",
            }}>{s.replace("USDT","")}</button>
          ))}
        </div>
      </div>

      {/* Layout: stacked TF panels LEFT, state engine RIGHT */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:12, alignItems:"start" }}>

        {/* LEFT: stacked TF panels */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {TF_CONFIG.map((tf, i) => (
            <TFPanel
              key={tf.tf}
              tfCfg={tf}
              candles={tfCandles[i]}
              analysis={analyses[i]}
              state={states[i]}
            />
          ))}
        </div>

        {/* RIGHT: sticky state engine */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, position:"sticky", top:20 }}>
          <MarketStateCard
            states={states}
            sig={sig}
            sym={sym}
            onExecute={() => setShowModal(true)}
          />
          <SyncBar states={states}/>
        </div>
      </div>

      {showModal && (
        <TradeEntryModal
          signal={modalSignal}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  );
}