import React, { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import TradeEntryModal from "../trade/TradeEntryModal";

const P = {
  bg:"#0b0e14", panel:"#0f172a", border:"#1e293b", dim:"#334155",
  muted:"#475569", sub:"#64748b", text:"#94a3b8", bright:"#e2e8f0",
  green:"#22c55e", red:"#ef4444", amber:"#f59e0b", blue:"#60a5fa",
  bull:"rgba(38,166,154,0.85)", bear:"rgba(239,83,80,0.85)",
};
const STEP_COLORS = ["#60a5fa","#f59e0b","#a78bfa","#22c55e"];
const SYMS = ["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"];

function Tip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position:"relative", display:"inline-block" }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show && (
        <div style={{
          position:"absolute", bottom:"120%", left:"50%", transform:"translateX(-50%)",
          background:"#0f172a", border:"1px solid #334155", borderRadius:7,
          padding:"8px 12px", fontSize:11, color:"#cbd5e1", lineHeight:1.6,
          zIndex:9999, width:240, boxShadow:"0 8px 32px rgba(0,0,0,0.6)", pointerEvents:"none",
        }}>{text}</div>
      )}
    </span>
  );
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
        color:done?"#fff":"#475569", transition:"all 0.3s",
      }}>{done?"✓":"○"}</div>
      <div style={{ flex:1, minWidth:0 }}>
        {tip ? (
          <Tip text={tip}>
            <span style={{ fontSize:12, fontWeight:done?400:600,
              color:done?P.sub:P.bright, cursor:"help", borderBottom:"1px dashed #334155" }}>
              {label}
            </span>
          </Tip>
        ) : (
          <span style={{ fontSize:12, fontWeight:done?400:600, color:done?P.sub:P.bright }}>{label}</span>
        )}
        {detail && <div style={{ fontSize:10, color:done?P.green:P.muted, marginTop:2, lineHeight:1.4 }}>{detail}</div>}
      </div>
    </div>
  );
}

function fp(p) {
  if (!p && p!==0) return "—";
  return p > 100
    ? p.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})
    : p.toFixed(4);
}

