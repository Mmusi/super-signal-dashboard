import React, { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import TradeEntryModal from "../trade/TradeEntryModal";

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const P = {
  bg:"#0b0e14", panel:"#0f172a", border:"#1e293b", dim:"#334155",
  muted:"#475569", sub:"#64748b", text:"#94a3b8", bright:"#e2e8f0",
  green:"#22c55e", red:"#ef4444", amber:"#f59e0b", blue:"#60a5fa",
  purple:"#a78bfa", bull:"rgba(38,166,154,0.85)", bear:"rgba(239,83,80,0.85)",
};
const SYMS = ["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fp(p) {
  if (p == null) return "—";
  return p > 100
    ? p.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})
    : p.toFixed(4);
}

function Tip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position:"relative", display:"inline-block" }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show && (
        <div style={{
          position:"absolute", bottom:"120%", left:"50%", transform:"translateX(-50%)",
          background:"#0d1526", border:"1px solid #334155", borderRadius:8,
          padding:"10px 14px", fontSize:11, color:"#cbd5e1", lineHeight:1.65,
          zIndex:9999, width:260, boxShadow:"0 12px 40px rgba(0,0,0,0.7)", pointerEvents:"none",
        }}>{text}</div>
      )}
    </span>
  );
}

function InfoBadge({ label, color="#22c55e", tip }) {
  const el = (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:700,
      background:`${color}15`, color, border:`1px solid ${color}33`,
      cursor:tip?"help":"default",
    }}>{label}</span>
  );
  return tip ? <Tip text={tip}>{el}</Tip> : el;
}

