import React, { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "../../store/useStore";

const SYMBOLS    = ["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"];
const TIMEFRAMES = [
  { label:"1m", value:"1m" }, { label:"5m",  value:"5m"  },
  { label:"15m",value:"15m"},  { label:"1H",  value:"1h"  },
  { label:"4H", value:"4h" }, { label:"1W",  value:"1w"  },
  { label:"1M", value:"1M" },
];

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:       "#0b0e14",
  grid:     "#161d2a",
  gridV:    "#111827",
  axisText: "#4b5563",
  bull:     "#26a69a", bullFill: "rgba(38,166,154,0.82)",
  bear:     "#ef5350", bearFill: "rgba(239,83,80,0.82)",
  ma9:      "#f59e0b",
  ma21:     "#60a5fa",
  ma50:     "#c084fc",
  ma200:    "#facc15",   // yellow as requested
  bbUpper:  "rgba(99,102,241,0.55)",
  bbLower:  "rgba(99,102,241,0.55)",
  bbMid:    "rgba(99,102,241,0.28)",
  bbFill:   "rgba(99,102,241,0.04)",
  supFill:  "rgba(34,197,94,",
  supLine:  "#22c55e",
  resFill:  "rgba(239,68,68,",
  resLine:  "#ef4444",
  intL:     "#fbbf24",
  intS:     "#a78bfa",
  actL:     "#22c55e",
  actS:     "#ef4444",
  priceTag: "#f9fafb",
  rsiLine:  "#38bdf8",
  macdLine: "#60a5fa",
  sigLine:  "#f59e0b",
  histBull: "rgba(38,166,154,0.65)",
  histBear: "rgba(239,83,80,0.65)",
};

// ── Math ──────────────────────────────────────────────────────────────────────
function emaArr(data, p) {
  const k = 2/(p+1); const out = Array(data.length).fill(null);
  let v = null;
  for (let i=0;i<data.length;i++) {
    if (data[i]==null) continue;
    v = v===null ? data[i] : data[i]*k + v*(1-k);
    out[i] = v;
  }
  return out;
}
function sma(data, p) {
  return data.map((_,i) => i<p-1 ? null
    : data.slice(i-p+1,i+1).reduce((a,b)=>a+b,0)/p);
}
function bollingerBands(closes, p=20, mult=2) {
  const mid = sma(closes,p);
  return mid.map((m,i) => {
    if (m===null) return {upper:null,mid:null,lower:null};
    const sl = closes.slice(i-p+1,i+1);
    const std = Math.sqrt(sl.reduce((s,v)=>s+(v-m)**2,0)/p);
    return {upper:m+mult*std, mid:m, lower:m-mult*std};
  });
}
function calcRSI(closes, period=14) {
  const out = Array(closes.length).fill(null);
  if (closes.length < period+1) return out;
  let gains=0, losses=0;
  for (let i=1;i<=period;i++) {
    const d=closes[i]-closes[i-1];
    if(d>0) gains+=d; else losses-=d;
  }
  let ag=gains/period, al=losses/period;
  out[period] = 100 - 100/(1+ag/(al||0.001));
  for (let i=period+1;i<closes.length;i++) {
    const d=closes[i]-closes[i-1];
    ag=(ag*(period-1)+(d>0?d:0))/period;
    al=(al*(period-1)+(d<0?-d:0))/period;
    out[i]=100-100/(1+ag/(al||0.001));
  }
  return out;
}
function calcMACD(closes, fast=12, slow=26, sig=9) {
  const ef=emaArr(closes,fast), es=emaArr(closes,slow);
  const macd=closes.map((_,i)=>ef[i]!=null&&es[i]!=null?ef[i]-es[i]:null);
  const signal=emaArr(macd.map(v=>v??0),sig);
  const hist=macd.map((v,i)=>v!=null&&signal[i]!=null?v-signal[i]:null);
  return {macd,signal,hist};
}