// ── Canvas Chart ──────────────────────────────────────────────────────────────
function StepChart({ step, candles, sig }) {
  const ref   = useRef(null);
  const dpRef = useRef(null);
  const [hover, setHover] = useState(null);

  const regime   = sig?.context?.regime?.type || sig?.regime || "CHOP";
  const liq      = sig?.context?.liquidity;
  const stopHunt = sig?.context?.stopHunt || sig?.stopHunt;
  const atr      = sig?.context?.volatility?.atr || 0;
  const plan     = sig?.signal?.tradePlan;
  const of       = sig?.context?.orderflow;

  const draw = useCallback(() => {
    const cvs = ref.current; if (!cvs || !candles.length) return;
    const ctx = cvs.getContext("2d");
    const W=cvs.width, H=cvs.height;
    ctx.clearRect(0,0,W,H);

    const display = candles.slice(-55);
    const PL=64, PR=80, PT=24, PB=30;
    const cW=W-PL-PR, cH=H-PT-PB;

    // ── Build price range ──────────────────────────────────────────────────
    const prices = display.flatMap(c=>[c.high,c.low]);
    if (step===0) {
      (liq?.buySide||[]).slice(0,5).forEach(z=>prices.push(z.price));
      (liq?.sellSide||[]).slice(0,5).forEach(z=>prices.push(z.price));
    }
    if (step===1) {
      (liq?.buySide||[]).slice(0,3).forEach(z=>prices.push(z.price));
      (liq?.sellSide||[]).slice(0,3).forEach(z=>prices.push(z.price));
    }
    if (step===3 && plan) {
      prices.push(plan.entry, plan.stopLoss, plan.takeProfit);
    }
    const raw_min=Math.min(...prices), raw_max=Math.max(...prices);
    const pad=(raw_max-raw_min)*0.07;
    const minP=raw_min-pad, maxP=raw_max+pad, rng=maxP-minP||1;

    const toX = i => PL+(i/(display.length-1||1))*cW;
    const toY = p => PT+(1-(p-minP)/rng)*cH;

    dpRef.current={PL,PR,PT,PB,cW,cH,W,H,minP,maxP,rng,toX,toY,display};

    // ── Background ───────────────────────────────────────────────────────
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,W,H);

    // ── Grid ─────────────────────────────────────────────────────────────
    for (let i=0;i<=7;i++) {
      const y=PT+(i/7)*cH;
      ctx.strokeStyle="#131b28"; ctx.lineWidth=1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke();
      const price=maxP-(i/7)*rng;
      ctx.fillStyle="#374151"; ctx.font="9px monospace"; ctx.textAlign="right";
      ctx.fillText(fp(price), PL-4, y+3);
    }
    const vStep=Math.ceil(display.length/7);
    display.forEach((_,i)=>{
      if(i%vStep!==0) return;
      ctx.strokeStyle="#0e1520"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(toX(i),PT); ctx.lineTo(toX(i),PT+cH); ctx.stroke();
    });

    // ════════════════════════════════════════════════════════════════════
    // STEP 1 — HTF Bias: Premium/Discount + Spaced liquidity zones
    // ════════════════════════════════════════════════════════════════════
    if (step===0) {
      const mid=(maxP+minP)/2, midY=toY(mid);

      // Subtle background tint
      ctx.fillStyle="rgba(239,68,68,0.04)";
      ctx.fillRect(PL,PT,cW,midY-PT);
      ctx.fillStyle="rgba(34,197,94,0.04)";
      ctx.fillRect(PL,midY,cW,(PT+cH)-midY);

      // Corner labels only
      ctx.font="bold 9px monospace";
      ctx.fillStyle="rgba(239,68,68,0.45)"; ctx.textAlign="left";
      ctx.fillText("▲ PREMIUM ZONE (sell)", PL+6, PT+14);
      ctx.fillStyle="rgba(34,197,94,0.45)";
      ctx.fillText("▼ DISCOUNT ZONE (buy)", PL+6, PT+cH-6);

      // 50% midline
      ctx.setLineDash([5,5]); ctx.strokeStyle="rgba(255,255,255,0.12)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(PL,midY); ctx.lineTo(W-PR,midY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle="#374151"; ctx.font="9px monospace"; ctx.textAlign="left";
      ctx.fillText("50% equilibrium", PL+4, midY-3);

      // Collect all visible zones
      const allZones = [];
      (liq?.buySide||[]).slice(0,5).forEach(z=>{
        const y=toY(z.price);
        if(y>=PT+2&&y<=PT+cH-2) allZones.push({price:z.price,type:"BSL",y,strength:z.strength||1});
      });
      (liq?.sellSide||[]).slice(0,5).forEach(z=>{
        const y=toY(z.price);
        if(y>=PT+2&&y<=PT+cH-2) allZones.push({price:z.price,type:"SSL",y,strength:z.strength||1});
      });

      // Sort top to bottom, spread labels with minimum gap
      allZones.sort((a,b)=>a.y-b.y);
      const MIN_GAP=15;
      const labelYs=[];
      allZones.forEach(z=>{
        let ly=z.y;
        for (const py of labelYs) {
          if(Math.abs(ly-py)<MIN_GAP) ly=py+MIN_GAP;
        }
        labelYs.push(ly);
        z.labelY=Math.max(PT+8,Math.min(PT+cH-4,ly));
      });

      allZones.forEach(z=>{
        const isBSL=z.type==="BSL";
        const col=isBSL?"#ef4444":"#22c55e";
        const alpha=Math.min(0.85,0.35+(z.strength||1)*0.04);

        // Zone line — ends before the label area
        ctx.strokeStyle=`rgba(${isBSL?"239,68,68":"34,197,94"},${alpha})`;
        ctx.lineWidth=1.5; ctx.setLineDash([6,3]);
        ctx.beginPath(); ctx.moveTo(PL+2,z.y); ctx.lineTo(W-PR-4,z.y); ctx.stroke();
        ctx.setLineDash([]);

        // Tick on right edge
        ctx.strokeStyle=col; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(W-PR-4,z.y); ctx.lineTo(W-PR+2,z.y); ctx.stroke();

        // Label pill — in the right margin, at spread position
        const tag=`${z.type} ${fp(z.price)}`;
        ctx.fillStyle=isBSL?"rgba(239,68,68,0.12)":"rgba(34,197,94,0.12)";
        ctx.fillRect(W-PR+4,z.labelY-7,72,14);
        ctx.fillStyle=col; ctx.font="bold 8px monospace"; ctx.textAlign="left";
        ctx.fillText(tag, W-PR+8, z.labelY+4);

        // Connector if label moved from line
        if(Math.abs(z.labelY-z.y)>5) {
          ctx.strokeStyle=`${col}44`; ctx.lineWidth=1; ctx.setLineDash([2,2]);
          ctx.beginPath(); ctx.moveTo(W-PR+2,z.y); ctx.lineTo(W-PR+2,z.labelY); ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Trend badge — top right of chart area (inside chart, not on axis)
      const bullish=regime==="TRENDING_UP";
      const trendCol=bullish?P.green:regime==="TRENDING_DOWN"?P.red:P.amber;
      const trendTxt=bullish?"↗ UPTREND":regime==="TRENDING_DOWN"?"↘ DOWNTREND":"↔ CHOP";
      const bw=78;
      ctx.fillStyle=`${trendCol}18`; ctx.fillRect(PL+cW-bw-2,PT+2,bw,18);
      ctx.strokeStyle=`${trendCol}44`; ctx.lineWidth=1; ctx.setLineDash([]);
      ctx.strokeRect(PL+cW-bw-2,PT+2,bw,18);
      ctx.fillStyle=trendCol; ctx.font="bold 9px monospace"; ctx.textAlign="center";
      ctx.fillText(trendTxt, PL+cW-bw/2-2, PT+14);
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 2 — POI: Clean OB/FVG zones, no clutter
    // ════════════════════════════════════════════════════════════════════
    if (step===1) {
      const lastPrice=display[display.length-1]?.close||0;
      const atrBand=atr>0?(atr/lastPrice)*cH*0.9:8;

      // Separate zones above and below price — draw at most 2 each
      const above=(liq?.buySide||[])
        .filter(z=>z.price>lastPrice)
        .sort((a,b)=>a.price-b.price).slice(0,2);
      const below=(liq?.sellSide||[])
        .filter(z=>z.price<lastPrice)
        .sort((a,b)=>b.price-a.price).slice(0,2);

      const drawOB=(z,isAbove)=>{
        const midY=toY(z.price);
        const h=Math.max(10,atrBand*0.7);
        const top=midY-h/2, bot=midY+h/2;
        if(top<PT||bot>PT+cH) return;

        // Fill
        ctx.fillStyle=isAbove?"rgba(239,68,68,0.10)":"rgba(34,197,94,0.10)";
        ctx.fillRect(PL,top,cW,h);
        // Top/bottom border lines only (no full rect border = less visual noise)
        ctx.strokeStyle=isAbove?"rgba(239,68,68,0.55)":"rgba(34,197,94,0.55)";
        ctx.lineWidth=1; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(PL,top); ctx.lineTo(W-PR-2,top); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(PL,bot); ctx.lineTo(W-PR-2,bot); ctx.stroke();
        // Left accent bar
        ctx.fillStyle=isAbove?"rgba(239,68,68,0.5)":"rgba(34,197,94,0.5)";
        ctx.fillRect(PL,top,3,h);
        // Inside label — left side, doesn't overlap price
        const col=isAbove?"#ef4444":"#22c55e";
        ctx.fillStyle=col; ctx.font="bold 9px monospace"; ctx.textAlign="left";
        ctx.fillText(isAbove?"OB/FVG ▲":"OB/FVG ▼", PL+7, midY+3);
        // Price label — right margin
        ctx.textAlign="right";
        ctx.fillText(fp(z.price), W-PR-4, midY+3);
      };

      above.forEach(z=>drawOB(z,true));
      below.forEach(z=>drawOB(z,false));

      // POI arrow: points from current price toward nearest zone
      const allOBZones=[...above,...below];
      if(allOBZones.length>0) {
        const nearest=allOBZones.sort((a,b)=>Math.abs(a.price-lastPrice)-Math.abs(b.price-lastPrice))[0];
        const curY=toY(lastPrice), nY=toY(nearest.price);
        const arrowX=PL+cW*0.88;
        const upward=nY<curY;

        // Dashed line
        ctx.strokeStyle="rgba(96,165,250,0.7)"; ctx.lineWidth=2; ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.moveTo(arrowX,curY); ctx.lineTo(arrowX,nY+(upward?10:-10)); ctx.stroke();
        ctx.setLineDash([]);
        // Arrowhead
        ctx.fillStyle="#60a5fa";
        ctx.beginPath();
        if(upward){ ctx.moveTo(arrowX,nY);ctx.lineTo(arrowX-5,nY+10);ctx.lineTo(arrowX+5,nY+10); }
        else      { ctx.moveTo(arrowX,nY);ctx.lineTo(arrowX-5,nY-10);ctx.lineTo(arrowX+5,nY-10); }
        ctx.closePath(); ctx.fill();
        // POI label beside midpoint
        ctx.fillStyle="#60a5fa"; ctx.font="bold 8px monospace"; ctx.textAlign="right";
        ctx.fillText("POI", arrowX-5, (curY+nY)/2+3);
      }

      // Current price — solid thin line + tag (left axis tag)
      const cpY=toY(lastPrice);
      ctx.setLineDash([3,3]); ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(PL,cpY); ctx.lineTo(W-PR,cpY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle="#1f2937"; ctx.fillRect(W-PR+2,cpY-8,72,16);
      ctx.fillStyle="#f9fafb"; ctx.font="bold 9px monospace"; ctx.textAlign="left";
      ctx.fillText(fp(lastPrice), W-PR+6, cpY+4);
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 3 — Confirmation: Sweep marker + CHoCH — no overlapping
    // ════════════════════════════════════════════════════════════════════
    if (step===2) {
      const lastIdx=display.length-1;
      const lastPrice=display[lastIdx]?.close||0;

      // Order flow bar — fixed position top-left, contained
      const biasBull=of?.bias==="BUYERS_IN_CONTROL";
      const biasBear=of?.bias==="SELLERS_IN_CONTROL";
      const barW=Math.min(140,cW*0.3), barH=8;
      const barX=PL+6, barY=PT+5;
      ctx.fillStyle="#1e293b"; ctx.fillRect(barX,barY,barW,barH);
      const fill=biasBull?barW*0.82:biasBear?barW*0.82:barW*0.5;
      ctx.fillStyle=biasBull?P.green:biasBear?P.red:"#475569";
      ctx.fillRect(barX,barY,fill,barH);
      ctx.strokeStyle="#334155"; ctx.lineWidth=1;
      ctx.strokeRect(barX,barY,barW,barH);
      ctx.fillStyle="#94a3b8"; ctx.font="8px monospace"; ctx.textAlign="left";
      ctx.fillText(`Flow: ${of?.bias?.replace("_IN_CONTROL","")||"NEUTRAL"}`, barX+barW+5, barY+7);

      if(stopHunt) {
        // Place the sweep event 4–6 candles before the end
        const sweepIdx=Math.max(1,lastIdx-5);
        const sweepLow=display[sweepIdx]?.low||lastPrice*0.998;
        const shX=toX(sweepIdx);
        const shY=toY(sweepLow);
        const revY=toY(lastPrice);

        // ① Horizontal sweep zone band (thin, only at the sweep candle x range)
        const sweepBandH=Math.max(5,atr>0?(atr/lastPrice)*cH*0.35:5);
        ctx.fillStyle="rgba(245,158,11,0.08)";
        ctx.fillRect(PL,shY-sweepBandH/2,cW,sweepBandH);

        // ② Vertical spike line at sweep candle (looks like a wick extension)
        ctx.strokeStyle="rgba(245,158,11,0.9)"; ctx.lineWidth=2.5; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(shX,shY-20); ctx.lineTo(shX,shY+4); ctx.stroke();

        // ③ Down triangle arrowhead below the spike
        ctx.fillStyle="#f59e0b";
        ctx.beginPath(); ctx.moveTo(shX,shY+4); ctx.lineTo(shX-6,shY-8); ctx.lineTo(shX+6,shY-8);
        ctx.closePath(); ctx.fill();

        // ④ SWEEP label — to the LEFT of the marker, in a small pill
        ctx.fillStyle="rgba(245,158,11,0.15)";
        ctx.fillRect(shX-60,shY-10,52,16);
        ctx.fillStyle="#f59e0b"; ctx.font="bold 9px monospace"; ctx.textAlign="right";
        ctx.fillText("⚡ SWEEP", shX-10,shY+3);

        // ⑤ Sweep type below pill
        const typeStr=(stopHunt.type||"BUY SIDE").replace(/_/g," ").toUpperCase();
        ctx.fillStyle="rgba(245,158,11,0.55)"; ctx.font="7px monospace";
        ctx.fillText(typeStr, shX-10, shY+14);

        // ⑥ Curved reversal arc from sweep to current (quadratic bezier)
        const midIdx=Math.round((sweepIdx+lastIdx)/2);
        const cpX=toX(midIdx), cpY2=shY-35;
        ctx.strokeStyle="rgba(34,197,94,0.6)"; ctx.lineWidth=2; ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.moveTo(shX,shY); ctx.quadraticCurveTo(cpX,cpY2,toX(lastIdx),revY);
        ctx.stroke(); ctx.setLineDash([]);

        // ⑦ CHoCH badge — above the current price candle, in a bordered box
        const badgeX=toX(lastIdx)-32, badgeY=revY-28;
        ctx.fillStyle="rgba(34,197,94,0.14)";
        ctx.fillRect(badgeX,badgeY,64,17);
        ctx.strokeStyle="rgba(34,197,94,0.55)"; ctx.lineWidth=1; ctx.setLineDash([]);
        ctx.strokeRect(badgeX,badgeY,64,17);
        ctx.fillStyle="#22c55e"; ctx.font="bold 9px monospace"; ctx.textAlign="center";
        ctx.fillText("CHoCH ✓", toX(lastIdx), badgeY+12);

        // ⑧ MSS dotted arrow from swept low up to current
        ctx.strokeStyle="rgba(34,197,94,0.35)"; ctx.lineWidth=1; ctx.setLineDash([2,2]);
        ctx.beginPath(); ctx.moveTo(shX,shY); ctx.lineTo(shX,revY);
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle="rgba(34,197,94,0.5)"; ctx.font="7px monospace"; ctx.textAlign="left";
        ctx.fillText("MSS", shX+4, (shY+revY)/2);

      } else {
        // No sweep — instructional overlay
        const cy=PT+cH*0.52;
        ctx.fillStyle="#334155"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("⏳ Waiting for liquidity sweep...", W/2, cy);
        ctx.fillStyle="#475569"; ctx.font="9px monospace";
        ctx.fillText("Price must raid a key level then close back above/below", W/2, cy+16);
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 4 — Entry zone (M5 OB/FVG) + SL + TP
    // ════════════════════════════════════════════════════════════════════
    if (step===3) {
      const lastPrice=display[display.length-1]?.close||0;

      if (plan?.entry && plan?.stopLoss && plan?.takeProfit) {
        const ep=toY(plan.entry), slY=toY(plan.stopLoss), tpY=toY(plan.takeProfit);
        const isLong=plan.takeProfit>plan.entry;

        // Shaded risk zone (entry → SL)
        const riskTop=Math.min(ep,slY), riskBot=Math.max(ep,slY);
        ctx.fillStyle="rgba(239,68,68,0.07)";
        ctx.fillRect(PL,riskTop,cW,riskBot-riskTop);

        // Shaded reward zone (entry → TP)
        const rewTop=Math.min(ep,tpY), rewBot=Math.max(ep,tpY);
        ctx.fillStyle="rgba(34,197,94,0.07)";
        ctx.fillRect(PL,rewTop,cW,rewBot-rewTop);

        // M5 Entry Zone — highlighted band at entry (the OB/FVG pullback target)
        const ezH=Math.max(10,atr>0?(atr/lastPrice)*cH*0.55:10);
        const ezTop=ep-ezH/2, ezBot=ep+ezH/2;
        ctx.fillStyle="rgba(34,197,94,0.18)";
        ctx.fillRect(PL,ezTop,cW*0.55,ezBot-ezTop);
        ctx.strokeStyle="rgba(34,197,94,0.7)"; ctx.lineWidth=1.5; ctx.setLineDash([]);
        ctx.strokeRect(PL,ezTop,cW*0.55,ezBot-ezTop);
        ctx.fillStyle="#22c55e"; ctx.font="bold 9px monospace"; ctx.textAlign="left";
        ctx.fillText("M5 Entry Zone", PL+5, ep+3);
        ctx.font="8px monospace"; ctx.fillStyle="rgba(34,197,94,0.6)";
        ctx.fillText("← FVG/OB pullback target", PL+5, ep+14);
        ctx.fillText("Price returns here after displacement", PL+5, ep+24);

        // Entry line (solid white)
        ctx.strokeStyle="rgba(255,255,255,0.6)"; ctx.lineWidth=2; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(PL,ep); ctx.lineTo(W-PR,ep); ctx.stroke();

        // SL line (red dashed)
        ctx.strokeStyle="#ef4444"; ctx.lineWidth=1.5; ctx.setLineDash([5,3]);
        ctx.beginPath(); ctx.moveTo(PL,slY); ctx.lineTo(W-PR,slY); ctx.stroke();
        ctx.setLineDash([]);

        // TP line (green dashed)
        ctx.strokeStyle="#22c55e"; ctx.lineWidth=1.5; ctx.setLineDash([5,3]);
        ctx.beginPath(); ctx.moveTo(PL,tpY); ctx.lineTo(W-PR,tpY); ctx.stroke();
        ctx.setLineDash([]);

        // Right-side labels (inside chart, right margin)
        [
          {y:ep,  col:"#d1d5db", lbl:"ENTRY", val:plan.entry},
          {y:slY, col:"#ef4444", lbl:"SL",    val:plan.stopLoss},
          {y:tpY, col:"#22c55e", lbl:"TP",    val:plan.takeProfit},
        ].forEach(({y,col,lbl,val})=>{
          const tag=`${lbl} ${fp(val)}`;
          ctx.fillStyle=col+"20"; ctx.fillRect(W-PR+4,y-8,72,16);
          ctx.fillStyle=col; ctx.font="bold 9px monospace"; ctx.textAlign="left";
          ctx.fillText(tag, W-PR+8, y+4);
        });

        // R:R badge centred in reward zone
        const rr=plan.riskReward||0;
        const rrMid=(ep+tpY)/2;
        const rrCol=rr>=2?P.green:rr>=1.5?P.amber:P.red;
        ctx.fillStyle=rrCol+"18"; ctx.fillRect(PL+cW*0.62,rrMid-10,68,20);
        ctx.fillStyle=rrCol; ctx.font="bold 10px monospace"; ctx.textAlign="center";
        ctx.fillText(`RR 1:${rr.toFixed(2)}`, PL+cW*0.62+34, rrMid+4);

        // "RISK" label in risk zone
        if(riskBot-riskTop>18) {
          ctx.fillStyle="rgba(239,68,68,0.5)"; ctx.font="8px monospace"; ctx.textAlign="center";
          ctx.fillText("RISK", PL+cW*0.78, (riskTop+riskBot)/2+3);
        }
        // "REWARD" label in reward zone
        if(rewBot-rewTop>18) {
          ctx.fillStyle="rgba(34,197,94,0.5)"; ctx.font="8px monospace";
          ctx.fillText("REWARD", PL+cW*0.78, (rewTop+rewBot)/2+3);
        }

      } else {
        // No plan yet — show instructional overlay with zone diagram
        const zoneTop=PT+cH*0.32, zoneH=cH*0.18;
        ctx.fillStyle="rgba(34,197,94,0.08)";
        ctx.fillRect(PL,zoneTop,cW,zoneH);
        ctx.strokeStyle="rgba(34,197,94,0.35)"; ctx.lineWidth=1; ctx.setLineDash([5,4]);
        ctx.strokeRect(PL,zoneTop,cW,zoneH); ctx.setLineDash([]);
        ctx.fillStyle="#22c55e"; ctx.font="bold 9px monospace"; ctx.textAlign="left";
        ctx.fillText("M5 Entry Zone (FVG or OB)", PL+8, zoneTop+15);
        ctx.fillStyle="#475569"; ctx.font="8px monospace";
        ctx.fillText("Price displaces then pulls back into this zone — that is your entry candle", PL+8, zoneTop+27);
        ctx.fillStyle="#334155"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("Awaiting TRADE signal (score ≥ 85)", W/2, PT+cH*0.65);
        ctx.fillStyle="#475569"; ctx.font="9px monospace";
        ctx.fillText("Entry, SL and TP lines will appear automatically", W/2, PT+cH*0.65+18);
      }
    }

    // ── Candlesticks (always drawn on top of annotations) ────────────────
    const cw=Math.max(2,(cW/display.length)*0.72);
    display.forEach((c,i)=>{
      const x=toX(i), bull=c.close>=c.open;
      ctx.strokeStyle=bull?"#26a69a":"#ef5350"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x,toY(c.high)); ctx.lineTo(x,toY(c.low)); ctx.stroke();
      const bt=toY(Math.max(c.open,c.close)), bh=Math.max(1,toY(Math.min(c.open,c.close))-bt);
      ctx.fillStyle=bull?P.bull:P.bear;
      ctx.fillRect(x-cw/2,bt,cw,bh);
    });

    // Current price line + left-axis tag (steps that need it)
    if (step!==1) {
      const last=display[display.length-1];
      if(last) {
        const y=toY(last.close);
        ctx.setLineDash([3,3]); ctx.strokeStyle="rgba(255,255,255,0.15)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle="#1f2937"; ctx.fillRect(W-PR+2,y-8,72,16);
        ctx.fillStyle="#f9fafb"; ctx.font="bold 9px monospace"; ctx.textAlign="left";
        ctx.fillText(fp(last.close), W-PR+6, y+4);
      }
    }

    // Step label badge top-left
    const sc=STEP_COLORS[step];
    const stepLabels=["4H/1H — HTF Bias","1H — Point of Interest","M15/M5 — Confirmation","M5 — Entry & Execute"];
    ctx.fillStyle=`${sc}15`; ctx.fillRect(PL,PT,142,16);
    ctx.fillStyle=sc; ctx.font="bold 9px monospace"; ctx.textAlign="left";
    ctx.fillText(stepLabels[step], PL+4, PT+11);

  },[candles,step,sig]);

  useEffect(()=>{ draw(); },[draw]);

  const handleMouseMove=useCallback((e)=>{
    const p=dpRef.current; if(!p||!candles.length) return;
    const rect=ref.current.getBoundingClientRect();
    const sx=ref.current.width/rect.width;
    const sy=ref.current.height/rect.height;
    const mx=(e.clientX-rect.left)*sx, my=(e.clientY-rect.top)*sy;
    if(mx<p.PL||mx>p.W-p.PR||my<p.PT||my>p.PT+p.cH){setHover(null);return;}
    const idx=Math.round((mx-p.PL)/p.cW*(p.display.length-1));
    if(idx>=0&&idx<p.display.length){
      const c=p.display[idx];
      setHover({
        x:e.clientX, y:e.clientY, col:c.close>=c.open?"#26a69a":"#ef5350",
        lines:[
          new Date(c.time).toLocaleTimeString(),
          `O: ${fp(c.open)}   H: ${fp(c.high)}`,
          `L: ${fp(c.low)}    C: ${fp(c.close)}`,
          `Vol: ${(c.volume/1000).toFixed(1)}K`,
        ],
      });
    }
  },[candles]);

  return (
    <div style={{ position:"relative" }}>
      <canvas ref={ref} width={740} height={295}
        style={{ width:"100%",height:295,display:"block",borderRadius:8,background:P.bg,cursor:"crosshair" }}
        onMouseMove={handleMouseMove} onMouseLeave={()=>setHover(null)}
      />
      {hover && (
        <div style={{
          position:"fixed", left:hover.x+14, top:hover.y-6,
          background:"#0f172a", border:`1px solid ${hover.col}44`,
          borderLeft:`3px solid ${hover.col}`,
          borderRadius:7, padding:"7px 12px", zIndex:9999, pointerEvents:"none",
          minWidth:160, boxShadow:"0 8px 32px rgba(0,0,0,0.7)",
        }}>
          {hover.lines.map((l,i)=>(
            <div key={i} style={{ fontSize:11, fontFamily:"monospace", lineHeight:1.7,
              color:i===0?hover.col:"#9ca3af", fontWeight:i===0?700:400 }}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MTF GLOSSARY DATA
// ─────────────────────────────────────────────────────────────────────────────
const MTF_GLOSSARY = [
  {
    sym:"BSL", full:"Buy-Side Liquidity", color:"#ef4444", icon:"🎯",
    what:"A cluster of stop-loss orders sitting ABOVE recent swing highs. When traders go short, their stop-loss sits above the last high. Thousands of these orders pile up at the same level, creating a 'liquidity pool' that institutions target.",
    where:"Red dashed lines drawn ABOVE the current price on the chart. The higher the line, the more stops sit above it.",
    signal:"When price spikes ABOVE a BSL level then immediately reverses back down — that spike is the 'hunt'. The reversal is your SHORT entry signal. Do NOT chase the spike up. Wait for the close back below the BSL level.",
    entry:"SHORT: wait for sweep above BSL → reversal candle closes below BSL → enter on the NEXT candle open. SL above the swept high. TP at nearest SSL zone below price.",
    example:"BTC has a swing high at $79,200. BSL line drawn there. Price pokes to $79,350 (grabs stops), then closes back at $79,050. That close below $79,200 is your short entry. SL at $79,400.",
  },
  {
    sym:"SSL", full:"Sell-Side Liquidity", color:"#22c55e", icon:"🎯",
    what:"A cluster of stop-loss orders sitting BELOW recent swing lows. Every long position has a stop below the last low. These form the 'sell-side' pool — institutions sweep below to grab this liquidity and fuel their own buying.",
    where:"Green dashed lines drawn BELOW the current price on the chart. The lower the line, the more buy stops cluster there.",
    signal:"When price dips BELOW an SSL level then immediately reverses back up — the dip is the hunt, the reversal is your LONG entry. This is the most common setup: false breakdown → strong reversal.",
    entry:"LONG: wait for sweep below SSL → reversal candle closes back above SSL → enter on NEXT candle open. SL below the swept low. TP at nearest BSL zone above price.",
    example:"BTC support at $74,800. SSL line drawn there. Price drops to $74,550 (grabs long stops), then closes back at $75,100. That close above $74,800 is your long entry. SL at $74,450.",
  },
  {
    sym:"OB", full:"Order Block", color:"#60a5fa", icon:"📦",
    what:"The last opposing candle (or last few candles) before a strong impulsive move. For a bullish OB: the last red candle(s) before price shot up strongly. Institutions placed large buy orders here — when price returns, they add more, causing a bounce.",
    where:"Coloured rectangles on the chart. Blue/teal = bullish OB (buy zone). Red = bearish OB (sell zone). The rectangle covers the full range of that candle (high to low).",
    signal:"Price returns to an OB zone after a strong move in the opposite direction. Enter in the direction of the original move. The OB is the re-entry zone for institutions.",
    entry:"LONG: price falls back into bullish OB box → first green candle closing inside or above OB → enter. SL below the OB's low. TP at the last swing high (the move OB launched from).",
    example:"BTC had a red candle at $75,200–$75,800 then launched to $78,000. Price pulls back to $75,400 (inside the OB rectangle). First green candle at $75,400 = long entry. SL at $75,150.",
  },
  {
    sym:"FVG", full:"Fair Value Gap (Price Imbalance)", color:"#a78bfa", icon:"⬜",
    what:"A 3-candle pattern where candle 1's high and candle 3's low don't overlap — leaving a 'gap' in price. This gap means buyers and sellers never interacted at those prices. Markets are efficient: they almost always return to fill these gaps.",
    where:"Purple shaded zone between candle 1's high and candle 3's low. You'll see it as a highlighted band after a strong move.",
    signal:"After a strong move creates an FVG, wait for price to pull back INTO the gap. That pullback into the FVG is your entry in the direction of the original move. The FVG acts as a magnet.",
    entry:"LONG: strong bullish move creates FVG → price retraces back into FVG → enter when a candle closes inside FVG or touches the top of it. SL below FVG. TP at next BSL above.",
    example:"BTC jumps from $76,000 to $77,500. Candle 1 high = $76,400. Candle 3 low = $76,700. FVG = $76,400–$76,700. BTC retraces to $76,550 → that's your long entry in the gap.",
  },
  {
    sym:"POI", full:"Point of Interest", color:"#60a5fa", icon:"📍",
    what:"Any specific price level or zone where you EXPECT price to react. This includes OBs, FVGs, BSL/SSL levels, round numbers, and previous session highs/lows. POI is the destination you wait for — NOT a random spot to enter.",
    where:"The blue dashed arrow on the chart points FROM current price TOWARD the nearest POI. The arrow tells you: 'THIS is where price is likely heading before the next move.'",
    signal:"The arrow shows you which direction to expect a pullback. Do NOT enter AT the arrow. Wait for price to reach the POI AND show a reversal signal (sweep + close back).",
    entry:"Mark the POI. Set an alert. When price reaches it, switch to a lower timeframe (5M or 15M) and look for the sweep + CHoCH entry pattern. The POI is your patient waiting zone.",
    example:"BTC at $78,000. Blue arrow points DOWN to $76,500 (bullish OB). You wait. BTC drops to $76,500, sweeps below, closes back above. NOW you enter long — not before.",
  },
  {
    sym:"Premium", full:"Premium Zone (Sell Area)", color:"#ef4444", icon:"🔴",
    what:"The upper portion of any price range — above the 50% equilibrium. Price is 'expensive' here relative to the range. Institutions SELL in premium zones. If you're buying here, you're buying what institutions are selling TO you.",
    where:"Red-tinted background on the upper half of the chart. The 50% line divides discount from premium.",
    signal:"In a DOWNTREND: look for shorts when price rallies back into premium zone. Price has overextended to the upside — institutions will push it back down. In an UPTREND: avoid longs in premium — wait for price to pull back to discount.",
    entry:"SHORT setups only in premium zone during downtrends. Look for OB or FVG in premium + sweep of BSL above it → short entry.",
    example:"BTC range $74,000–$80,000. Midpoint = $77,000. BTC rallies to $79,000 (premium zone). In downtrend, look for a bearish OB around $79k → short. Do not buy at $79k.",
  },
  {
    sym:"Discount", full:"Discount Zone (Buy Area)", color:"#22c55e", icon:"🟢",
    what:"The lower portion of any price range — below the 50% equilibrium. Price is 'cheap' here. Institutions BUY in discount zones. This is where they accumulate positions before pushing price back up into premium.",
    where:"Green-tinted background on the lower half of the chart. Everything below the 50% midline is discount.",
    signal:"In an UPTREND: only take LONG entries when price is in the discount zone. Price has pulled back to a 'sale' — institutions are stepping in to buy. Never buy in premium during an uptrend.",
    entry:"LONG setups only in discount zone during uptrends. Wait for price to pull into discount → find bullish OB or FVG in that zone → wait for sweep of SSL below → long entry.",
    example:"BTC uptrend. Range $74,000–$80,000. Midpoint $77,000. BTC pulls back to $75,500 (discount zone). Bullish OB at $75,200. SSL sweep at $74,900. Long at $75,000. Stop $74,700.",
  },
  {
    sym:"CHoCH", full:"Change of Character", color:"#22c55e", icon:"↗",
    what:"The first sign that the market is changing direction. In a downtrend (lower highs), CHoCH is the FIRST higher high. In an uptrend (higher lows), CHoCH is the FIRST lower low. It doesn't confirm the reversal alone — but it's the warning signal.",
    where:"Shown on the lower timeframe (M5/M15) after a sweep. The first candle that closes above the last swing high (for longs) or below the last swing low (for shorts).",
    signal:"After a liquidity sweep (⚡), the CHoCH is your confirmation that the reversal is real. Without CHoCH, the sweep could be noise. CHoCH + sweep = high probability setup.",
    entry:"After SSL sweep → first candle to close above the previous minor high = CHoCH → enter on the NEXT candle open. Don't wait for more — the opportunity is now.",
    example:"BTC sweeps below $74,800 SSL. Then closes back above $75,100 (previous minor high). That close above $75,100 = CHoCH. Enter long on the next candle at $75,120.",
  },
  {
    sym:"MSS", full:"Market Structure Shift", color:"#60a5fa", icon:"🔀",
    what:"A stronger, more significant version of CHoCH. Where CHoCH is the first hint, MSS is the confirmation. Price breaks a MAJOR swing high or low — not just a minor one. This signals a true trend reversal or continuation.",
    where:"The dotted line on the chart connecting the sweep low to the new high. A larger structural break than CHoCH.",
    signal:"CHoCH gives the early entry. MSS gives the confirmation entry (slightly later but higher confidence). Both in one setup = very strong signal. System score typically jumps above 80 on MSS.",
    entry:"If you missed the CHoCH entry, MSS gives a second chance. Enter when price breaks the MSS level with conviction. SL below the sweep low. TP at previous major high.",
    example:"After CHoCH at $75,100, BTC continues up and breaks the major swing high at $76,800. That break of $76,800 = MSS. If you missed the earlier entry, you can enter here with SL at $74,700.",
  },
  {
    sym:"⚡ Sweep", full:"Liquidity Sweep / Stop Hunt", color:"#f59e0b", icon:"⚡",
    what:"Price briefly exceeds a key level (BSL above or SSL below), grabbing all the stop-loss orders there, then immediately REVERSES. The spike out is the hunt — the reversal is the trade. This is the most important event to wait for.",
    where:"Yellow ⚡ marker on the chart at the spike candle. Usually a candle with a very long wick that closes back inside the range.",
    signal:"⚡ on chart = something happened. Now look at the NEXT candle. Did it reverse strongly? If yes → setup is forming. If price continues in the spike direction → not a sweep, real breakout.",
    entry:"NEVER enter on the sweep candle itself (too risky). Wait for the NEXT candle to close in the OPPOSITE direction. That close = confirmation. Enter on the candle AFTER that.",
    example:"⚡ marker below $74,800. The sweep candle has a long lower wick closing back at $75,000. Next candle closes green at $75,200. THAT candle's close = your long entry. SL at $74,600.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MTF ENTRY GUIDE
// ─────────────────────────────────────────────────────────────────────────────
function MTFEntryGuide() {
  return (
    <div style={{ background:"#0f172a",borderRadius:10,border:"1px solid #1e293b",padding:16,marginBottom:12 }}>
      <div style={{ fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12 }}>
        🤔 When to Enter Manually vs Wait for the Signal
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
        <div style={{ background:"rgba(34,197,94,0.06)",borderRadius:8,padding:12,border:"1px solid #22c55e22" }}>
          <div style={{ fontSize:12,fontWeight:800,color:"#22c55e",marginBottom:8 }}>✅ Wait for system signal when...</div>
          {[
            {rule:"Score ≥ 85 (STRONG TRADE)",    why:"Full confluence. All 4 steps aligned. Let the signal fire — it pre-fills entry, SL, TP. Just enter your amount."},
            {rule:"Score 75–84 (WATCH)",           why:"Valid setup. Can enter manually but use 50% of normal size. System detected real structure but needs one more factor."},
            {rule:"You feel uncertain",             why:"Uncertainty = no edge. If you're asking 'should I?', the answer is wait. Certainty comes from all steps ticking green."},
            {rule:"Regime is TRENDING + Sweep seen",why:"These two factors together almost always produce a TRADE signal within 1–3 candles. Be patient — it's coming."},
            {rule:"Multiple assets showing same signal",why:"When BTC, ETH, SOL all sweep SSL simultaneously, institutional buying is happening. Trust the system."},
          ].map((x,i)=>(
            <div key={i} style={{ display:"flex",gap:8,marginBottom:7 }}>
              <span style={{ color:"#22c55e",flexShrink:0,fontSize:12 }}>✓</span>
              <div><span style={{ fontSize:11,fontWeight:700,color:"#e2e8f0" }}>{x.rule}: </span>
              <span style={{ fontSize:11,color:"#94a3b8" }}>{x.why}</span></div>
            </div>
          ))}
        </div>
        <div style={{ background:"rgba(245,158,11,0.05)",borderRadius:8,padding:12,border:"1px solid #f59e0b22" }}>
          <div style={{ fontSize:12,fontWeight:800,color:"#f59e0b",marginBottom:8 }}>⚠️ Enter manually (override) only when...</div>
          {[
            {rule:"You see ⚡ sweep clearly on chart",  why:"You spotted it yourself on M5 before the system scored it. Use Step 4 override. Keep size small (0.5% max risk)."},
            {rule:"Score 65–74 + visual confirmation",  why:"Close to threshold. You can see the OB/FVG clearly. Half position size. Be ready to exit fast if it fails."},
            {rule:"Macro window (BSL model) is active",  why:"9:50–10:10 or 10:50–11:10 UTC+2. These windows are time-critical. System may lag by 1–2 candles."},
            {rule:"Major round number / HTF level hit",  why:"$75,000, $80,000, $70,000 — these psychological levels attract institutional orders. Trust your eyes here."},
            {rule:"Testing a setup (paper mode)",       why:"Always use BingX OFF for experiments. Never test with real money."},
          ].map((x,i)=>(
            <div key={i} style={{ display:"flex",gap:8,marginBottom:7 }}>
              <span style={{ color:"#f59e0b",flexShrink:0,fontSize:12 }}>→</span>
              <div><span style={{ fontSize:11,fontWeight:700,color:"#e2e8f0" }}>{x.rule}: </span>
              <span style={{ fontSize:11,color:"#94a3b8" }}>{x.why}</span></div>
            </div>
          ))}
          <div style={{ marginTop:10,padding:"6px 10px",background:"rgba(239,68,68,0.08)",borderRadius:5,fontSize:10,color:"#fca5a5" }}>
            ⚠️ Manual entries carry more risk. Always reduce position size. Set SL before you enter.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MTFStrategy({ signals }) {
  const { candles:allCandles, loadCandles } = useStore();
  const [sym,      setSym]      = useState("BTCUSDT");
  const [step,     setStep]     = useState(0);
  const [showModal,setShowModal]= useState(false);
  const [override,    setOverride]    = useState(false);
  const [showGuide,   setShowGuide]   = useState(false);
  const [showGloss,   setShowGloss]   = useState(false);
  const [glossSym,    setGlossSym]    = useState(null);

  useEffect(()=>{ loadCandles(sym,"1h"); },[sym]);

  const candles  = allCandles[`${sym}_1h`] || allCandles[`${sym}_1m`] || [];
  const sig      = signals.find(s=>(s.asset||s.symbol)===sym);
  const regime   = sig?.context?.regime?.type || sig?.regime || "CHOP";
  const score    = sig?.signal?.score || sig?.score || 0;
  const liq      = sig?.context?.liquidity;
  const of       = sig?.context?.orderflow;
  const stopHunt = sig?.context?.stopHunt || sig?.stopHunt;
  const plan     = sig?.signal?.tradePlan;
  const action   = sig?.signal?.action || sig?.action;
  const dir      = sig?.signal?.direction || sig?.direction;

  const h4Bias    = ["TRENDING_UP","TRENDING_DOWN","EXPANSION","COMPRESSION"].includes(regime);
  const hasZone   = (liq?.buySide?.length||0)>0||(liq?.sellSide?.length||0)>0;
  const hasConfirm= !!stopHunt||(of?.bias&&of.bias!=="NEUTRAL");
  const rrOk      = (plan?.riskReward||0)>=1.5;

  const STEPS=[
    {
      num:1,tf:"4H / 1H",title:"Higher Timeframe — Define Bias",color:STEP_COLORS[0],icon:"📊",
      headline:"Define context first. Trend? Where was liquidity taken? Is price in premium or discount zone?",
      checks:[
        {label:`Trend: ${regime.replace(/_/g," ")}`,done:h4Bias,
          tip:"HH/HL = uptrend (bullish). LH/LL = downtrend (bearish). CHOP = no trade at all.",
          detail:h4Bias?`✓ ${regime.replace(/_/g," ")} — tradeable`:"✗ CHOP — wait for trend"},
        {label:"Liquidity zones mapped (BSL / SSL)",done:hasZone,
          tip:"BSL = buy-side liquidity (stops above swing highs). SSL = sell-side liquidity (stops below swing lows). Shown as dashed lines on chart.",
          detail:hasZone?`✓ ${liq?.buySide?.length||0} BSL + ${liq?.sellSide?.length||0} SSL zones`:"✗ No zones identified"},
        {label:"Price in premium/discount area",done:h4Bias,
          tip:"Above 50% equilibrium = premium (sell zone). Below = discount (buy zone). Mid-range = bad entries.",
          detail:h4Bias?`✓ ${regime==="TRENDING_UP"?"Bullish — seek discounts":"Bearish — seek premiums"}`:"✗ Confirm 50% level first"},
      ],
    },
    {
      num:2,tf:"1H / 4H",title:"Wait for Point of Interest (POI)",color:STEP_COLORS[1],icon:"📍",
      headline:"Only act when price reaches an Order Block, FVG, or liquidity area. Mid-range = bad R:R.",
      checks:[
        {label:"Order Block (OB) near price",done:hasZone,
          tip:"The last bearish candle before a bullish move (for longs). Price retests the 50% of this candle. Shown as coloured bands.",
          detail:hasZone?"✓ OB zones mapped":"✗ No OB near price"},
        {label:"Fair Value Gap (FVG) present",done:!!stopHunt||score>=70,
          tip:"3-candle imbalance: gap between candle 1 high and candle 3 low. Acts as magnet — price fills these.",
          detail:stopHunt?"✓ Imbalance detected":score>=70?"✓ Probable (score ≥70)":"✗ No imbalance"},
        {label:"POI aligned with trend bias",done:h4Bias,
          tip:"LONG: OB/FVG must be in discount zone (below 50%). SHORT: must be in premium. Wrong zone = skip.",
          detail:h4Bias?"✓ Zone matches bias direction":"✗ Wait for correct zone"},
      ],
    },
    {
      num:3,tf:"M15 / M5",title:"Lower Timeframe Confirmation",color:STEP_COLORS[2],icon:"⚡",
      headline:"Zone alone = 50/50. Zone + confirmation = high probability. Need: sweep, CHoCH, displacement.",
      checks:[
        {label:"Liquidity sweep confirmed",done:!!stopHunt,
          tip:"Price raids below swing low (grabs buy-side stops), then REVERSES back. Shown as ⚡ SWEEP marker. This is the actual trigger.",
          detail:stopHunt?`✓ ${stopHunt.type?.replace(/_/g," ")} detected`:"✗ No sweep yet — wait for the raid"},
        {label:"CHoCH or MSS on LTF",done:hasConfirm,
          tip:"Change of Character: first higher high after downtrend. Market Structure Shift: clean break above previous swing. Both confirm reversal.",
          detail:hasConfirm?`✓ ${of?.bias?.replace(/_IN_CONTROL/,"")?.replace(/_/," ")||"Confirmed"}`:"✗ No structure shift yet"},
        {label:"Strong displacement candle",done:score>=75,
          tip:"A large decisive candle that creates the new FVG. Needs to close far from zone with volume. Weak candles = weak signal.",
          detail:score>=75?`✓ Score ${score}`:`✗ Score ${score} — need ≥75`},
        {label:"New M5 OB/FVG entry zone",done:!!stopHunt||score>=80,
          tip:"The displacement creates your precise entry zone. You enter when price pulls back into this new M5 FVG/OB. This is the entry candle.",
          detail:(stopHunt||score>=80)?"✓ Entry zone formed":"✗ Await pullback zone"},
      ],
    },
    {
      num:4,tf:"M5 / M15",title:"Entry — Stop Loss — Take Profit",color:STEP_COLORS[3],icon:"🎯",
      headline:"Enter at M5 FVG/OB. SL below swept swing low. TP at next liquidity target. Min RR 1.5:1.",
      checks:[
        {label:"R:R ≥ 1.5:1 confirmed",done:rrOk,
          tip:"Potential profit must be at least 1.5× risk. Without this, even 60% wins lose money long-term.",
          detail:plan?`R:R = ${plan.riskReward?.toFixed(2)||"—"}:1 ${rrOk?"✓":"✗ below minimum"}`:"Awaiting trade plan"},
        {label:"All 3 timeframes aligned",done:h4Bias&&hasZone&&hasConfirm,
          tip:"HTF = bias. H1 = zone. M5 = trigger. All three must agree. One missing = skip.",
          detail:[h4Bias?"✓ HTF":"✗ HTF",hasZone?"✓ H1":"✗ H1",hasConfirm?"✓ M5":"✗ M5"].join(" · ")},
        {label:`Score ≥ 70 (current: ${score})`,done:score>=70,
          tip:"System confluence score. ≥85 = Strong. 70–84 = Valid. <70 = insufficient edge.",
          detail:score>=85?"🔥 Strong (85+)":score>=70?"✅ Valid (70–84)":"🚫 Block — not enough edge"},
      ],
    },
  ];

  const curStep    = STEPS[step];
  const allDone    = curStep.checks.every(c=>c.done);
  const step4Ready = step===3 && allDone && action && action!=="NO_TRADE";

  // Modal signal: locked when all conditions met, editable with override
  const lockedSignal = {
    asset:sym, direction:dir||"LONG", score, regime,
    entry:plan?.entry, sl:plan?.stopLoss, tp:plan?.takeProfit,
    stopHunt, absorption:sig?.context?.absorption||sig?.absorption,
    orderflow:of, signal:sig?.signal, context:sig?.context,
  };

  return (
    <div style={{ color:P.bright }}>

      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10 }}>
        <div>
          <h2 style={{ fontSize:17,fontWeight:800,margin:0 }}>📊 Multi-Timeframe Entry Strategy</h2>
          <p style={{ fontSize:11,color:P.sub,margin:"4px 0 0" }}>HTF Context → H1 Structure → M5 Confirmation → Execute with edge</p>
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

      {/* ── Entry Guide ─────────────────────────────────────────────────────── */}
      {showGuide && <MTFEntryGuide/>}

      {/* ── Symbol Glossary ─────────────────────────────────────────────────── */}
      {showGloss && (
        <div style={{ background:P.panel,borderRadius:10,border:`1px solid ${P.border}`,marginBottom:12,overflow:"hidden" }}>
          <div style={{ padding:"10px 14px",borderBottom:`1px solid ${P.border}` }}>
            <div style={{ fontSize:11,fontWeight:700,color:P.muted,textTransform:"uppercase",letterSpacing:"0.07em" }}>
              📖 Chart Symbol Guide — click any symbol to learn what it means and when to act
            </div>
          </div>
          {/* Symbol buttons */}
          <div style={{ padding:"10px 14px",display:"flex",flexWrap:"wrap",gap:6 }}>
            {MTF_GLOSSARY.map(g=>(
              <button key={g.sym} onClick={()=>setGlossSym(glossSym===g.sym?null:g.sym)} style={{
                padding:"4px 10px",borderRadius:5,fontWeight:700,fontSize:11,cursor:"pointer",
                border:`1px solid ${glossSym===g.sym?g.color:P.border}`,
                background:glossSym===g.sym?`${g.color}18`:P.bg,
                color:glossSym===g.sym?g.color:P.text,transition:"all 0.2s",
              }}>{g.icon} {g.sym}</button>
            ))}
          </div>
          {/* Detail pane */}
          {glossSym && (() => {
            const g = MTF_GLOSSARY.find(x=>x.sym===glossSym);
            if (!g) return null;
            return (
              <div style={{ padding:14,borderTop:`1px solid ${P.border}`,background:P.bg }}>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <div>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                      <span style={{ fontSize:26 }}>{g.icon}</span>
                      <div>
                        <div style={{ fontSize:15,fontWeight:800,color:g.color }}>{g.sym}</div>
                        <div style={{ fontSize:11,color:P.text }}>{g.full}</div>
                      </div>
                    </div>
                    <div style={{ background:P.panel,borderRadius:7,padding:12,marginBottom:8 }}>
                      <div style={{ fontSize:10,fontWeight:700,color:P.muted,textTransform:"uppercase",marginBottom:6 }}>What is it?</div>
                      <div style={{ fontSize:12,color:P.text,lineHeight:1.65 }}>{g.what}</div>
                    </div>
                    <div style={{ background:P.panel,borderRadius:7,padding:12 }}>
                      <div style={{ fontSize:10,fontWeight:700,color:P.muted,textTransform:"uppercase",marginBottom:6 }}>Where on the chart?</div>
                      <div style={{ fontSize:12,color:P.text,lineHeight:1.65 }}>{g.where}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ background:`${g.color}08`,borderRadius:7,padding:12,border:`1px solid ${g.color}22`,marginBottom:8 }}>
                      <div style={{ fontSize:10,fontWeight:700,color:g.color,textTransform:"uppercase",marginBottom:6 }}>When to enter / what it signals</div>
                      <div style={{ fontSize:12,color:P.bright,lineHeight:1.65 }}>{g.signal}</div>
                    </div>
                    <div style={{ background:P.panel,borderRadius:7,padding:12,marginBottom:8 }}>
                      <div style={{ fontSize:10,fontWeight:700,color:P.muted,textTransform:"uppercase",marginBottom:6 }}>Exact entry rule</div>
                      <div style={{ fontSize:12,color:P.text,lineHeight:1.65 }}>{g.entry}</div>
                    </div>
                    <div style={{ background:"rgba(245,158,11,0.06)",borderRadius:7,padding:12,border:"1px solid #f59e0b22" }}>
                      <div style={{ fontSize:10,fontWeight:700,color:P.amber,textTransform:"uppercase",marginBottom:6 }}>💡 Real BTC example</div>
                      <div style={{ fontSize:12,color:P.text,lineHeight:1.65,fontStyle:"italic" }}>{g.example}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Step bar */}
      <div style={{ display:"flex",borderRadius:10,overflow:"hidden",border:"1px solid #1e293b",marginBottom:14 }}>
        {STEPS.map((s,i)=>{
          const done=s.checks.every(c=>c.done);
          return (
            <button key={i} onClick={()=>setStep(i)} style={{
              flex:1,padding:"12px 6px",border:"none",cursor:"pointer",textAlign:"center",
              background:step===i?`${s.color}18`:"#0b0e14",
              borderRight:i<3?"1px solid #1e293b":"none",
              transition:"all 0.25s",position:"relative",
            }}>
              {done&&<div style={{position:"absolute",top:5,right:5,width:8,height:8,borderRadius:"50%",background:"#22c55e"}}/>}
              <div style={{ fontSize:18,marginBottom:3 }}>{s.icon}</div>
              <div style={{ fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",
                color:step===i?s.color:done?"#22c55e":P.muted }}>STEP {s.num}</div>
              <div style={{ fontSize:9,color:step===i?s.color:P.dim,marginTop:1 }}>{s.tf}</div>
            </button>
          );
        })}
      </div>

      {/* Headline */}
      <div style={{
        padding:"10px 14px",borderRadius:7,marginBottom:14,
        background:`${curStep.color}10`,border:`1px solid ${curStep.color}33`,
        display:"flex",alignItems:"center",gap:10,
      }}>
        <span style={{ fontSize:20,flexShrink:0 }}>{curStep.icon}</span>
        <div>
          <div style={{ fontSize:13,fontWeight:700,color:curStep.color }}>Step {curStep.num} — {curStep.title}</div>
          <div style={{ fontSize:11,color:P.text,marginTop:2,lineHeight:1.5 }}>{curStep.headline}</div>
        </div>
      </div>

      {/* Chart + checklist grid */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 360px",gap:14,marginBottom:14 }}>

        <div style={{ background:P.bg,borderRadius:10,border:"1px solid #1e293b",overflow:"hidden" }}>
          {candles.length===0?(
            <div style={{ height:295,display:"flex",alignItems:"center",justifyContent:"center",color:P.muted,fontSize:12 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:28,marginBottom:8 }}>📊</div>Loading {sym} 1H candles...
              </div>
            </div>
          ):(
            <StepChart step={step} candles={candles} sig={sig} sym={sym}/>
          )}
        </div>

        <div>
          <div style={{ background:P.panel,borderRadius:10,padding:14,border:"1px solid #1e293b",marginBottom:10 }}>
            <div style={{ fontSize:10,fontWeight:700,color:P.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10 }}>
              Step {curStep.num} — {sym.replace("USDT","")}
            </div>
            {curStep.checks.map((c,i)=>(
              <CheckRow key={i} done={c.done} label={c.label} tip={c.tip} detail={c.detail}/>
            ))}
          </div>

          {/* Status + next */}
          <div style={{
            padding:"10px 14px",borderRadius:8,textAlign:"center",marginBottom:10,
            background:allDone?"rgba(34,197,94,0.08)":"rgba(245,158,11,0.06)",
            border:`1px solid ${allDone?"#22c55e44":"#f59e0b33"}`,
          }}>
            <div style={{ fontSize:12,fontWeight:700,color:allDone?P.green:P.amber }}>
              {allDone
                ?`✅ Step ${curStep.num} complete${step<3?" — go to Step "+(step+2):" — ready"}`
                :`⏳ ${curStep.checks.filter(c=>!c.done).length} condition${curStep.checks.filter(c=>!c.done).length>1?"s":""} pending`}
            </div>
            {step<3&&allDone&&(
              <button onClick={()=>setStep(step+1)} style={{
                marginTop:8,padding:"5px 18px",borderRadius:5,border:"none",
                background:STEP_COLORS[step+1],color:"#000",fontWeight:700,fontSize:12,cursor:"pointer",
              }}>Next: Step {step+2} →</button>
            )}
          </div>

          {/* Step 4 trade button + override */}
          {step===3&&(
            <div>
              <button onClick={()=>setShowModal(true)} style={{
                width:"100%",padding:"15px 20px",borderRadius:9,border:"none",
                cursor:"pointer",fontWeight:800,fontSize:14,transition:"all 0.25s",
                background:step4Ready
                  ?"linear-gradient(135deg,#15803d,#22c55e)"
                  :"linear-gradient(135deg,#92400e,#d97706)",
                color:"#fff",
                boxShadow:step4Ready?"0 4px 24px rgba(34,197,94,0.45)":"0 4px 16px rgba(217,119,6,0.3)",
              }}>
                <div style={{ fontSize:20,marginBottom:4 }}>{step4Ready?"🔥":"⚠️"}</div>
                <div>{step4Ready
                  ?`▲ EXECUTE ${dir||"TRADE"} — All conditions met`
                  :"📋 Open Trade — Conditions not fully met"
                }</div>
                <div style={{ fontSize:10,opacity:0.8,marginTop:4,fontWeight:400 }}>
                  {step4Ready
                    ?`Score ${score} · Entry, SL & TP pre-filled · Enter amount only`
                    :`${curStep.checks.filter(c=>!c.done).length} pending · Enable override to trade manually`
                  }
                </div>
              </button>

              {/* Override toggle — only when conditions not met */}
              {!step4Ready&&(
                <div style={{
                  marginTop:8,padding:"10px 14px",borderRadius:8,
                  background:"rgba(245,158,11,0.05)",border:"1px solid #f59e0b33",
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                }}>
                  <div>
                    <div style={{ fontSize:11,fontWeight:700,color:P.amber }}>Override Lock</div>
                    <div style={{ fontSize:10,color:P.sub,marginTop:2 }}>
                      {override?"All fields editable — trade at your own discretion":"Turn on to trade despite unmet conditions"}
                    </div>
                  </div>
                  <button onClick={()=>setOverride(v=>!v)} style={{
                    padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",
                    fontWeight:700,fontSize:11,transition:"all 0.2s",
                    background:override?"#f59e0b":"#1e293b",
                    color:override?"#000":"#475569",
                  }}>{override?"Override: ON":"Override: OFF"}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8 }}>
        {[
          {l:"Regime",   v:regime.replace(/_/g," "),c:h4Bias?P.green:P.amber},
          {l:"Score",    v:score,c:score>=85?P.green:score>=70?P.amber:P.red},
          {l:"StopHunt", v:stopHunt?"DETECTED":"—",c:stopHunt?P.green:P.muted},
          {l:"Flow",     v:of?.bias?.replace(/_IN_CONTROL/,"")?.replace(/_/," ")||"NEUTRAL",c:of?.bias&&of.bias!=="NEUTRAL"?P.blue:P.muted},
          {l:"R:R",      v:plan?.riskReward?`${plan.riskReward.toFixed(2)}:1`:"—",c:rrOk?P.green:plan?.riskReward?P.red:P.muted},
        ].map(x=>(
          <div key={x.l} style={{ background:P.panel,borderRadius:7,padding:"8px 10px",border:"1px solid #1e293b" }}>
            <div style={{ fontSize:9,color:P.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3 }}>{x.l}</div>
            <div style={{ fontSize:12,fontWeight:700,color:x.c }}>{x.v}</div>
          </div>
        ))}
      </div>

      {showModal&&(
        <TradeEntryModal
          signal={override?null:lockedSignal}
          onClose={()=>{setShowModal(false);setOverride(false);}}
          onSaved={()=>{setShowModal(false);setOverride(false);}}
        />
      )}
    </div>
  );
}