function CheckRow({ done, label, tip, detail }) {
  return (
    <div style={{
      display:"flex", alignItems:"flex-start", gap:10, padding:"8px 12px",
      borderRadius:6, marginBottom:6,
      background:done?"rgba(34,197,94,0.06)":"rgba(255,255,255,0.02)",
      border:`1px solid ${done?"#22c55e33":"#1e293b"}`, transition:"all 0.3s",
    }}>
      <div style={{
        width:20, height:20, borderRadius:"50%", flexShrink:0, marginTop:1,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:11,
        background:done?"#22c55e":"#1e293b", border:`2px solid ${done?"#22c55e":"#334155"}`,
        color:done?"#fff":"#475569",
      }}>{done?"✓":"○"}</div>
      <div style={{ flex:1 }}>
        {tip
          ? <Tip text={tip}><span style={{ fontSize:12, fontWeight:done?400:600,
              color:done?P.sub:P.bright, cursor:"help", borderBottom:"1px dashed #334155" }}>{label}</span></Tip>
          : <span style={{ fontSize:12, fontWeight:done?400:600, color:done?P.sub:P.bright }}>{label}</span>
        }
        {detail && <div style={{ fontSize:10, color:done?P.green:P.muted, marginTop:2 }}>{detail}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOSSARY — every symbol explained
// ─────────────────────────────────────────────────────────────────────────────
const GLOSSARY = [
  {
    sym:"BSL", full:"Buy-Side Liquidity", color:"#ef4444",
    icon:"🎯",
    what:"Cluster of stop-loss orders sitting ABOVE swing highs. When you go short, your stop goes above the last high — so does everyone else's. This creates a pool of orders.",
    where:"Red dashed lines above price on the chart.",
    signal:"When price sweeps above BSL then reverses DOWN → short entry. Smart money grabbed those stops to fuel their sell orders.",
    entry:"SHORT after BSL sweep. SL above the swept high. TP at nearest SSL zone below.",
    example:"BTC pushes above $79,000 (old high), triggers all shorts' stops, then immediately reverses. That reversal is your signal.",
  },
  {
    sym:"SSL", full:"Sell-Side Liquidity", color:"#22c55e",
    icon:"🎯",
    what:"Cluster of stop-loss orders sitting BELOW swing lows. Every long position has a stop below a recent low — all those stops are SSL.",
    where:"Green dashed lines below price on the chart.",
    signal:"When price sweeps below SSL then reverses UP → long entry. Smart money grabbed those stops to fuel their buy orders.",
    entry:"LONG after SSL sweep. SL below the swept low. TP at nearest BSL zone above.",
    example:"BTC drops below $74,000 (last swing low), triggers all longs' stops, then reverses up. That reversal is your long entry.",
  },
  {
    sym:"OB", full:"Order Block", color:"#60a5fa",
    icon:"📦",
    what:"The last opposing candle before a strong move. For a bullish move: the last RED candle before price shot up. Institutions placed big buy orders here — price often returns to retest.",
    where:"Coloured rectangles on chart. Blue/green box = bullish OB. Red box = bearish OB.",
    signal:"Price returns to OB zone after a strong move → enter in the direction of the original move.",
    entry:"LONG: price returns to bullish OB (green box), enter at 50% of the OB candle. SL below the OB low.",
    example:"BTC drops then flies up from $75,000 — the last red candle at $75k is the OB. When price returns to $75k area, buy.",
  },
  {
    sym:"FVG", full:"Fair Value Gap (Imbalance)", color:"#a78bfa",
    icon:"⬜",
    what:"A price gap created by a 3-candle pattern where candle 1's high and candle 3's low don't overlap. This imbalance in buying/selling must be 'filled' — price returns.",
    where:"Purple shaded zone between candle 1 high and candle 3 low.",
    signal:"Price pulls back into FVG after a strong move → continuation entry in original direction.",
    entry:"LONG: wait for price to enter FVG from above, first candle to close inside FVG = entry. SL below FVG.",
    example:"BTC jumps from $76k to $78k in 3 candles with a gap. When BTC retraces to $76.5k (the gap), that's your long entry.",
  },
  {
    sym:"IFVG", full:"Inversion Fair Value Gap", color:"#f59e0b",
    icon:"🔄",
    what:"An FVG that price has already 'filled' (passed through). Once filled, the zone INVERTS — it was support, now it becomes resistance (or vice versa).",
    where:"Amber/yellow zone. Previously filled FVG that now acts as the opposite.",
    signal:"Price returns to IFVG from the other side → entry. This is the BSL model's primary entry.",
    entry:"1st entry: price fills old FVG, close on the other side → enter on 2nd candle open.",
    example:"BTC had a bullish FVG at $76k. Price fills it then continues down. On the next rally, $76k acts as RESISTANCE — short entry.",
  },
  {
    sym:"BB / Breaker", full:"Breaker Block", color:"#38bdf8",
    icon:"💥",
    what:"Old support that gets BROKEN and becomes resistance (or old resistance broken, becomes support). The last bullish candle before a bearish breakdown.",
    where:"Blue box. The swing high/low candle that was broken.",
    signal:"Price returns to retest the breaker from the other side → 2nd entry opportunity (more conservative).",
    entry:"2nd entry: price retests the broken level from below → short. SL above the breaker candle high.",
    example:"BTC was holding $77k as support. It breaks below. Price rallies back to $77k (now resistance) → short entry.",
  },
  {
    sym:"PDA", full:"Premium/Discount Array", color:"#22c55e",
    icon:"📊",
    what:"The classification of price position relative to a range. Above the 50% midpoint = PREMIUM (expensive, sell zone). Below 50% = DISCOUNT (cheap, buy zone).",
    where:"Green/red background on chart. The 50% equilibrium line divides the range.",
    signal:"Only buy in DISCOUNT zone. Only sell in PREMIUM zone. Never trade mid-range.",
    entry:"LONG only when price is below 50% of the recent range. SHORT only above 50%.",
    example:"BTC range: $74k–$80k. Midpoint = $77k. Above $77k = premium (sell). Below $77k = discount (buy).",
  },
  {
    sym:"CHoCH", full:"Change of Character", color:"#22c55e",
    icon:"↗",
    what:"The first higher high after a series of lower highs (in a downtrend). Or first lower low after a series of higher lows. Signals that the trend may be changing.",
    where:"Marked on lower timeframe chart after a sweep. The first candle that closes above/below the previous swing.",
    signal:"After a BSL/SSL sweep, the first CHoCH confirms the reversal is real, not just noise.",
    entry:"Enter on the CHoCH candle close or the pullback into the new FVG created by the CHoCH move.",
    example:"BTC in downtrend (lower highs). After SSL sweep at $74k, BTC makes a higher high above $75.5k → CHoCH. Now long.",
  },
  {
    sym:"MSS", full:"Market Structure Shift", color:"#60a5fa",
    icon:"🔀",
    what:"A larger, more decisive break of market structure. Where CHoCH is the first signal, MSS is the confirmation. Price breaks a significant swing high/low.",
    where:"Dotted line on chart connecting sweep low to new high (or sweep high to new low).",
    signal:"MSS after a sweep = high-confidence reversal. Both CHoCH + MSS = strong entry signal.",
    entry:"Same as CHoCH but with greater conviction. Often triggers the system's TRADE signal.",
    example:"After SSL sweep + CHoCH, BTC then breaks above a major swing high — that's the MSS confirmation. Full position.",
  },
  {
    sym:"⚡ SWEEP", full:"Liquidity Sweep / Stop Hunt", color:"#f59e0b",
    icon:"⚡",
    what:"Price briefly spikes beyond a key level (BSL above or SSL below), grabs the stop-loss orders there, then IMMEDIATELY reverses. The spike is the hunt, the reversal is the trade.",
    where:"⚡ marker on the chart at the spike candle. Yellow/amber colour.",
    signal:"The most important signal. No sweep = no entry. Sweep + reversal = setup complete.",
    entry:"Do NOT enter on the sweep candle itself. Wait for the reversal candle to close, then enter on the next candle's open.",
    example:"Yellow ⚡ on chart means the system detected a sweep. Check the reversal — if confirmed, go to Step 4.",
  },
  {
    sym:"RR", full:"Risk:Reward Ratio", color:"#22c55e",
    icon:"⚖️",
    what:"How much you can win vs how much you risk. RR 1:2 means: risk $100 to potentially make $200. A positive-expectancy system requires minimum 1:1.5.",
    where:"Shown in the trade plan box and on the Step 4 chart as a label in the reward zone.",
    signal:"Never take a trade below 1:1.5. BSL model requires 1:2. MTF requires 1:1.5.",
    entry:"RR is calculated automatically from Entry/SL/TP. If the number is red, move your TP to a further level.",
    example:"Entry $77,000. SL $76,700 (−$300 risk). TP $77,600 (+$600 reward). RR = 1:2. ✅",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GLOSSARY PANEL
// ─────────────────────────────────────────────────────────────────────────────
function GlossaryPanel() {
  const [selected, setSelected] = useState(null);
  const entry = GLOSSARY.find(g=>g.sym===selected);

  return (
    <div style={{ background:P.panel, borderRadius:10, border:`1px solid ${P.border}`, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${P.border}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:P.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>
          📖 Symbol Glossary — click any symbol to learn what it means
        </div>
      </div>

      {/* Symbol grid */}
      <div style={{ padding:"10px 14px", display:"flex", flexWrap:"wrap", gap:6 }}>
        {GLOSSARY.map(g=>(
          <button key={g.sym} onClick={()=>setSelected(selected===g.sym?null:g.sym)} style={{
            padding:"4px 10px", borderRadius:5, border:`1px solid ${selected===g.sym?g.color:P.border}`,
            background:selected===g.sym?`${g.color}18`:P.bg,
            color:selected===g.sym?g.color:P.text,
            fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.2s",
          }}>{g.icon} {g.sym}</button>
        ))}
      </div>

      {/* Detail pane */}
      {entry && (
        <div style={{ padding:"14px", borderTop:`1px solid ${P.border}`, background:P.bg }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontSize:22 }}>{entry.icon}</span>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:entry.color }}>{entry.sym}</div>
                  <div style={{ fontSize:11, color:P.text }}>{entry.full}</div>
                </div>
              </div>
              <div style={{ background:P.panel, borderRadius:7, padding:12, marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:P.muted, textTransform:"uppercase", marginBottom:5 }}>What is it?</div>
                <div style={{ fontSize:12, color:P.text, lineHeight:1.6 }}>{entry.what}</div>
              </div>
              <div style={{ background:P.panel, borderRadius:7, padding:12 }}>
                <div style={{ fontSize:10, fontWeight:700, color:P.muted, textTransform:"uppercase", marginBottom:5 }}>Where on the chart?</div>
                <div style={{ fontSize:12, color:P.text, lineHeight:1.6 }}>{entry.where}</div>
              </div>
            </div>
            <div>
              <div style={{ background:`${entry.color}08`, borderRadius:7, padding:12, border:`1px solid ${entry.color}22`, marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:entry.color, textTransform:"uppercase", marginBottom:5 }}>Signal — what to do when you see it</div>
                <div style={{ fontSize:12, color:P.bright, lineHeight:1.6 }}>{entry.signal}</div>
              </div>
              <div style={{ background:P.panel, borderRadius:7, padding:12, marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:P.muted, textTransform:"uppercase", marginBottom:5 }}>Entry rule</div>
                <div style={{ fontSize:12, color:P.text, lineHeight:1.6 }}>{entry.entry}</div>
              </div>
              <div style={{ background:"rgba(245,158,11,0.06)", borderRadius:7, padding:12, border:"1px solid #f59e0b22" }}>
                <div style={{ fontSize:10, fontWeight:700, color:P.amber, textTransform:"uppercase", marginBottom:5 }}>💡 Real example</div>
                <div style={{ fontSize:12, color:P.text, lineHeight:1.6, fontStyle:"italic" }}>{entry.example}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHEN TO ENTER MANUALLY vs WAIT FOR SIGNAL
// ─────────────────────────────────────────────────────────────────────────────
function EntryGuide() {
  return (
    <div style={{ background:P.panel, borderRadius:10, border:`1px solid ${P.border}`, padding:16, marginBottom:12 }}>
      <div style={{ fontSize:11, fontWeight:700, color:P.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>
        🤔 When to Enter Manually vs Wait for the Signal
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {/* Wait for signal */}
        <div style={{ background:"rgba(34,197,94,0.06)", borderRadius:8, padding:12, border:"1px solid #22c55e22" }}>
          <div style={{ fontSize:12, fontWeight:800, color:P.green, marginBottom:8 }}>
            ✅ Wait for system signal when...
          </div>
          {[
            { rule:"Score ≥ 85", why:"High confidence — all factors aligned. This is the system's strongest setup. Let it fire automatically." },
            { rule:"Score 75–84 (WATCH)", why:"Valid setup. Can enter manually but reduce size. System detected real confluence." },
            { rule:"You are uncertain", why:"If you're asking yourself 'should I?', wait. Uncertainty = don't trade." },
            { rule:"Multiple signals on same asset", why:"System is seeing consistent confluence. That's confirmation — trust it." },
            { rule:"Regime is TRENDING + Sweep detected", why:"The two most powerful factors aligned = wait for TRADE signal which will come." },
          ].map((x,i)=>(
            <div key={i} style={{ display:"flex", gap:8, marginBottom:7 }}>
              <span style={{ color:P.green, flexShrink:0, fontSize:12, marginTop:1 }}>✓</span>
              <div>
                <span style={{ fontSize:11, fontWeight:700, color:P.bright }}>{x.rule}: </span>
                <span style={{ fontSize:11, color:P.text }}>{x.why}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Manual entry */}
        <div style={{ background:"rgba(245,158,11,0.05)", borderRadius:8, padding:12, border:"1px solid #f59e0b22" }}>
          <div style={{ fontSize:12, fontWeight:800, color:P.amber, marginBottom:8 }}>
            ⚠️ Enter manually (override) only when...
          </div>
          {[
            { rule:"You see a clear sweep on the chart", why:"You spotted the ⚡ SWEEP yourself on a lower timeframe and the system hasn't scored it yet (data lag). Use MTF Step 4 override." },
            { rule:"Score 65–74 + you confirm visually", why:"System is close. You can see the OB/FVG clearly. Use smaller size (0.5% risk max)." },
            { rule:"You're in a macro time window (BSL model)", why:"9:50–10:10 or 10:50–11:10 UTC+2 — these windows are so time-sensitive the system may lag slightly." },
            { rule:"Price just tapped a major HTF level", why:"A $79,000 round number, a previous monthly high — these are obvious even without the system confirming." },
            { rule:"Backtesting a specific setup", why:"Exploring the system. Use paper mode (BingX OFF) always for testing." },
          ].map((x,i)=>(
            <div key={i} style={{ display:"flex", gap:8, marginBottom:7 }}>
              <span style={{ color:P.amber, flexShrink:0, fontSize:12, marginTop:1 }}>→</span>
              <div>
                <span style={{ fontSize:11, fontWeight:700, color:P.bright }}>{x.rule}: </span>
                <span style={{ fontSize:11, color:P.text }}>{x.why}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop:10, padding:"6px 10px", background:"rgba(239,68,68,0.08)", borderRadius:5, fontSize:10, color:"#fca5a5" }}>
            ⚠️ Manual entries = higher risk. Reduce position size. Always set SL before entry.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BSL CANVAS CHART
// ─────────────────────────────────────────────────────────────────────────────
function BSLChart({ candles, sig }) {
  const ref   = useRef(null);
  const dpRef = useRef(null);
  const [hover, setHover] = useState(null);

  const regime   = sig?.context?.regime?.type || sig?.regime || "CHOP";
  const liq      = sig?.context?.liquidity;
  const stopHunt = sig?.context?.stopHunt || sig?.stopHunt;
  const atr      = sig?.context?.volatility?.atr || 0;
  const plan     = sig?.signal?.tradePlan;
  const of       = sig?.context?.orderflow;

  const draw = useCallback(()=>{
    const cvs=ref.current; if(!cvs||!candles.length) return;
    const ctx=cvs.getContext("2d");
    const W=cvs.width, H=cvs.height;
    ctx.clearRect(0,0,W,H);

    const display=candles.slice(-60);
    const PL=64, PR=82, PT=24, PB=30;
    const cW=W-PL-PR, cH=H-PT-PB;

    const prices=display.flatMap(c=>[c.high,c.low]);
    (liq?.buySide||[]).slice(0,5).forEach(z=>prices.push(z.price));
    (liq?.sellSide||[]).slice(0,5).forEach(z=>prices.push(z.price));
    if(plan){ prices.push(plan.entry,plan.stopLoss,plan.takeProfit); }
    const rawMin=Math.min(...prices), rawMax=Math.max(...prices);
    const pad=(rawMax-rawMin)*0.07;
    const minP=rawMin-pad, maxP=rawMax+pad, rng=maxP-minP||1;

    const toX=i=>PL+(i/(display.length-1||1))*cW;
    const toY=p=>PT+(1-(p-minP)/rng)*cH;
    dpRef.current={PL,PR,PT,PB,cW,cH,W,H,toX,toY,display};

    // BG + grid
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,W,H);
    for(let i=0;i<=7;i++){
      const y=PT+(i/7)*cH;
      ctx.strokeStyle="#131b28"; ctx.lineWidth=1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke();
      const price=maxP-(i/7)*rng;
      ctx.fillStyle="#374151"; ctx.font="9px monospace"; ctx.textAlign="right";
      ctx.fillText(fp(price), PL-4, y+3);
    }

    const lastPrice=display[display.length-1]?.close||0;
    const mid=(maxP+minP)/2, midY=toY(mid);

    // Premium/Discount tint
    ctx.fillStyle="rgba(239,68,68,0.04)";
    ctx.fillRect(PL,PT,cW,midY-PT);
    ctx.fillStyle="rgba(34,197,94,0.04)";
    ctx.fillRect(PL,midY,cW,(PT+cH)-midY);
    ctx.font="bold 8px monospace"; ctx.textAlign="left";
    ctx.fillStyle="rgba(239,68,68,0.4)"; ctx.fillText("PREMIUM", PL+4, PT+12);
    ctx.fillStyle="rgba(34,197,94,0.4)"; ctx.fillText("DISCOUNT", PL+4, PT+cH-4);
    ctx.setLineDash([4,4]); ctx.strokeStyle="rgba(255,255,255,0.1)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PL,midY); ctx.lineTo(W-PR,midY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle="#374151"; ctx.font="8px monospace"; ctx.textAlign="left";
    ctx.fillText("50%", PL+3, midY-2);

    // BSL zones (red dashed above — stop hunts above highs)
    const bslZones=(liq?.buySide||[]).slice(0,4)
      .filter(z=>{ const y=toY(z.price); return y>=PT&&y<=PT+cH; })
      .sort((a,b)=>b.price-a.price);
    const labelYsBSL=[];
    bslZones.forEach(z=>{
      const rawY=toY(z.price);
      let ly=rawY;
      for(const py of labelYsBSL){ if(Math.abs(ly-py)<15) ly=py+15; }
      labelYsBSL.push(ly); z.labelY=Math.max(PT+6,Math.min(PT+cH-4,ly));

      ctx.strokeStyle="rgba(239,68,68,0.65)"; ctx.lineWidth=1.5; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.moveTo(PL+2,rawY); ctx.lineTo(W-PR-4,rawY); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle="#ef4444"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(W-PR-4,rawY); ctx.lineTo(W-PR+2,rawY); ctx.stroke();
      ctx.fillStyle="rgba(239,68,68,0.12)";
      ctx.fillRect(W-PR+4,z.labelY-7,70,14);
      ctx.fillStyle="#ef4444"; ctx.font="bold 8px monospace"; ctx.textAlign="left";
      ctx.fillText(`BSL ${fp(z.price)}`, W-PR+8, z.labelY+4);
      if(Math.abs(z.labelY-rawY)>5){
        ctx.strokeStyle="#ef444433"; ctx.lineWidth=1; ctx.setLineDash([2,2]);
        ctx.beginPath(); ctx.moveTo(W-PR+2,rawY); ctx.lineTo(W-PR+2,z.labelY); ctx.stroke(); ctx.setLineDash([]);
      }
    });

    // SSL zones (green dashed below — stop hunts below lows)
    const sslZones=(liq?.sellSide||[]).slice(0,4)
      .filter(z=>{ const y=toY(z.price); return y>=PT&&y<=PT+cH; })
      .sort((a,b)=>a.price-b.price);
    const labelYsSSL=[];
    sslZones.forEach(z=>{
      const rawY=toY(z.price);
      let ly=rawY;
      for(const py of labelYsSSL){ if(Math.abs(ly-py)<15) ly=py-15; }
      labelYsSSL.push(ly); z.labelY=Math.max(PT+6,Math.min(PT+cH-4,ly));

      ctx.strokeStyle="rgba(34,197,94,0.65)"; ctx.lineWidth=1.5; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.moveTo(PL+2,rawY); ctx.lineTo(W-PR-4,rawY); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle="#22c55e"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(W-PR-4,rawY); ctx.lineTo(W-PR+2,rawY); ctx.stroke();
      ctx.fillStyle="rgba(34,197,94,0.12)";
      ctx.fillRect(W-PR+4,z.labelY-7,70,14);
      ctx.fillStyle="#22c55e"; ctx.font="bold 8px monospace"; ctx.textAlign="left";
      ctx.fillText(`SSL ${fp(z.price)}`, W-PR+8, z.labelY+4);
      if(Math.abs(z.labelY-rawY)>5){
        ctx.strokeStyle="#22c55e33"; ctx.lineWidth=1; ctx.setLineDash([2,2]);
        ctx.beginPath(); ctx.moveTo(W-PR+2,rawY); ctx.lineTo(W-PR+2,z.labelY); ctx.stroke(); ctx.setLineDash([]);
      }
    });

    // Sweep marker
    if(stopHunt){
      const sweepIdx=Math.max(1,display.length-6);
      const swX=toX(sweepIdx), swY=toY(display[sweepIdx]?.low||lastPrice*0.998);
      ctx.strokeStyle="rgba(245,158,11,0.9)"; ctx.lineWidth=2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(swX,swY-18); ctx.lineTo(swX,swY+3); ctx.stroke();
      ctx.fillStyle="#f59e0b";
      ctx.beginPath(); ctx.moveTo(swX,swY+3); ctx.lineTo(swX-6,swY-9); ctx.lineTo(swX+6,swY-9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle="rgba(245,158,11,0.15)";
      ctx.fillRect(swX-54,swY-11,46,14);
      ctx.fillStyle="#f59e0b"; ctx.font="bold 8px monospace"; ctx.textAlign="right";
      ctx.fillText("⚡ SWEEP", swX-10, swY+1);
    }

    // IFVG zone (amber) — if stopHunt, place near sweep
    if(stopHunt&&atr>0){
      const ifvgY=toY(lastPrice);
      const ifvgH=Math.max(8,(atr/lastPrice)*cH*0.5);
      ctx.fillStyle="rgba(245,158,11,0.10)";
      ctx.fillRect(PL,ifvgY-ifvgH/2,cW*0.5,ifvgH);
      ctx.strokeStyle="rgba(245,158,11,0.4)"; ctx.lineWidth=1; ctx.setLineDash([]);
      ctx.strokeRect(PL,ifvgY-ifvgH/2,cW*0.5,ifvgH);
      ctx.fillStyle="#f59e0b"; ctx.font="bold 8px monospace"; ctx.textAlign="left";
      ctx.fillText("IFVG / Breaker", PL+5, ifvgY+3);
    }

    // Trade plan
    if(plan?.entry&&plan?.stopLoss&&plan?.takeProfit){
      const ep=toY(plan.entry), slY2=toY(plan.stopLoss), tpY=toY(plan.takeProfit);
      ctx.fillStyle="rgba(239,68,68,0.06)";
      ctx.fillRect(PL,Math.min(ep,slY2),cW,Math.abs(ep-slY2));
      ctx.fillStyle="rgba(34,197,94,0.06)";
      ctx.fillRect(PL,Math.min(ep,tpY),cW,Math.abs(ep-tpY));
      [[ep,"#d1d5db","ENTRY",plan.entry],[slY2,"#ef4444","SL",plan.stopLoss],[tpY,"#22c55e","TP",plan.takeProfit]]
        .forEach(([y,col,lbl,val])=>{
          ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.setLineDash(lbl==="ENTRY"?[]:[ 5,3]);
          ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle=col+"18"; ctx.fillRect(W-PR+4,y-8,70,16);
          ctx.fillStyle=col; ctx.font="bold 8px monospace"; ctx.textAlign="left";
          ctx.fillText(`${lbl} ${fp(val)}`, W-PR+8, y+4);
        });
    }

    // Candlesticks
    const cw=Math.max(2,(cW/display.length)*0.72);
    display.forEach((c,i)=>{
      const x=toX(i), bull=c.close>=c.open;
      ctx.strokeStyle=bull?"#26a69a":"#ef5350"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x,toY(c.high)); ctx.lineTo(x,toY(c.low)); ctx.stroke();
      const bt=toY(Math.max(c.open,c.close)), bh=Math.max(1,toY(Math.min(c.open,c.close))-bt);
      ctx.fillStyle=bull?P.bull:P.bear;
      ctx.fillRect(x-cw/2,bt,cw,bh);
    });

    // Current price tag
    const last=display[display.length-1];
    if(last){
      const y=toY(last.close);
      ctx.setLineDash([3,3]); ctx.strokeStyle="rgba(255,255,255,0.15)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle="#1f2937"; ctx.fillRect(W-PR+2,y-8,72,16);
      ctx.fillStyle="#f9fafb"; ctx.font="bold 9px monospace"; ctx.textAlign="left";
      ctx.fillText(fp(last.close), W-PR+6, y+4);
    }

    // Legend top-right corner (inside chart)
    const legX=PL+cW-120, legY=PT+4;
    [
      {col:"#ef4444",lbl:"BSL (stops above highs)"},
      {col:"#22c55e",lbl:"SSL (stops below lows)"},
      {col:"#f59e0b",lbl:"⚡ Sweep / IFVG"},
    ].forEach(({col,lbl},i)=>{
      ctx.fillStyle=col; ctx.font="bold 8px monospace"; ctx.textAlign="left";
      ctx.fillText(`— ${lbl}`, legX, legY+i*12);
    });

  },[candles,sig]);

  useEffect(()=>{ draw(); },[draw]);

  const handleMouseMove=useCallback((e)=>{
    const p=dpRef.current; if(!p||!candles.length) return;
    const rect=ref.current.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(ref.current.width/rect.width);
    const my=(e.clientY-rect.top)*(ref.current.height/rect.height);
    if(mx<p.PL||mx>p.W-p.PR||my<p.PT||my>p.PT+p.cH){setHover(null);return;}
    const idx=Math.round((mx-p.PL)/p.cW*(p.display.length-1));
    if(idx>=0&&idx<p.display.length){
      const c=p.display[idx];
      setHover({x:e.clientX,y:e.clientY,col:c.close>=c.open?"#26a69a":"#ef5350",
        lines:[new Date(c.time).toLocaleTimeString(),
          `O:${fp(c.open)}  H:${fp(c.high)}`,`L:${fp(c.low)}  C:${fp(c.close)}`,
          `Vol:${(c.volume/1000).toFixed(1)}K`]});
    }
  },[candles]);

  return (
    <div style={{ position:"relative" }}>
      <canvas ref={ref} width={740} height={280}
        style={{ width:"100%",height:280,display:"block",borderRadius:8,background:P.bg,cursor:"crosshair" }}
        onMouseMove={handleMouseMove} onMouseLeave={()=>setHover(null)}
      />
      {hover&&(
        <div style={{
          position:"fixed",left:hover.x+14,top:hover.y-6,
          background:"#0f172a",border:`1px solid ${hover.col}44`,borderLeft:`3px solid ${hover.col}`,
          borderRadius:7,padding:"7px 12px",zIndex:9999,pointerEvents:"none",
          minWidth:160,boxShadow:"0 8px 32px rgba(0,0,0,0.7)",
        }}>
          {hover.lines.map((l,i)=>(
            <div key={i} style={{fontSize:11,fontFamily:"monospace",lineHeight:1.7,
              color:i===0?hover.col:"#9ca3af",fontWeight:i===0?700:400}}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MACRO CLOCK
// ─────────────────────────────────────────────────────────────────────────────
function MacroClock({ decimal }) {
  const macros=[
    {label:"AM Macro 1",start:9.83, end:10.17,desc:"9:50–10:10 UTC+2",
     why:"London open volatility. Smart money places orders at Asia session highs/lows before NY opens."},
    {label:"AM Macro 2",start:10.83,end:11.17,desc:"10:50–11:10 UTC+2",
     why:"Mid-morning rebalance. Institutions reposition after the first hour's price discovery."},
    {label:"PM Macro 1",start:15.33,end:15.67,desc:"15:20–15:40 UTC+2",
     why:"Pre-NY overlap. Price often raids liquidity before the NY/London overlap power hour begins."},
    {label:"PM Macro 2",start:16.83,end:17.17,desc:"16:50–17:10 UTC+2",
     why:"NY mid-session. Lunch reversal done, institutions re-enter in the trend direction."},
  ];
  const active=macros.find(m=>decimal>=m.start&&decimal<=m.end);
  const next=macros.find(m=>m.start>decimal);

  return (
    <div style={{ background:active?"rgba(34,197,94,0.07)":P.panel, border:`1px solid ${active?"#22c55e44":P.border}`, borderRadius:10, padding:14, marginBottom:10 }}>
      <div style={{ fontSize:10,fontWeight:700,color:P.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10 }}>
        ⏰ ICT Macro Windows — UTC+2 (Botswana)
        <Tip text="ICT (Inner Circle Trader) identified specific 20-minute windows when institutional algorithms are most active. Trades taken IN these windows have higher probability than those taken outside them.">
          <span style={{ marginLeft:6,cursor:"help",color:P.blue }}>ⓘ</span>
        </Tip>
      </div>
      {macros.map(m=>{
        const isActive=decimal>=m.start&&decimal<=m.end;
        const isPast=decimal>m.end;
        return (
          <Tip key={m.label} text={m.why}>
            <div style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"7px 10px",borderRadius:6,marginBottom:5,cursor:"help",
              background:isActive?"rgba(34,197,94,0.12)":isPast?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.02)",
              border:`1px solid ${isActive?"#22c55e44":"transparent"}`,
            }}>
              <div>
                <div style={{ fontSize:11,fontWeight:700,color:isActive?"#4ade80":isPast?"#334155":"#94a3b8" }}>
                  {isActive?"🟢 ":isPast?"✓ ":"⏺ "}{m.label}
                </div>
                <div style={{ fontSize:9,color:P.muted }}>{m.desc}</div>
              </div>
              {isActive&&<InfoBadge label="ACTIVE NOW" color="#22c55e"/>}
              {!isActive&&!isPast&&m===next&&<InfoBadge label="NEXT" color="#f59e0b"/>}
            </div>
          </Tip>
        );
      })}
      <div style={{ marginTop:8,padding:"7px 10px",borderRadius:6,fontSize:11,
        background:active?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.06)",
        border:`1px solid ${active?"#22c55e33":"#ef444422"}`,
        color:active?P.green:"#ef4444",fontWeight:700,textAlign:"center" }}>
        {active?`🟢 ${active.label} — WINDOW OPEN — highest probability trades now`
          :next?`⏺ Next: ${next.label} at ${next.desc} — wait before entering`
          :"⛔ All macro windows closed for today — avoid trading now"}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BSLStrategy COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function BSLStrategy({ signals }) {
  const { candles:allCandles, loadCandles } = useStore();
  const [sym,       setSym]       = useState("BTCUSDT");
  const [showGuide, setShowGuide] = useState(false);
  const [showGloss, setShowGloss] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(()=>{ loadCandles(sym,"1h"); },[sym]);

  const candles  = allCandles[`${sym}_1h`] || allCandles[`${sym}_1m`] || [];
  const sig      = signals.find(s=>(s.asset||s.symbol)===sym);
  const stopHunt = sig?.context?.stopHunt || sig?.stopHunt;
  const score    = sig?.signal?.score || sig?.score || 0;
  const plan     = sig?.signal?.tradePlan;
  const regime   = sig?.context?.regime?.type || sig?.regime || "CHOP";
  const liq      = sig?.context?.liquidity;
  const of       = sig?.context?.orderflow;

  const now=new Date();
  const utc2H=(now.getUTCHours()+2)%24;
  const utc2M=now.getUTCMinutes();
  const decimal=utc2H+utc2M/60;
  const macroActive=(decimal>=9.83&&decimal<=10.17)||(decimal>=10.83&&decimal<=11.17)||
                    (decimal>=15.33&&decimal<=15.67)||(decimal>=16.83&&decimal<=17.17);
  const sessionOk=decimal>=9&&decimal<22;

  const checklist=[
    {label:"Macro time window active",done:macroActive,
     tip:"BSL model ONLY works during ICT macro windows. Outside = random. See the clock on the right.",
     detail:macroActive?"✓ Macro open — highest probability time":"✗ Outside macro window — wait"},
    {label:"Price at Premium or Discount PD Array",done:score>=60,
     tip:"Buy only in DISCOUNT (below 50% range). Sell only in PREMIUM (above 50%). Mid-range = bad entries.",
     detail:score>=60?"✓ Price at key array level":"✗ Price mid-range — not at a key zone"},
    {label:"Stop Hunt / Liquidity Sweep confirmed",done:!!stopHunt,
     tip:"Price must sweep above a BSL (for shorts) or below an SSL (for longs) then REVERSE. The ⚡ marker on chart shows this.",
     detail:stopHunt?`✓ ${stopHunt.type?.replace(/_/g," ")} sweep — ${stopHunt.signal?.replace(/_/g," ")}`:"✗ No sweep yet — watch BSL/SSL zones"},
    {label:"IFVG or Breaker Block at entry",done:!!stopHunt||score>=75,
     tip:"1st entry: price fills old FVG from other side (IFVG). 2nd entry: price retests broken level (Breaker). Shown as amber zone on chart.",
     detail:(stopHunt||score>=75)?"✓ Entry zone present":"✗ No IFVG/Breaker identified"},
    {label:"1:2 Risk:Reward achievable",done:(plan?.riskReward||0)>=2,
     tip:"BSL requires minimum 1:2. If TP is not 2× your risk away, skip. Never compromise on this.",
     detail:plan?`R:R ${plan.riskReward?.toFixed(2)||"—"}:1 ${(plan?.riskReward||0)>=2?"✓":"✗ need 2:1 min"}`:"Awaiting signal"},
  ];

  const allMet=checklist.every(c=>c.done);
  const partialMet=checklist.filter(c=>c.done).length>=3;
  const score5=checklist.filter(c=>c.done).length;

  const modalSignal={
    asset:sym,direction:of?.bias==="BUYERS_IN_CONTROL"?"LONG":"SHORT",
    score,regime,entry:plan?.entry,sl:plan?.stopLoss,tp:plan?.takeProfit,
    stopHunt,signal:sig?.signal,context:sig?.context,
  };

  return (
    <div style={{ color:P.bright }}>

      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10 }}>
        <div>
          <h2 style={{ fontSize:17,fontWeight:800,margin:0 }}>🏆 BSL — One Setup For Life</h2>
          <p style={{ fontSize:11,color:P.sub,margin:"4px 0 0" }}>
            Macro timing + Premium/Discount + Stop Hunt + IFVG/Breaker = minimum 1:2 RR
          </p>
        </div>
        <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
          <button onClick={()=>setShowGuide(v=>!v)} style={{
            padding:"4px 10px",borderRadius:5,border:`1px solid ${showGuide?P.amber:P.border}`,
            background:showGuide?"rgba(245,158,11,0.1)":P.panel,
            color:showGuide?P.amber:P.text,fontSize:11,fontWeight:700,cursor:"pointer",
          }}>🤔 When to enter?</button>
          <button onClick={()=>setShowGloss(v=>!v)} style={{
            padding:"4px 10px",borderRadius:5,border:`1px solid ${showGloss?P.blue:P.border}`,
            background:showGloss?"rgba(96,165,250,0.1)":P.panel,
            color:showGloss?P.blue:P.text,fontSize:11,fontWeight:700,cursor:"pointer",
          }}>📖 Symbol Guide</button>
          <div style={{ display:"flex",gap:4 }}>
            {SYMS.map(s=>(
              <button key={s} onClick={()=>setSym(s)} style={{
                padding:"4px 10px",borderRadius:5,border:"none",fontWeight:700,fontSize:11,cursor:"pointer",
                background:sym===s?"#22c55e":"#1e293b",color:sym===s?"#000":"#475569",transition:"all 0.2s",
              }}>{s.replace("USDT","")}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable panels */}
      {showGuide&&<EntryGuide/>}
      {showGloss&&<div style={{ marginBottom:12 }}><GlossaryPanel/></div>}

      {/* Score bar */}
      <div style={{
        padding:"10px 14px",borderRadius:8,marginBottom:14,
        background:allMet?"rgba(34,197,94,0.08)":partialMet?"rgba(245,158,11,0.06)":"rgba(239,68,68,0.04)",
        border:`1px solid ${allMet?"#22c55e44":partialMet?"#f59e0b33":"#ef444422"}`,
        display:"flex",alignItems:"center",gap:12,
      }}>
        <div style={{ fontSize:22 }}>{allMet?"🎯":macroActive?"⏳":"🚫"}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12,fontWeight:700,
            color:allMet?P.green:partialMet?P.amber:P.red }}>
            {allMet?"ALL 5 CONDITIONS MET — BSL SETUP READY TO EXECUTE"
              :macroActive?`Macro active — ${5-score5} condition${5-score5>1?"s":""} remaining`
              :"Outside macro window — no BSL trades now"}
          </div>
          {/* 5-dot progress */}
          <div style={{ display:"flex",gap:5,marginTop:6 }}>
            {checklist.map((c,i)=>(
              <div key={i} style={{
                width:20,height:4,borderRadius:2,
                background:c.done?P.green:"#1e293b",transition:"all 0.3s",
              }}/>
            ))}
            <span style={{ fontSize:10,color:P.muted,marginLeft:4 }}>{score5}/5</span>
          </div>
        </div>
        {(allMet||partialMet)&&sessionOk&&(
          <button onClick={()=>setShowModal(true)} style={{
            padding:"10px 18px",borderRadius:8,border:"none",cursor:"pointer",
            fontWeight:800,fontSize:12,
            background:allMet?"linear-gradient(135deg,#15803d,#22c55e)":"linear-gradient(135deg,#92400e,#d97706)",
            color:"#fff",boxShadow:allMet?"0 4px 20px rgba(34,197,94,0.4)":"none",flexShrink:0,
          }}>
            {allMet?"🔥 Execute BSL Trade":"⚠️ Manual Entry"}
          </button>
        )}
      </div>

      {/* Chart + right panel */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 340px",gap:12,marginBottom:12 }}>

        {/* Chart */}
        <div style={{ background:P.bg,borderRadius:10,border:`1px solid ${P.border}`,overflow:"hidden" }}>
          {candles.length===0?(
            <div style={{ height:280,display:"flex",alignItems:"center",justifyContent:"center",color:P.muted,fontSize:12 }}>
              <div style={{ textAlign:"center" }}><div style={{ fontSize:28,marginBottom:8 }}>📊</div>Loading {sym} candles...</div>
            </div>
          ):(
            <BSLChart candles={candles} sig={sig}/>
          )}
          {/* Chart legend */}
          <div style={{ padding:"8px 12px",borderTop:`1px solid ${P.border}`,display:"flex",gap:12,flexWrap:"wrap" }}>
            {[
              {col:"#ef4444",lbl:"BSL — buy-side stops above swing highs"},
              {col:"#22c55e",lbl:"SSL — sell-side stops below swing lows"},
              {col:"#f59e0b",lbl:"⚡ Sweep / IFVG entry zone"},
              {col:"rgba(239,68,68,0.3)",lbl:"Premium zone"},
              {col:"rgba(34,197,94,0.3)",lbl:"Discount zone"},
            ].map(x=>(
              <div key={x.lbl} style={{ display:"flex",alignItems:"center",gap:5 }}>
                <div style={{ width:16,height:2,background:x.col,borderRadius:1 }}/>
                <span style={{ fontSize:9,color:P.muted }}>{x.lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: macro clock + checklist */}
        <div>
          <MacroClock decimal={decimal}/>

          <div style={{ background:P.panel,borderRadius:10,padding:14,border:`1px solid ${P.border}` }}>
            <div style={{ fontSize:10,fontWeight:700,color:P.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10 }}>
              BSL Checklist — {sym.replace("USDT","")}
            </div>
            {checklist.map((c,i)=><CheckRow key={i} done={c.done} label={c.label} tip={c.tip} detail={c.detail}/>)}

            {/* Entry model */}
            <div style={{ marginTop:12,padding:"10px 12px",background:P.bg,borderRadius:7,border:`1px solid ${P.border}` }}>
              <div style={{ fontSize:10,fontWeight:700,color:P.muted,textTransform:"uppercase",marginBottom:8 }}>
                Entry Order
              </div>
              {[
                {n:"1st",method:"IFVG",col:"#22c55e",
                 tip:"Candle closes beyond old FVG → enter on 2nd candle open. Fastest entry, slightly higher risk."},
                {n:"2nd",method:"Breaker Block",col:"#60a5fa",
                 tip:"Price retests broken structure level from the other side. More conservative. Wait for confirmation candle."},
              ].map(e=>(
                <Tip key={e.n} text={e.tip}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 8px",
                    borderRadius:5,marginBottom:5,cursor:"help",
                    background:`${e.col}10`,border:`1px solid ${e.col}22` }}>
                    <span style={{ fontSize:10,color:P.muted,width:24 }}>{e.n}:</span>
                    <span style={{ fontSize:11,fontWeight:700,color:e.col }}>{e.method}</span>
                    <span style={{ fontSize:9,color:P.muted,marginLeft:"auto" }}>hover for detail</span>
                  </div>
                </Tip>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Context strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8 }}>
        {[
          {l:"Score",    v:score,c:score>=85?P.green:score>=70?P.amber:P.red},
          {l:"Regime",   v:regime.replace(/_/g," "),c:["TRENDING_UP","TRENDING_DOWN"].includes(regime)?P.green:P.amber},
          {l:"Macro",    v:macroActive?"OPEN":"CLOSED",c:macroActive?P.green:P.red},
          {l:"Stop Hunt",v:stopHunt?"DETECTED":"—",c:stopHunt?P.green:P.muted},
          {l:"Flow",     v:of?.bias?.replace(/_IN_CONTROL/,"")?.replace(/_/," ")||"NEUTRAL",c:of?.bias&&of.bias!=="NEUTRAL"?P.blue:P.muted},
          {l:"R:R",      v:plan?.riskReward?`${plan.riskReward.toFixed(2)}:1`:"—",c:(plan?.riskReward||0)>=2?P.green:(plan?.riskReward||0)>=1.5?P.amber:P.red},
        ].map(x=>(
          <div key={x.l} style={{ background:P.panel,borderRadius:7,padding:"8px 10px",border:`1px solid ${P.border}` }}>
            <div style={{ fontSize:9,color:P.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3 }}>{x.l}</div>
            <div style={{ fontSize:11,fontWeight:700,color:x.c }}>{x.v}</div>
          </div>
        ))}
      </div>

      {showModal&&(
        <TradeEntryModal
          signal={allMet?modalSignal:null}
          onClose={()=>setShowModal(false)}
          onSaved={()=>setShowModal(false)}
        />
      )}
    </div>
  );
}