// S/R zones — only the most significant, well-separated ones
function findSRZones(candles) {
  if (candles.length < 30) return [];
  const raw = [];
  // Require 4-bar confirmation each side for cleaner highs/lows
  for (let i=4; i<candles.length-4; i++) {
    const c=candles[i];
    const isH = [1,2,3,4].every(o=>c.high>candles[i-o].high&&c.high>candles[i+o].high);
    const isL = [1,2,3,4].every(o=>c.low <candles[i-o].low &&c.low <candles[i+o].low );
    if (isH) raw.push({price:c.high, type:"R"});
    if (isL) raw.push({price:c.low,  type:"S"});
  }
  // Cluster with 0.6% tolerance — wider = fewer zones
  raw.sort((a,b)=>a.price-b.price);
  const zones=[];
  for (const lv of raw) {
    const ex=zones.find(z=>z.type===lv.type&&Math.abs(z.mid-lv.price)/lv.price<0.006);
    if (ex) { ex.prices.push(lv.price); ex.touches++; ex.mid=ex.prices.reduce((a,b)=>a+b,0)/ex.prices.length; }
    else zones.push({type:lv.type, mid:lv.price, prices:[lv.price], touches:1});
  }
  // Zone band = ±0.15% of mid (tight, visual only)
  zones.forEach(z=>{ z.top=z.mid*1.0015; z.bottom=z.mid*0.9985; });
  // Keep only top 3 S and top 3 R by touch count
  const S=zones.filter(z=>z.type==="S").sort((a,b)=>b.touches-a.touches).slice(0,3);
  const R=zones.filter(z=>z.type==="R").sort((a,b)=>b.touches-a.touches).slice(0,3);
  return [...S,...R];
}

function buildInterestZones(candles, signals, symbol) {
  const sig=signals.find(s=>(s.asset||s.symbol)===symbol);
  if (!sig||!candles.length) return [];
  const zones=[], last=candles[candles.length-1];
  const liq=sig.context?.liquidity;
  const atr=sig.context?.volatility?.atr||(last.close*0.004);
  const regime=sig.context?.regime?.type||sig.regime;
  // Only 1 interest zone each side
  const bs=liq?.buySide?.find(z=>z.price<last.close);
  const ss=liq?.sellSide?.find(z=>z.price>last.close);
  if (bs) zones.push({type:"INTEREST_LONG",  price:bs.price, top:bs.price+atr*0.4, bottom:bs.price-atr*0.25, label:"⚡ LONG",  active:false, tooltip:`Pullback target: ${fmtP(bs.price)}\nRegime: ${regime}\nLiquidity pool below price`});
  if (ss) zones.push({type:"INTEREST_SHORT", price:ss.price, top:ss.price+atr*0.25, bottom:ss.price-atr*0.4, label:"⚡ SHORT", active:false, tooltip:`Rally target: ${fmtP(ss.price)}\nRegime: ${regime}\nLiquidity pool above price`});
  const action=sig.signal?.action||sig.action;
  const dir=sig.signal?.direction||sig.direction;
  if (action==="TRADE"||action==="WATCH") {
    const entry=sig.signal?.tradePlan?.entry||last.close;
    const sl=sig.signal?.tradePlan?.stopLoss, tp=sig.signal?.tradePlan?.takeProfit;
    const rr=sig.signal?.tradePlan?.riskReward;
    zones.push({type:dir==="LONG"?"ACTIVE_LONG":"ACTIVE_SHORT", price:entry,
      top:entry+atr*0.25, bottom:entry-atr*0.25, active:true,
      label:`🔥 ${action} ${dir||""}`,
      tooltip:`Score: ${sig.signal?.score||0}\nEntry: ${fmtP(entry)}\nSL:    ${fmtP(sl)}\nTP:    ${fmtP(tp)}\nR:R    ${rr||"—"}`});
  }
  return zones;
}

