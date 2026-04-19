import React, { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "../../store/useStore";

const SYMBOLS    = ["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"];
const TIMEFRAMES = [
  { label:"1m",  value:"1m"  },
  { label:"5m",  value:"5m"  },
  { label:"15m", value:"15m" },
  { label:"1H",  value:"1h"  },
  { label:"4H",  value:"4h"  },
  { label:"1W",  value:"1w"  },
  { label:"1M",  value:"1M"  },
];

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  bg:        "#0b0e14",
  bgPanel:   "#111827",
  grid:      "#1a2130",
  gridLight: "#151c28",
  text:      "#4b5563",
  textBr:    "#9ca3af",
  bull:      "#26a69a",
  bullFill:  "rgba(38,166,154,0.85)",
  bear:      "#ef5350",
  bearFill:  "rgba(239,83,80,0.85)",
  ma9:       "#f59e0b",
  ma21:      "#3b82f6",
  ma50:      "#a855f7",
  ma200:     "#eab308",
  bbUpper:   "rgba(99,102,241,0.7)",
  bbLower:   "rgba(99,102,241,0.7)",
  bbMid:     "rgba(99,102,241,0.35)",
  bbFill:    "rgba(99,102,241,0.05)",
  srS:       { fill:"rgba(34,197,94,{a})", line:"#22c55e", text:"#22c55e" },
  srR:       { fill:"rgba(239,68,68,{a})",  line:"#ef4444", text:"#ef4444" },
  intLong:   "#fbbf24",
  intShort:  "#a855f7",
  actLong:   "#22c55e",
  actShort:  "#ef4444",
  price:     "#f9fafb",
  rsiLine:   "#38bdf8",
  rsiOB:     "rgba(239,68,68,0.15)",
  rsiOS:     "rgba(34,197,94,0.15)",
  macdLine:  "#3b82f6",
  sigLine:   "#f59e0b",
  macdBull:  "rgba(38,166,154,0.7)",
  macdBear:  "rgba(239,83,80,0.7)",
};

// ── Math helpers ──────────────────────────────────────────────────────────────
function sma(data, p) {
  return data.map((_,i) => i < p-1 ? null
    : data.slice(i-p+1,i+1).reduce((a,b)=>a+b,0)/p);
}
function emaArr(data, p) {
  const k = 2/(p+1); const out = new Array(data.length).fill(null);
  let val = null;
  for (let i=0;i<data.length;i++) {
    if (data[i]==null) continue;
    val = val===null ? data[i] : data[i]*k + val*(1-k);
    out[i] = val;
  }
  return out;
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
  const out = new Array(closes.length).fill(null);
  if (closes.length < period+1) return out;
  let gains=0, losses=0;
  for (let i=1;i<=period;i++) {
    const d = closes[i]-closes[i-1];
    if (d>0) gains+=d; else losses-=d;
  }
  let avgG = gains/period, avgL = losses/period;
  out[period] = 100 - 100/(1+avgG/(avgL||0.001));
  for (let i=period+1;i<closes.length;i++) {
    const d = closes[i]-closes[i-1];
    avgG = (avgG*(period-1)+(d>0?d:0))/period;
    avgL = (avgL*(period-1)+(d<0?-d:0))/period;
    out[i] = 100 - 100/(1+avgG/(avgL||0.001));
  }
  return out;
}
function calcMACD(closes, fast=12, slow=26, sig=9) {
  const eFast = emaArr(closes, fast);
  const eSlow = emaArr(closes, slow);
  const macd  = closes.map((_,i) => eFast[i]!=null&&eSlow[i]!=null ? eFast[i]-eSlow[i] : null);
  const signal= emaArr(macd.map(v=>v??0), sig);
  const hist  = macd.map((v,i) => v!=null&&signal[i]!=null ? v-signal[i] : null);
  return {macd, signal, hist};
}