function fmtP(p) {
  if (p==null||p===undefined) return "—";
  return p>100 ? p.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : p.toFixed(6);
}
function fmtT(ts,tf) {
  const d=new Date(ts);
  if (["1w","1M"].includes(tf)) return `${d.getDate()}/${d.getMonth()+1}`;
  if (["4h","1h"].includes(tf)) return `${d.getDate()} ${d.getHours()}h`;
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}
function drawLine(ctx, vals, toX, toY, color, lw=1.5, dash=[]) {
  ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=lw; ctx.setLineDash(dash);
  let st=false;
  vals.forEach((v,i)=>{ if(v==null){st=false;return;} if(!st){ctx.moveTo(toX(i),toY(v));st=true;}else ctx.lineTo(toX(i),toY(v)); });
  ctx.stroke(); ctx.setLineDash([]);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TradingChart() {
  const {candles:allCandles, loadCandles, signals} = useStore();
  const [symbol,   setSymbol]   = useState("BTCUSDT");
  const [tf,       setTf]       = useState("1h");
  const [showRSI,  setShowRSI]  = useState(true);
  const [showMACD, setShowMACD] = useState(false);
  const [tooltip,  setTooltip]  = useState(null);

  const mainRef = useRef(null);
  const rsiRef  = useRef(null);
  const macdRef = useRef(null);
  const dpRef   = useRef(null);

  const cacheKey   = `${symbol}_${tf}`;
  const rawCandles = allCandles[cacheKey]||[];
  const candles    = rawCandles.slice(-150);

  useEffect(()=>{ loadCandles(symbol,tf); },[symbol,tf]);

  const sigData  = signals.find(s=>(s.asset||s.symbol)===symbol);
  const regime   = sigData?.context?.regime?.type||sigData?.regime||null;
  const lastC    = candles.length ? candles[candles.length-1] : null;
  const prevC    = candles.length>1 ? candles[candles.length-2] : null;
  const change   = lastC&&prevC ? ((lastC.close-prevC.close)/prevC.close*100) : null;

  const closes   = candles.map(c=>c.close);
  const ma9      = emaArr(closes,9);
  const ma21     = emaArr(closes,21);
  const ma50     = emaArr(closes,50);
  const ma200    = emaArr(closes,200);
  const bb       = bollingerBands(closes,20,2);
  const rsi      = calcRSI(closes,14);
  const macdObj  = calcMACD(closes,12,26,9);
  const srZones  = findSRZones(candles);
  const izones   = buildInterestZones(candles,signals,symbol);

  // ── MAIN CHART ───────────────────────────────────────────────────────────
  useEffect(()=>{
    if (!candles.length) return;
    const cvs=mainRef.current; if(!cvs) return;
    const ctx=cvs.getContext("2d");
    const W=cvs.width, H=cvs.height;
    ctx.clearRect(0,0,W,H);

    // Layout: price axis LEFT, labels RIGHT on chart body not outside
    const PL=72, PR=8, PT=16, PB=32;
    const cW=W-PL-PR, cH=H-PT-PB;

    // Price range — include MA200, BB, and only zones near current price
    const prices=candles.flatMap(c=>[c.high,c.low]);
    bb.forEach(b=>{ if(b.upper) prices.push(b.upper,b.lower); });
    ma200.forEach(v=>{ if(v) prices.push(v); });
    const minP=Math.min(...prices)*0.9995;
    const maxP=Math.max(...prices)*1.0005;
    const rng=maxP-minP;

    const toX=i=>PL+(i/(candles.length-1||1))*cW;
    const toY=p=>PT+(1-(p-minP)/rng)*cH;

    dpRef.current={PL,PR,PT,PB,cW,cH,W,H,minP,maxP,rng,toX,toY,candles,srZones,izones};

    // BG
    ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);

    // Horizontal grid lines + price labels
    for (let i=0;i<=8;i++) {
      const y=PT+(i/8)*cH;
      ctx.strokeStyle=C.grid; ctx.lineWidth=1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke();
      const price=maxP-(i/8)*rng;
      ctx.fillStyle=C.axisText; ctx.font="10px monospace"; ctx.textAlign="right";
      ctx.fillText(fmtP(price),PL-4,y+3);
    }
    // Vertical grid lines
    const vStep=Math.ceil(candles.length/8);
    candles.forEach((_,i)=>{
      if(i%vStep!==0) return;
      ctx.strokeStyle=C.gridV; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(toX(i),PT); ctx.lineTo(toX(i),PT+cH); ctx.stroke();
    });

    // ── S/R ZONES — clean minimal style ──────────────────────────────────
    // Draw only zones that are within the visible price range
    srZones.forEach(zone=>{
      const yMid=toY(zone.mid);
      const yTop=toY(zone.top);
      const yBot=toY(zone.bottom);
      if (yMid<PT-20||yMid>PT+cH+20) return; // skip if off screen

      const isR=zone.type==="R";
      // Subtle fill — just the band height, not garish
      const alpha=Math.min(0.22, 0.08+zone.touches*0.05);
      ctx.fillStyle=isR?`rgba(239,68,68,${alpha})`:`rgba(34,197,94,${alpha})`;
      ctx.fillRect(PL,yTop,cW,yBot-yTop);

      // Single bold midline — the key visual element
      ctx.strokeStyle=isR?"rgba(239,68,68,0.75)":"rgba(34,197,94,0.75)";
      ctx.lineWidth=isR?1.5:1.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(PL,yMid); ctx.lineTo(W-PR,yMid); ctx.stroke();

      // Small inline label — drawn ON the chart, right side, not outside
      const tag=`${isR?"R":"S"} ${zone.touches}×`;
      const tw=ctx.measureText(tag).width;
      ctx.font="bold 9px monospace";
      ctx.fillStyle=isR?"rgba(239,68,68,0.9)":"rgba(34,197,94,0.9)";
      // Label background pill
      ctx.fillRect(W-PR-tw-10, yMid-7, tw+8, 13);
      ctx.fillStyle="#fff";
      ctx.textAlign="right";
      ctx.fillText(tag, W-PR-6, yMid+3);
    });

    // ── Interest / signal zones — thin, non-intrusive ─────────────────────
    izones.forEach(zone=>{
      const yMid=toY(zone.price);
      const yTop=toY(zone.top);
      const yBot=toY(zone.bottom);
      if (yTop>PT+cH||yBot<PT) return;

      const isLong=zone.type.includes("LONG");
      const isActive=zone.active;
      const col=isActive?(isLong?C.actL:C.actS):(isLong?C.intL:C.intS);

      // Very subtle fill
      ctx.fillStyle=isActive?`${col}22`:`${col}18`;
      ctx.fillRect(PL,yTop,cW,yBot-yTop);

      // Dashed midline
      ctx.strokeStyle=col; ctx.lineWidth=isActive?1.5:1; ctx.setLineDash([6,4]);
      ctx.beginPath(); ctx.moveTo(PL,yMid); ctx.lineTo(W-PR,yMid); ctx.stroke();
      ctx.setLineDash([]);

      // Small label on the left side (doesn't clash with S/R labels on right)
      ctx.fillStyle=col; ctx.font=`bold 9px monospace`; ctx.textAlign="left";
      ctx.fillText(zone.label, PL+6, yMid-4);
    });

    // ── BB ────────────────────────────────────────────────────────────────
    ctx.beginPath();
    let fbFirst=true;
    bb.forEach((b,i)=>{ if(!b.upper) return; if(fbFirst){ctx.moveTo(toX(i),toY(b.upper));fbFirst=false;}else ctx.lineTo(toX(i),toY(b.upper)); });
    for(let i=bb.length-1;i>=0;i--){ if(bb[i].lower==null) continue; ctx.lineTo(toX(i),toY(bb[i].lower)); }
    ctx.closePath(); ctx.fillStyle=C.bbFill; ctx.fill();
    drawLine(ctx,bb.map(b=>b.upper),toX,toY,C.bbUpper,1,[4,3]);
    drawLine(ctx,bb.map(b=>b.lower),toX,toY,C.bbLower,1,[4,3]);
    drawLine(ctx,bb.map(b=>b.mid),  toX,toY,C.bbMid,  1,[6,4]);

    // ── MAs — thinnest first so MA200 paints on top ───────────────────────
    drawLine(ctx,ma9,  toX,toY,C.ma9,  1.2);
    drawLine(ctx,ma21, toX,toY,C.ma21, 1.5);
    drawLine(ctx,ma50, toX,toY,C.ma50, 2.0);
    // MA200 — thick yellow, drawn last so always on top
    drawLine(ctx,ma200,toX,toY,C.ma200, 3.0);

    // MA200 price label — floating on the line, left side, not overlapping chart
    const last200=ma200.filter(v=>v!=null).slice(-1)[0];
    if (last200) {
      const y200=toY(last200);
      // Only draw if within chart area
      if (y200>=PT&&y200<=PT+cH) {
        const tag200=`MA200`;
        ctx.fillStyle="rgba(250,204,21,0.15)";
        ctx.fillRect(PL+2,y200-8,50,15);
        ctx.strokeStyle=C.ma200; ctx.lineWidth=1;
        ctx.strokeRect(PL+2,y200-8,50,15);
        ctx.fillStyle=C.ma200; ctx.font="bold 8px monospace"; ctx.textAlign="left";
        ctx.fillText(tag200,PL+6,y200+3);
      }
    }

    // ── Candlesticks ──────────────────────────────────────────────────────
    const cw=Math.max(2,(cW/candles.length)*0.72);
    candles.forEach((c,i)=>{
      const x=toX(i), bull=c.close>=c.open;
      ctx.strokeStyle=bull?C.bull:C.bear; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x,toY(c.high)); ctx.lineTo(x,toY(c.low)); ctx.stroke();
      const bt=toY(Math.max(c.open,c.close)), bh=Math.max(1,toY(Math.min(c.open,c.close))-bt);
      ctx.fillStyle=bull?C.bullFill:C.bearFill;
      ctx.fillRect(x-cw/2,bt,cw,bh);
    });

    // ── Signal arrow markers ──────────────────────────────────────────────
    izones.filter(z=>z.active).forEach(zone=>{
      const isLong=zone.type.includes("LONG");
      const y=toY(zone.price), x=toX(candles.length-1);
      ctx.fillStyle=isLong?C.actL:C.actS;
      ctx.shadowColor=isLong?C.actL:C.actS; ctx.shadowBlur=6;
      ctx.beginPath();
      if (isLong) { ctx.moveTo(x,y+8);ctx.lineTo(x-7,y+20);ctx.lineTo(x+7,y+20); }
      else        { ctx.moveTo(x,y-8);ctx.lineTo(x-7,y-20);ctx.lineTo(x+7,y-20); }
      ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    });

    // ── X-axis time labels ────────────────────────────────────────────────
    ctx.fillStyle=C.axisText; ctx.font="9px monospace"; ctx.textAlign="center";
    candles.forEach((c,i)=>{ if(i%vStep!==0) return; ctx.fillText(fmtT(c.time,tf),toX(i),H-10); });

    // ── Current price line + tag ──────────────────────────────────────────
    if (lastC) {
      const y=toY(lastC.close);
      ctx.setLineDash([4,4]); ctx.strokeStyle="rgba(249,250,251,0.25)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke(); ctx.setLineDash([]);
      // Price tag on the price axis (left side, clean)
      const tag=fmtP(lastC.close); const tw=ctx.measureText(tag).width+10;
      const bull=lastC.close>=(prevC?.close||0);
      ctx.fillStyle=bull?C.bull:C.bear;
      ctx.fillRect(0,y-8,PL-2,16);
      ctx.fillStyle="#fff"; ctx.font="bold 9px monospace"; ctx.textAlign="right";
      ctx.fillText(tag,PL-5,y+4);
    }

  },[candles,srZones.length,izones.length,tf]);

  // ── RSI PANEL ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if (!showRSI||!candles.length) return;
    const cvs=rsiRef.current; if(!cvs) return;
    const ctx=cvs.getContext("2d"); const W=cvs.width,H=cvs.height;
    ctx.clearRect(0,0,W,H);
    const PL=72, PR=8, PT=6, PB=16;
    const cW=W-PL-PR, cH=H-PT-PB;
    const toX=i=>PL+(i/(candles.length-1||1))*cW;
    const toY=v=>PT+(1-v/100)*cH;

    ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
    // Separator line at top
    ctx.strokeStyle="#1f2937"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,0); ctx.stroke();
    // OB/OS shading
    ctx.fillStyle="rgba(239,68,68,0.08)"; ctx.fillRect(PL,toY(70),cW,toY(100)-toY(70));
    ctx.fillStyle="rgba(34,197,94,0.08)"; ctx.fillRect(PL,toY(30),cW,toY(0)-toY(30));
    // Reference lines
    [70,50,30].forEach(lv=>{
      ctx.strokeStyle=lv===50?"rgba(99,102,241,0.3)":"rgba(156,163,175,0.2)";
      ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(PL,toY(lv)); ctx.lineTo(W-PR,toY(lv)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=C.axisText; ctx.font="9px monospace"; ctx.textAlign="right";
      ctx.fillText(lv,PL-4,toY(lv)+3);
    });
    drawLine(ctx,rsi,toX,toY,C.rsiLine,1.5);
    // Current RSI value label
    const lastRSI=rsi.filter(v=>v!=null).slice(-1)[0];
    const rsiCol=lastRSI>=70?C.bear:lastRSI<=30?C.bull:C.rsiLine;
    ctx.fillStyle="#111827"; ctx.fillRect(PL,PT,55,13);
    ctx.fillStyle=rsiCol; ctx.font="bold 9px monospace"; ctx.textAlign="left";
    ctx.fillText(`RSI ${lastRSI!=null?lastRSI.toFixed(1):"—"}`,PL+4,PT+10);
  },[candles,showRSI,rsi]);

  // ── MACD PANEL ─────────────────────────────────────────────────────────
  useEffect(()=>{
    if (!showMACD||!candles.length) return;
    const cvs=macdRef.current; if(!cvs) return;
    const ctx=cvs.getContext("2d"); const W=cvs.width,H=cvs.height;
    ctx.clearRect(0,0,W,H);
    const PL=72, PR=8, PT=6, PB=16;
    const cW=W-PL-PR, cH=H-PT-PB;
    const {macd,signal,hist}=macdObj;
    const vals=[...macd,...signal,...hist].filter(v=>v!=null);
    if (!vals.length) return;
    const ext=Math.max(Math.abs(Math.min(...vals)),Math.abs(Math.max(...vals)))*1.2||1;
    const toX=i=>PL+(i/(candles.length-1||1))*cW;
    const toY=v=>PT+(1-(v+ext)/(ext*2))*cH;
    const zero=toY(0);

    ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="#1f2937"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,0); ctx.stroke();
    // Zero line
    ctx.strokeStyle="rgba(99,102,241,0.3)"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(PL,zero); ctx.lineTo(W-PR,zero); ctx.stroke(); ctx.setLineDash([]);
    // Axis label
    ctx.fillStyle=C.axisText; ctx.font="9px monospace"; ctx.textAlign="right";
    ctx.fillText("0",PL-4,zero+3);
    // Histogram
    const bw=Math.max(1,(cW/candles.length)*0.7);
    hist.forEach((v,i)=>{
      if(v==null) return;
      ctx.fillStyle=v>=0?C.histBull:C.histBear;
      const y=Math.min(toY(v),zero), h=Math.max(1,Math.abs(toY(v)-zero));
      ctx.fillRect(toX(i)-bw/2,y,bw,h);
    });
    drawLine(ctx,macd,  toX,toY,C.macdLine,1.5);
    drawLine(ctx,signal,toX,toY,C.sigLine,  1.2);
    // Label
    const lM=macd.filter(v=>v!=null).slice(-1)[0];
    const lS=signal.filter(v=>v!=null).slice(-1)[0];
    ctx.fillStyle="#111827"; ctx.fillRect(PL,PT,130,13);
    ctx.fillStyle=C.axisText; ctx.font="bold 9px monospace"; ctx.textAlign="left";
    ctx.fillText(`MACD ${lM!=null?lM.toFixed(2):"—"}`,PL+4,PT+10);
    ctx.fillStyle=C.macdLine; ctx.fillRect(PL+70,PT+2,14,3);
    ctx.fillStyle=C.sigLine;  ctx.fillRect(PL+90,PT+2,14,3);
  },[candles,showMACD,macdObj]);

  // ── Tooltip ─────────────────────────────────────────────────────────────
  const handleMouseMove=useCallback((e)=>{
    const p=dpRef.current; if(!p||!candles.length) return;
    const rect=mainRef.current.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(mainRef.current.width/rect.width);
    const my=(e.clientY-rect.top)*(mainRef.current.height/rect.height);

    for (const z of p.izones) {
      const yT=p.toY(z.top),yB=p.toY(z.bottom);
      if (mx>=p.PL&&mx<=p.W-p.PR&&my>=yT&&my<=yB) {
        const col=z.active?(z.type.includes("LONG")?C.actL:C.actS):C.intL;
        setTooltip({x:e.clientX,y:e.clientY,lines:z.tooltip.split("\n"),color:col}); return;
      }
    }
    for (const z of p.srZones) {
      const yT=p.toY(z.top),yB=p.toY(z.bottom);
      if (mx>=p.PL&&mx<=p.W-p.PR&&my>=yT&&my<=yB) {
        setTooltip({x:e.clientX,y:e.clientY,color:z.type==="R"?C.bear:C.bull,
          lines:[`${z.type==="R"?"Resistance":"Support"} Zone`,
                 `Level: ${fmtP(z.mid)}`,
                 `Touches: ${z.touches}`]}); return;
      }
    }
    const idx=Math.round((mx-p.PL)/p.cW*(candles.length-1));
    if (idx>=0&&idx<candles.length) {
      const c=candles[idx];
      setTooltip({x:e.clientX,y:e.clientY,color:c.close>=c.open?C.bull:C.bear, lines:[
        fmtT(c.time,tf),
        `O: ${fmtP(c.open)}  H: ${fmtP(c.high)}`,
        `L: ${fmtP(c.low)}   C: ${fmtP(c.close)}`,
        `Vol: ${(c.volume/1000).toFixed(1)}K`,
        rsi[idx]!=null?`RSI: ${rsi[idx].toFixed(1)}`:"",
      ].filter(Boolean)});
    }
  },[candles,srZones,izones,tf,rsi]);

  // ── Regime badge style ───────────────────────────────────────────────────
  const regCls={
    TRENDING_UP:  "bg-green-500/20 text-green-400 border-green-500/30",
    TRENDING_DOWN:"bg-red-500/20 text-red-400 border-red-500/30",
    COMPRESSION:  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    EXPANSION:    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CHOP:         "bg-gray-500/20 text-gray-400 border-gray-500/30",
  }[regime]||"bg-gray-500/20 text-gray-400 border-gray-500/30";

  const SUB_H=72;

  return (
    <div style={{background:C.bg,borderRadius:10,padding:"12px 12px 10px",position:"relative"}}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-extrabold text-bright">{symbol}</span>
          {lastC && <span className="font-mono font-bold text-bright">{fmtP(lastC.close)}</span>}
          {change!=null && (
            <span className={`text-xs font-bold ${change>=0?"text-green-400":"text-red-400"}`}>
              {change>=0?"+":""}{change.toFixed(3)}%
            </span>
          )}
          {regime && <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase border ${regCls}`}>{regime.replace("_"," ")}</span>}
        </div>
        {/* Symbol buttons */}
        <div className="flex gap-1 flex-wrap">
          {SYMBOLS.map(s=>(
            <button key={s} onClick={()=>setSymbol(s)}
              className={`text-xs px-2 py-1 rounded font-bold transition-colors ${symbol===s?"bg-accent text-black":"bg-border/50 text-muted hover:text-bright"}`}>
              {s.replace("USDT","")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeframe + Indicator toggles ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex gap-1 flex-wrap items-center">
          {TIMEFRAMES.map(t=>(
            <button key={t.value} onClick={()=>setTf(t.value)}
              className={`text-xs px-2 py-1 rounded font-bold transition-colors ${
                tf===t.value?"bg-indigo-600 text-white":"bg-border/40 text-muted hover:text-bright"}`}>
              {t.label}
            </button>
          ))}
          <span className="text-border mx-1">|</span>
          <button onClick={()=>setShowRSI(v=>!v)}
            className={`text-xs px-2.5 py-1 rounded font-bold transition-colors ${showRSI?"text-sky-300 border border-sky-700 bg-sky-900/30":"text-muted border border-border"}`}>
            RSI
          </button>
          <button onClick={()=>setShowMACD(v=>!v)}
            className={`text-xs px-2.5 py-1 rounded font-bold transition-colors ${showMACD?"text-indigo-300 border border-indigo-700 bg-indigo-900/30":"text-muted border border-border"}`}>
            MACD
          </button>
        </div>
        {/* Compact legend */}
        <div className="flex gap-3 text-xs flex-wrap items-center">
          <span><span style={{color:C.ma9}}>●</span> <span className="text-muted">MA9</span></span>
          <span><span style={{color:C.ma21}}>●</span> <span className="text-muted">MA21</span></span>
          <span><span style={{color:C.ma50}}>●</span> <span className="text-muted">MA50</span></span>
          <span><span style={{color:C.ma200,fontWeight:"bold",fontSize:14}}>━</span> <span className="text-muted">MA200</span></span>
          <span><span style={{color:C.supLine}}>█</span> <span className="text-muted">Sup</span></span>
          <span><span style={{color:C.resLine}}>█</span> <span className="text-muted">Res</span></span>
          <span><span style={{color:C.intL}}>⚡</span> <span className="text-muted">Zone</span></span>
        </div>
      </div>

      {/* ── Chart canvases ── */}
      {candles.length===0 ? (
        <div style={{height:400,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div className="text-center text-muted">
            <div className="text-3xl mb-2">📊</div>
            Loading {symbol} {tf} candles...
          </div>
        </div>
      ) : (
        <div style={{position:"relative"}}>
          <canvas ref={mainRef} width={920} height={400}
            style={{width:"100%",height:"400px",display:"block",borderRadius:6,cursor:"crosshair"}}
            onMouseMove={handleMouseMove} onMouseLeave={()=>setTooltip(null)}/>

          {showRSI && (
            <canvas ref={rsiRef} width={920} height={SUB_H}
              style={{width:"100%",height:`${SUB_H}px`,display:"block",marginTop:3,borderRadius:4}}/>
          )}
          {showMACD && (
            <canvas ref={macdRef} width={920} height={SUB_H}
              style={{width:"100%",height:`${SUB_H}px`,display:"block",marginTop:3,borderRadius:4}}/>
          )}

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position:"fixed",left:tooltip.x+16,top:tooltip.y-8,
              background:"#0f1923",border:`1px solid ${tooltip.color}44`,
              borderLeft:`3px solid ${tooltip.color}`,
              borderRadius:6,padding:"7px 12px",zIndex:9999,pointerEvents:"none",
              minWidth:160,boxShadow:"0 8px 32px rgba(0,0,0,0.7)"}}>
              {tooltip.lines.map((l,i)=>(
                <div key={i} style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",lineHeight:"1.75",
                  color:i===0?tooltip.color:"#9ca3af",fontWeight:i===0?"700":"400"}}>{l}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Interest zone pill summary ── */}
      {izones.length>0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {izones.map((z,i)=>{
            const col=z.active?(z.type.includes("LONG")?C.actL:C.actS):C.intL;
            return (
              <div key={i} style={{background:`${col}12`,border:`1px solid ${col}55`,
                borderRadius:5,padding:"3px 10px",fontSize:11,fontFamily:"monospace",
                display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:col,fontWeight:"bold"}}>{z.label}</span>
                <span style={{color:"#6b7280"}}>{fmtP(z.price)}</span>
                {z.active&&<span style={{color:col,fontSize:9,opacity:0.8}}>● LIVE</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}