// S/R zone clustering
function findSRZones(candles, lookback=100) {
  const recent = candles.slice(-lookback);
  const raw = [];
  for (let i=3;i<recent.length-3;i++) {
    const c=recent[i];
    const isH = c.high>recent[i-1].high&&c.high>recent[i-2].high&&c.high>recent[i-3].high&&
                c.high>recent[i+1].high&&c.high>recent[i+2].high&&c.high>recent[i+3].high;
    const isL = c.low<recent[i-1].low&&c.low<recent[i-2].low&&c.low<recent[i-3].low&&
                c.low<recent[i+1].low&&c.low<recent[i+2].low&&c.low<recent[i+3].low;
    if (isH) raw.push({price:c.high, type:"R", touches:1});
    if (isL) raw.push({price:c.low,  type:"S", touches:1});
  }
  raw.sort((a,b)=>a.price-b.price);
  const tol = 0.005;
  const zones = [];
  for (const lv of raw) {
    const ex = zones.find(z=>z.type===lv.type&&Math.abs(z.mid-lv.price)/lv.price<tol);
    if (ex) {
      ex.prices.push(lv.price);
      ex.mid    = ex.prices.reduce((a,b)=>a+b,0)/ex.prices.length;
      ex.top    = Math.max(...ex.prices)*1.0015;
      ex.bottom = Math.min(...ex.prices)*0.9985;
      ex.touches++;
    } else {
      zones.push({type:lv.type, mid:lv.price, top:lv.price*1.002, bottom:lv.price*0.998,
                  prices:[lv.price], touches:1});
    }
  }
  const S = zones.filter(z=>z.type==="S").sort((a,b)=>b.touches-a.touches).slice(0,5);
  const R = zones.filter(z=>z.type==="R").sort((a,b)=>b.touches-a.touches).slice(0,5);
  return [...S,...R];
}

function buildInterestZones(candles, signals, symbol) {
  const sig = signals.find(s=>(s.asset||s.symbol)===symbol);
  if (!sig||!candles.length) return [];
  const zones=[], last=candles[candles.length-1];
  const liquidity=sig.context?.liquidity;
  const atr=sig.context?.volatility?.atr||(last.close*0.005);
  const regime=sig.context?.regime?.type||sig.regime;

  liquidity?.buySide?.slice(0,2).forEach(z=>{
    if (z.price<last.close) zones.push({
      type:"INTEREST_LONG", price:z.price,
      top:z.price+atr*0.5, bottom:z.price-atr*0.3,
      label:"⚡ LONG", active:false,
      tooltip:`Pullback to ${z.price.toFixed(2)}\nRegime: ${regime}\nLiquidity pool`
    });
  });
  liquidity?.sellSide?.slice(0,2).forEach(z=>{
    if (z.price>last.close) zones.push({
      type:"INTEREST_SHORT", price:z.price,
      top:z.price+atr*0.3, bottom:z.price-atr*0.5,
      label:"⚡ SHORT", active:false,
      tooltip:`Rally to ${z.price.toFixed(2)}\nRegime: ${regime}\nLiquidity pool`
    });
  });
  const action=sig.signal?.action||sig.action;
  const dir=sig.signal?.direction||sig.direction;
  if (action==="TRADE"||action==="WATCH") {
    const entry=sig.signal?.tradePlan?.entry||last.close;
    const sl=sig.signal?.tradePlan?.stopLoss;
    const tp=sig.signal?.tradePlan?.takeProfit;
    const rr=sig.signal?.tradePlan?.riskReward;
    zones.push({
      type:dir==="LONG"?"ACTIVE_LONG":"ACTIVE_SHORT",
      price:entry, top:entry+atr*0.35, bottom:entry-atr*0.35,
      label:`🔥 ${action} ${dir||""}`, active:true,
      tooltip:`Score: ${sig.signal?.score||0}\nEntry: ${fmtP(entry)}\nSL: ${fmtP(sl)}\nTP: ${fmtP(tp)}\nR:R ${rr||"—"}`
    });
  }
  return zones;
}

function fmtP(p) {
  if (!p&&p!==0) return "—";
  return p>100 ? p.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : p.toFixed(6);
}
function fmtT(ts,tf) {
  const d=new Date(ts);
  if (["1w","1M"].includes(tf)) return `${d.getDate()}/${d.getMonth()+1}`;
  if (["4h","1h"].includes(tf)) return `${d.getDate()} ${d.getHours()}h`;
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function drawLine(ctx, vals, toX, toY, color, lw, dash=[]) {
  ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=lw; ctx.setLineDash(dash);
  let st=false;
  vals.forEach((v,i)=>{ if(v==null){st=false;return;} if(!st){ctx.moveTo(toX(i),toY(v));st=true;}else ctx.lineTo(toX(i),toY(v)); });
  ctx.stroke(); ctx.setLineDash([]);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TradingChart() {
  const { candles:allCandles, loadCandles, signals } = useStore();
  const [symbol,  setSymbol]  = useState("BTCUSDT");
  const [tf,      setTf]      = useState("1h");
  const [tooltip, setTooltip] = useState(null);
  const [showRSI,  setShowRSI]  = useState(true);
  const [showMACD, setShowMACD] = useState(true);

  const mainRef = useRef(null);
  const rsiRef  = useRef(null);
  const macdRef = useRef(null);
  const dpRef   = useRef(null); // draw params for hit-test

  const cacheKey   = `${symbol}_${tf}`;
  const rawCandles = allCandles[cacheKey]||[];
  const candles    = rawCandles.slice(-150);

  useEffect(() => { loadCandles(symbol,tf); }, [symbol,tf]);

  const sigData  = signals.find(s=>(s.asset||s.symbol)===symbol);
  const regime   = sigData?.context?.regime?.type||sigData?.regime||null;
  const lastC    = candles.length ? candles[candles.length-1] : null;
  const prevC    = candles.length>1 ? candles[candles.length-2] : null;
  const change   = lastC&&prevC ? ((lastC.close-prevC.close)/prevC.close*100) : null;

  // Indicators
  const closes  = candles.map(c=>c.close);
  const ma9     = emaArr(closes,9);
  const ma21    = emaArr(closes,21);
  const ma50    = emaArr(closes,50);
  const ma200   = emaArr(closes,200);
  const bb      = bollingerBands(closes,20,2);
  const rsi     = calcRSI(closes,14);
  const macdObj = calcMACD(closes,12,26,9);
  const srZones = candles.length>30 ? findSRZones(candles) : [];
  const izones  = candles.length>30 ? buildInterestZones(candles,signals,symbol) : [];

  // ── Draw main chart ──────────────────────────────────────────────────────
  useEffect(()=>{
    if (!candles.length) return;
    const cvs=mainRef.current; if(!cvs) return;
    const ctx=cvs.getContext("2d");
    const W=cvs.width, H=cvs.height;
    ctx.clearRect(0,0,W,H);

    const PL=80, PR=70, PT=20, PB=28;
    const cW=W-PL-PR, cH=H-PT-PB;

    // Price range
    const prices=candles.flatMap(c=>[c.high,c.low]);
    bb.forEach(b=>{ if(b.upper) prices.push(b.upper,b.lower); });
    srZones.forEach(z=>prices.push(z.top,z.bottom));
    ma200.forEach(v=>{ if(v) prices.push(v); });
    const minP=Math.min(...prices)*0.9992;
    const maxP=Math.max(...prices)*1.0008;
    const rng=maxP-minP;

    const toX=i=>PL+(i/(candles.length-1||1))*cW;
    const toY=p=>PT+(1-(p-minP)/rng)*cH;
    dpRef.current={PL,PR,PT,PB,cW,cH,W,H,minP,maxP,rng,toX,toY,candles,srZones,izones};

    // BG
    ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);

    // Grid
    for(let i=0;i<=8;i++){
      const y=PT+(i/8)*cH;
      ctx.strokeStyle=C.grid; ctx.lineWidth=1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke();
      const price=maxP-(i/8)*rng;
      ctx.fillStyle=C.text; ctx.font="10px monospace"; ctx.textAlign="right";
      ctx.fillText(fmtP(price),PL-6,y+3);
    }
    const vStep=Math.ceil(candles.length/10);
    candles.forEach((_,i)=>{
      if(i%vStep!==0) return;
      ctx.strokeStyle=C.gridLight; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(toX(i),PT); ctx.lineTo(toX(i),PT+cH); ctx.stroke();
    });

    // ── S/R ZONES — bold, wide, highly visible ──
    srZones.forEach(zone=>{
      const yT=toY(zone.top), yB=toY(zone.bottom);
      if(yT>PT+cH||yB<PT) return;
      const isR=zone.type==="R";
      const strength=Math.min(0.28, 0.10+zone.touches*0.05);

      // Wide filled band
      ctx.fillStyle=isR?`rgba(239,68,68,${strength})`:`rgba(34,197,94,${strength})`;
      ctx.fillRect(PL,yT,cW,yB-yT);

      // Bold top & bottom border lines of the zone
      const borderCol=isR?"rgba(239,68,68,0.9)":"rgba(34,197,94,0.9)";
      ctx.strokeStyle=borderCol; ctx.lineWidth=2; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(PL,yT); ctx.lineTo(W-PR,yT); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PL,yB); ctx.lineTo(W-PR,yB); ctx.stroke();

      // Midline — bold solid
      const midY=toY(zone.mid);
      ctx.strokeStyle=isR?"rgba(239,68,68,0.6)":"rgba(34,197,94,0.6)";
      ctx.lineWidth=1.5; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.moveTo(PL,midY); ctx.lineTo(W-PR,midY); ctx.stroke();
      ctx.setLineDash([]);

      // Label pill on the right side axis
      const labelY=Math.max(PT+10, Math.min(PT+cH-6, midY));
      const label=`${isR?"R":"S"} ${zone.touches}×`;
      const lw=ctx.measureText(label).width+10;
      ctx.fillStyle=isR?"rgba(239,68,68,0.85)":"rgba(34,197,94,0.85)";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(W-PR+2,labelY-8,lw,16,3)
                    : ctx.fillRect(W-PR+2,labelY-8,lw,16);
      ctx.fill();
      ctx.fillStyle="#fff"; ctx.font="bold 9px monospace"; ctx.textAlign="left";
      ctx.fillText(label,W-PR+7,labelY+4);
    });

    // ── Interest zones ──
    izones.forEach(zone=>{
      const yT=toY(zone.top), yB=toY(zone.bottom);
      if(yT>PT+cH||yB<PT) return;
      const isLong=zone.type.includes("LONG");
      const isActive=zone.active;
      const col=isActive?(isLong?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)")
                        :(isLong?"rgba(251,191,36,0.10)":"rgba(168,85,247,0.10)");
      ctx.fillStyle=col; ctx.fillRect(PL,yT,cW,yB-yT);
      const midY=toY(zone.price);
      const lc=isActive?(isLong?"rgba(34,197,94,0.95)":"rgba(239,68,68,0.95)")
                       :(isLong?"rgba(251,191,36,0.85)":"rgba(168,85,247,0.85)");
      ctx.strokeStyle=lc; ctx.lineWidth=isActive?2:1.5; ctx.setLineDash([8,4]);
      ctx.beginPath(); ctx.moveTo(PL,midY); ctx.lineTo(W-PR,midY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=lc; ctx.font=`bold ${isActive?10:9}px monospace`; ctx.textAlign="right";
      ctx.fillText(zone.label,W-PR-4,midY-4);
    });

    // ── BB ──
    ctx.beginPath();
    let fbб=true;
    bb.forEach((b,i)=>{ if(!b.upper) return; if(fbб){ctx.moveTo(toX(i),toY(b.upper));fbб=false;}else ctx.lineTo(toX(i),toY(b.upper)); });
    for(let i=bb.length-1;i>=0;i--){ if(bb[i].lower==null) continue; ctx.lineTo(toX(i),toY(bb[i].lower)); }
    ctx.closePath(); ctx.fillStyle=C.bbFill; ctx.fill();
    drawLine(ctx,bb.map(b=>b.upper),toX,toY,C.bbUpper,1,[3,3]);
    drawLine(ctx,bb.map(b=>b.lower),toX,toY,C.bbLower,1,[3,3]);
    drawLine(ctx,bb.map(b=>b.mid),  toX,toY,C.bbMid,  1,[5,3]);

    // ── MAs — thinner ones first ──
    drawLine(ctx,ma9,  toX,toY,C.ma9, 1.2);
    drawLine(ctx,ma21, toX,toY,C.ma21,1.5);
    drawLine(ctx,ma50, toX,toY,C.ma50,2.0);
    // MA200 — thick, prominent, orange
    drawLine(ctx,ma200,toX,toY,C.ma200,3.5);

    // ── Candlesticks ──
    const cw=Math.max(2,(cW/candles.length)*0.72);
    candles.forEach((c,i)=>{
      const x=toX(i), bull=c.close>=c.open;
      ctx.strokeStyle=bull?C.bull:C.bear; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x,toY(c.high)); ctx.lineTo(x,toY(c.low)); ctx.stroke();
      const bt=toY(Math.max(c.open,c.close)), bh=Math.max(1,toY(Math.min(c.open,c.close))-bt);
      ctx.fillStyle=bull?C.bullFill:C.bearFill;
      ctx.fillRect(x-cw/2,bt,cw,bh);
    });

    // ── Signal arrow markers ──
    izones.filter(z=>z.active).forEach(zone=>{
      const isLong=zone.type.includes("LONG");
      const y=toY(zone.price), x=toX(candles.length-1);
      ctx.fillStyle=isLong?C.actLong:C.actShort;
      ctx.shadowColor=isLong?C.actLong:C.actShort; ctx.shadowBlur=8;
      ctx.beginPath();
      if(isLong){ ctx.moveTo(x,y+10);ctx.lineTo(x-9,y+25);ctx.lineTo(x+9,y+25); }
      else       { ctx.moveTo(x,y-10);ctx.lineTo(x-9,y-25);ctx.lineTo(x+9,y-25); }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur=0;
    });

    // ── X-axis labels ──
    ctx.fillStyle=C.text; ctx.font="9px monospace"; ctx.textAlign="center";
    candles.forEach((c,i)=>{ if(i%vStep!==0) return; ctx.fillText(fmtT(c.time,tf),toX(i),H-8); });

    // ── Current price tag ──
    if(lastC){
      const y=toY(lastC.close);
      ctx.setLineDash([3,3]); ctx.strokeStyle="rgba(249,250,251,0.3)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke(); ctx.setLineDash([]);
      // Tag box
      const tag=fmtP(lastC.close); const tw=ctx.measureText(tag).width+12;
      ctx.fillStyle=lastC.close>=(prevC?.close||0)?"#26a69a":"#ef5350";
      ctx.fillRect(W-PR,y-9,tw,18);
      ctx.fillStyle="#fff"; ctx.font="bold 10px monospace"; ctx.textAlign="left";
      ctx.fillText(tag,W-PR+6,y+4);
    }

    // ── MA200 legend badge ──
    ctx.fillStyle="rgba(249,115,22,0.15)";
    ctx.strokeStyle=C.ma200; ctx.lineWidth=2;
    const m200last=ma200.filter(v=>v!=null).slice(-1)[0];
    if(m200last){
      const y=toY(m200last);
      ctx.fillRect(PL+4,y-9,54,16);
      ctx.strokeRect(PL+4,y-9,54,16);
      ctx.fillStyle=C.ma200; ctx.font="bold 9px monospace"; ctx.textAlign="left";
      ctx.fillText(`MA200 ${fmtP(m200last)}`,PL+8,y+4);
    }

  },[candles,srZones.length,izones.length,tf,showRSI,showMACD]);

  // ── Draw RSI ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!showRSI||!candles.length) return;
    const cvs=rsiRef.current; if(!cvs) return;
    const ctx=cvs.getContext("2d"); const W=cvs.width,H=cvs.height;
    ctx.clearRect(0,0,W,H);
    const PL=80,PR=70,PT=8,PB=20;
    const cW=W-PL-PR, cH=H-PT-PB;
    const toX=i=>PL+(i/(candles.length-1||1))*cW;
    const toY=v=>PT+(1-(v-0)/100)*cH;

    ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
    // OB/OS bands
    ctx.fillStyle=C.rsiOB; ctx.fillRect(PL,toY(70),cW,toY(100)-toY(70));
    ctx.fillStyle=C.rsiOS; ctx.fillRect(PL,toY(30),cW,toY(0)-toY(30));
    // Lines at 70, 50, 30
    [70,50,30].forEach(lvl=>{
      ctx.strokeStyle=lvl===50?"rgba(99,102,241,0.4)":"rgba(156,163,175,0.25)";
      ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(PL,toY(lvl)); ctx.lineTo(W-PR,toY(lvl)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=C.text; ctx.font="9px monospace"; ctx.textAlign="right";
      ctx.fillText(lvl,PL-4,toY(lvl)+3);
    });
    // RSI line
    drawLine(ctx,rsi,toX,toY,C.rsiLine,1.5);
    // Label
    const lastRSI=rsi.filter(v=>v!=null).slice(-1)[0];
    ctx.fillStyle=C.textBr; ctx.font="bold 9px monospace"; ctx.textAlign="left";
    ctx.fillText(`RSI(14) ${lastRSI!=null?lastRSI.toFixed(1):"—"}`,PL+4,PT+10);
  },[candles,showRSI]);

  // ── Draw MACD ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!showMACD||!candles.length) return;
    const cvs=macdRef.current; if(!cvs) return;
    const ctx=cvs.getContext("2d"); const W=cvs.width,H=cvs.height;
    ctx.clearRect(0,0,W,H);
    const PL=80,PR=70,PT=8,PB=20;
    const cW=W-PL-PR, cH=H-PT-PB;

    const {macd,signal,hist}=macdObj;
    const vals=[...macd,...signal,...hist].filter(v=>v!=null);
    if(!vals.length) return;
    const minV=Math.min(...vals)*1.1, maxV=Math.max(...vals)*1.1;
    const rng=maxV-minV||1;

    const toX=i=>PL+(i/(candles.length-1||1))*cW;
    const toY=v=>PT+(1-(v-minV)/rng)*cH;
    const zero=toY(0);

    ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
    // Zero line
    ctx.strokeStyle="rgba(99,102,241,0.35)"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(PL,zero); ctx.lineTo(W-PR,zero); ctx.stroke(); ctx.setLineDash([]);
    // Histogram bars
    const bw=Math.max(1,(cW/candles.length)*0.7);
    hist.forEach((v,i)=>{
      if(v==null) return;
      ctx.fillStyle=v>=0?C.macdBull:C.macdBear;
      const y=Math.min(toY(v),zero), h=Math.abs(toY(v)-zero);
      ctx.fillRect(toX(i)-bw/2,y,bw,Math.max(1,h));
    });
    // MACD & Signal lines
    drawLine(ctx,macd,  toX,toY,C.macdLine,1.5);
    drawLine(ctx,signal,toX,toY,C.sigLine, 1.2);
    // Label
    const lastM=macd.filter(v=>v!=null).slice(-1)[0];
    const lastS=signal.filter(v=>v!=null).slice(-1)[0];
    ctx.fillStyle=C.textBr; ctx.font="bold 9px monospace"; ctx.textAlign="left";
    ctx.fillText(`MACD(12,26,9) ${lastM!=null?lastM.toFixed(2):"—"}  SIG ${lastS!=null?lastS.toFixed(2):"—"}`,PL+4,PT+10);
    ctx.fillStyle=C.macdLine; ctx.fillRect(PL+4,PT+14,20,2);
    ctx.fillStyle=C.sigLine;  ctx.fillRect(PL+30,PT+14,20,2);
  },[candles,showMACD]);

  // ── Mouse ─────────────────────────────────────────────────────────────────
  const handleMouseMove=useCallback((e)=>{
    const p=dpRef.current; if(!p||!candles.length) return;
    const rect=mainRef.current.getBoundingClientRect();
    const sx=mainRef.current.width/rect.width;
    const sy=mainRef.current.height/rect.height;
    const mx=(e.clientX-rect.left)*sx, my=(e.clientY-rect.top)*sy;

    for(const z of p.izones){
      const yT=p.toY(z.top),yB=p.toY(z.bottom);
      if(mx>=p.PL&&mx<=p.W-p.PR&&my>=yT&&my<=yB){
        const col=z.active?(z.type.includes("LONG")?C.actLong:C.actShort):C.intLong;
        setTooltip({x:e.clientX,y:e.clientY,lines:z.tooltip.split("\n"),color:col}); return;
      }
    }
    for(const z of p.srZones){
      const yT=p.toY(z.top),yB=p.toY(z.bottom);
      if(mx>=p.PL&&mx<=p.W-p.PR&&my>=yT&&my<=yB){
        const col=z.type==="R"?C.bear:C.bull;
        setTooltip({x:e.clientX,y:e.clientY,
          lines:[`${z.type==="R"?"Resistance":"Support"} Zone`,
                 `Mid: ${fmtP(z.mid)}`,`Range: ${fmtP(z.bottom)} – ${fmtP(z.top)}`,
                 `Strength: ${z.touches} touch${z.touches>1?"es":""}`],color:col}); return;
      }
    }
    const idx=Math.round((mx-p.PL)/p.cW*(candles.length-1));
    if(idx>=0&&idx<candles.length){
      const c=candles[idx];
      const bull=c.close>=c.open;
      setTooltip({x:e.clientX,y:e.clientY,lines:[
        fmtT(c.time,tf),
        `O: ${fmtP(c.open)}`,`H: ${fmtP(c.high)}`,
        `L: ${fmtP(c.low)}`, `C: ${fmtP(c.close)}`,
        `Vol: ${(c.volume/1000).toFixed(1)}K`,
        rsi[idx]!=null?`RSI: ${rsi[idx].toFixed(1)}`:"",
      ].filter(Boolean),color:bull?C.bull:C.bear});
    }
  },[candles,srZones,izones,tf,rsi]);

  // ── Regime badge ─────────────────────────────────────────────────────────
  const regCls={
    TRENDING_UP:  "bg-green-500/20 text-green-400 border-green-500/30",
    TRENDING_DOWN:"bg-red-500/20 text-red-400 border-red-500/30",
    COMPRESSION:  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    EXPANSION:    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CHOP:         "bg-gray-500/20 text-gray-400 border-gray-500/30",
  }[regime]||"bg-gray-500/20 text-gray-400 border-gray-500/30";

  const subH = 80; // height of RSI/MACD panels

  return (
    <div style={{background:C.bg,borderRadius:10,padding:12,position:"relative"}}>

      {/* ── Header row ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-extrabold" style={{color:C.price}}>📈 {symbol}</span>
          {lastC && <span className="text-base font-mono font-bold" style={{color:C.price}}>{fmtP(lastC.close)}</span>}
          {change!=null && <span className={`text-xs font-bold ${change>=0?"text-green-400":"text-red-400"}`}>{change>=0?"+":""}{change.toFixed(3)}%</span>}
          {regime && <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase border ${regCls}`}>{regime.replace("_"," ")}</span>}
        </div>
        <div className="flex gap-1 flex-wrap">
          {SYMBOLS.map(s=>(
            <button key={s} onClick={()=>setSymbol(s)}
              className={`text-xs px-2 py-1 rounded font-bold transition-colors ${symbol===s?"bg-accent text-black":"bg-border/50 text-muted hover:text-bright"}`}>
              {s.replace("USDT","")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeframe + toggles + legend ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex gap-1 flex-wrap">
          {TIMEFRAMES.map(t=>(
            <button key={t.value} onClick={()=>setTf(t.value)}
              className={`text-xs px-2.5 py-1 rounded font-bold transition-colors ${
                tf===t.value?"bg-indigo-600 text-white":"bg-border/40 text-muted hover:text-bright"}`}>
              {t.label}
            </button>
          ))}
          <div className="w-px bg-border mx-1"/>
          <button onClick={()=>setShowRSI(v=>!v)}
            className={`text-xs px-2.5 py-1 rounded font-bold transition-colors ${showRSI?"bg-sky-700 text-white":"bg-border/40 text-muted"}`}>
            RSI
          </button>
          <button onClick={()=>setShowMACD(v=>!v)}
            className={`text-xs px-2.5 py-1 rounded font-bold transition-colors ${showMACD?"bg-indigo-700 text-white":"bg-border/40 text-muted"}`}>
            MACD
          </button>
        </div>
        <div className="flex gap-3 text-xs flex-wrap">
          <span style={{color:C.ma9}}>● MA9</span>
          <span style={{color:C.ma21}}>● MA21</span>
          <span style={{color:C.ma50}}>● MA50</span>
          <span style={{color:C.ma200,fontWeight:"bold"}}>━ MA200</span>
          <span style={{color:"rgba(99,102,241,0.9)"}}>▬ BB</span>
          <span style={{color:C.srS.text}}>█ Support</span>
          <span style={{color:C.srR.text}}>█ Resist</span>
          <span style={{color:C.intLong}}>⚡ Interest</span>
          <span style={{color:C.actLong}}>🔥 Signal</span>
        </div>
      </div>

      {/* ── Canvases ── */}
      {candles.length===0 ? (
        <div style={{height:420,display:"flex",alignItems:"center",justifyContent:"center",color:C.text}}>
          <div className="text-center"><div className="text-3xl mb-2">📊</div>Loading {symbol} {tf}...</div>
        </div>
      ) : (
        <div style={{position:"relative"}}>
          {/* Main chart */}
          <canvas ref={mainRef} width={920} height={420}
            style={{width:"100%",height:"420px",display:"block",borderRadius:6,cursor:"crosshair"}}
            onMouseMove={handleMouseMove} onMouseLeave={()=>setTooltip(null)} />

          {/* RSI */}
          {showRSI && (
            <canvas ref={rsiRef} width={920} height={subH}
              style={{width:"100%",height:`${subH}px`,display:"block",marginTop:2,borderRadius:4}} />
          )}

          {/* MACD */}
          {showMACD && (
            <canvas ref={macdRef} width={920} height={subH}
              style={{width:"100%",height:`${subH}px`,display:"block",marginTop:2,borderRadius:4}} />
          )}

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position:"fixed",left:tooltip.x+14,top:tooltip.y-10,
              background:"#1a2130",border:`1px solid ${tooltip.color}`,
              borderRadius:8,padding:"8px 12px",zIndex:9999,pointerEvents:"none",
              minWidth:150,boxShadow:`0 4px 24px rgba(0,0,0,0.6), 0 0 12px ${tooltip.color}22`
            }}>
              {tooltip.lines.map((l,i)=>(
                <div key={i} style={{fontSize:11,fontFamily:"monospace",lineHeight:"1.7",
                  color:i===0?tooltip.color:"#d1d5db",fontWeight:i===0?"bold":"normal"}}>{l}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Interest zone pills ── */}
      {izones.length>0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {izones.map((z,i)=>{
            const isLong=z.type.includes("LONG"), isActive=z.active;
            const col=isActive?(isLong?C.actLong:C.actShort):C.intLong;
            return (
              <div key={i} style={{background:`${col}18`,border:`1px solid ${col}`,
                borderRadius:6,padding:"4px 10px",fontSize:11,fontFamily:"monospace"}}>
                <span style={{color:col,fontWeight:"bold"}}>{z.label}</span>
                <span style={{color:"#6b7280",marginLeft:6}}>{fmtP(z.price)}</span>
                {isActive&&<span style={{color:"#6b7280",marginLeft:6,fontSize:10}}>● LIVE</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}