import React, { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "../../store/useStore";

const SYMBOLS = ["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"];
const TIMEFRAMES = [
  { label:"1m",  value:"1m",  binance:"1m"  },
  { label:"5m",  value:"5m",  binance:"5m"  },
  { label:"15m", value:"15m", binance:"15m" },
  { label:"1H",  value:"1h",  binance:"1h"  },
  { label:"4H",  value:"4h",  binance:"4h"  },
  { label:"1W",  value:"1w",  binance:"1w"  },
  { label:"1M",  value:"1M",  binance:"1M"  },
];

// ── Math ──────────────────────────────────────────────────────────────────────
function sma(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

function bollingerBands(closes, period = 20, mult = 2) {
  const mid = sma(closes, period);
  return mid.map((m, i) => {
    if (m === null) return { upper: null, mid: null, lower: null };
    const slice = closes.slice(i - period + 1, i + 1);
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - m) ** 2, 0) / period);
    return { upper: m + mult * std, mid: m, lower: m - mult * std };
  });
}

// S/R zones: cluster swing points into price bands (±0.4% tolerance)
function findSRZones(candles, lookback = 80) {
  const recent = candles.slice(-lookback);
  const rawLevels = [];

  for (let i = 2; i < recent.length - 2; i++) {
    const c = recent[i];
    const isSwingHigh = c.high > recent[i-1].high && c.high > recent[i-2].high &&
                        c.high > recent[i+1].high && c.high > recent[i+2].high;
    const isSwingLow  = c.low  < recent[i-1].low  && c.low  < recent[i-2].low  &&
                        c.low  < recent[i+1].low   && c.low  < recent[i+2].low;
    if (isSwingHigh) rawLevels.push({ price: c.high, type: "R", touches: 1 });
    if (isSwingLow)  rawLevels.push({ price: c.low,  type: "S", touches: 1 });
  }

  // Cluster into zones (0.4% tolerance)
  const tolerance = 0.004;
  const zones = [];
  rawLevels.sort((a, b) => a.price - b.price);

  for (const lv of rawLevels) {
    const existing = zones.find(z =>
      z.type === lv.type &&
      Math.abs(z.midPrice - lv.price) / lv.price < tolerance
    );
    if (existing) {
      existing.prices.push(lv.price);
      existing.midPrice = existing.prices.reduce((a,b)=>a+b,0) / existing.prices.length;
      existing.touches++;
      existing.top    = Math.max(...existing.prices) * 1.001;
      existing.bottom = Math.min(...existing.prices) * 0.999;
    } else {
      zones.push({
        type: lv.type,
        midPrice: lv.price,
        top: lv.price * 1.002,
        bottom: lv.price * 0.998,
        prices: [lv.price],
        touches: 1,
      });
    }
  }

  // Strength = touches. Keep top 6 S and 6 R zones
  const support    = zones.filter(z => z.type === "S").sort((a,b) => b.touches - a.touches).slice(0, 6);
  const resistance = zones.filter(z => z.type === "R").sort((a,b) => b.touches - a.touches).slice(0, 6);
  return [...support, ...resistance];
}

// Interest zones: areas where signal factors align but price hasn't reached yet
function buildInterestZones(candles, signals, symbol) {
  const sig = signals.find(s => (s.asset || s.symbol) === symbol);
  if (!sig) return [];

  const zones = [];
  const last  = candles[candles.length - 1];
  if (!last) return [];

  const liquidity = sig.context?.liquidity;
  const atr = sig.context?.volatility?.atr || (last.close * 0.005);
  const regime = sig.context?.regime?.type || sig.regime;

  // Buy-side liquidity pools → potential LONG entry zones
  if (liquidity?.buySide) {
    liquidity.buySide.slice(0, 3).forEach(zone => {
      if (zone.price < last.close) {
        zones.push({
          type: "INTEREST_LONG",
          price: zone.price,
          top: zone.price + atr * 0.5,
          bottom: zone.price - atr * 0.3,
          label: "⚡ LONG Zone",
          tooltip: `Price pullback to ${zone.price.toFixed(2)} — potential LONG entry\nRegime: ${regime}\nLiquidity pool at this level`,
          strength: zone.strength || 1,
          active: false,
        });
      }
    });
  }

  // Sell-side liquidity pools → potential SHORT entry zones
  if (liquidity?.sellSide) {
    liquidity.sellSide.slice(0, 3).forEach(zone => {
      if (zone.price > last.close) {
        zones.push({
          type: "INTEREST_SHORT",
          price: zone.price,
          top: zone.price + atr * 0.3,
          bottom: zone.price - atr * 0.5,
          label: "⚡ SHORT Zone",
          tooltip: `Price rally to ${zone.price.toFixed(2)} — potential SHORT entry\nRegime: ${regime}\nLiquidity pool at this level`,
          strength: zone.strength || 1,
          active: false,
        });
      }
    });
  }

  // If signal is active TRADE, mark it as active
  const action = sig.signal?.action || sig.action;
  const direction = sig.signal?.direction || sig.direction;
  if (action === "TRADE" || action === "WATCH") {
    const entry = sig.signal?.tradePlan?.entry || last.close;
    zones.push({
      type: direction === "LONG" ? "ACTIVE_LONG" : "ACTIVE_SHORT",
      price: entry,
      top: entry + atr * 0.3,
      bottom: entry - atr * 0.3,
      label: `🔥 ${action} ${direction}`,
      tooltip: `Score: ${sig.signal?.score || 0}\nEntry: ${entry.toFixed(2)}\nSL: ${sig.signal?.tradePlan?.stopLoss?.toFixed(2) || "—"}\nTP: ${sig.signal?.tradePlan?.takeProfit?.toFixed(2) || "—"}`,
      strength: 3,
      active: true,
    });
  }

  return zones;
}

function fmtPrice(p) {
  if (!p) return "—";
  return p > 100 ? p.toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2})
                 : p.toFixed(6);
}

function fmtTime(ts, tf) {
  const d = new Date(ts);
  if (["1w","1M"].includes(tf)) return `${d.getDate()}/${d.getMonth()+1}`;
  if (["4h","1h"].includes(tf)) return `${d.getDate()} ${d.getHours()}h`;
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TradingChart() {
  const { candles: allCandles, loadCandles, signals } = useStore();
  const [symbol, setSymbol]   = useState("BTCUSDT");
  const [tf, setTf]           = useState("1h");
  const [tooltip, setTooltip] = useState(null); // {x,y,lines[]}
  const canvasRef = useRef(null);
  const overlayRef = useRef(null); // for mouse events

  const cacheKey = `${symbol}_${tf}`;
  const rawCandles = allCandles[cacheKey] || [];
  const candles = rawCandles.slice(-120);

  // Load candles when symbol or tf changes
  useEffect(() => {
    loadCandles(symbol, tf);
  }, [symbol, tf]);

  const sigData  = signals.find(s => (s.asset || s.symbol) === symbol);
  const regime   = sigData?.context?.regime?.type || sigData?.regime || null;
  const lastClose = candles.length ? candles[candles.length-1].close : null;
  const prevClose = candles.length > 1 ? candles[candles.length-2].close : null;
  const change = lastClose && prevClose ? ((lastClose-prevClose)/prevClose*100) : null;

  // Derived indicators (memoised on candle identity)
  const closes = candles.map(c => c.close);
  const ma9    = sma(closes, 9);
  const ma21   = sma(closes, 21);
  const ma50   = sma(closes, 50);
  const bb     = bollingerBands(closes, 20, 2);
  const srZones      = candles.length > 20 ? findSRZones(candles) : [];
  const interestZones = candles.length > 20 ? buildInterestZones(candles, signals, symbol) : [];

  // Store draw params for mouse hit-testing
  const drawParams = useRef(null);

  // ── Draw ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!candles.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const PAD_L=78, PAD_R=12, PAD_T=24, PAD_B=40;
    const chartW = W-PAD_L-PAD_R;
    const chartH = H-PAD_T-PAD_B;

    // Price range — include BB bands and all zones
    const allPrices = candles.flatMap(c => [c.high, c.low]);
    bb.forEach(b => { if (b.upper) allPrices.push(b.upper, b.lower); });
    srZones.forEach(z => allPrices.push(z.top, z.bottom));
    const minP = Math.min(...allPrices) * 0.9993;
    const maxP = Math.max(...allPrices) * 1.0007;
    const range = maxP - minP;

    const toX = i => PAD_L + (i/(candles.length-1||1))*chartW;
    const toY = p => PAD_T + (1-(p-minP)/range)*chartH;

    // Save for mouse hit-test
    drawParams.current = { PAD_L, PAD_R, PAD_T, PAD_B, chartW, chartH, W, H, minP, maxP, range, toX, toY, candles };

    // ── BG ──
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0,0,W,H);

    // ── Grid ──
    const gridRows = 8;
    for (let i=0; i<=gridRows; i++) {
      const y = PAD_T + (i/gridRows)*chartH;
      ctx.strokeStyle = "#1c2432";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(PAD_L,y); ctx.lineTo(W-PAD_R,y); ctx.stroke();
      const price = maxP-(i/gridRows)*range;
      ctx.fillStyle = "#4b5563";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(fmtPrice(price), PAD_L-4, y+3);
    }
    // Vertical grid lines
    const vStep = Math.ceil(candles.length/10);
    candles.forEach((c,i) => {
      if (i % vStep !== 0) return;
      const x = toX(i);
      ctx.strokeStyle = "#1c2432";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x,PAD_T); ctx.lineTo(x,PAD_T+chartH); ctx.stroke();
    });

    // ── S/R Zones (coloured bands) ──
    srZones.forEach(zone => {
      const yTop = toY(zone.top);
      const yBot = toY(zone.bottom);
      if (yTop > PAD_T+chartH || yBot < PAD_T) return;
      const isR = zone.type === "R";
      const alpha = Math.min(0.18, 0.06 + zone.touches * 0.04);
      ctx.fillStyle = isR ? `rgba(239,68,68,${alpha})` : `rgba(34,197,94,${alpha})`;
      ctx.fillRect(PAD_L, yTop, chartW, yBot-yTop);
      // Zone border line
      const midY = toY(zone.midPrice);
      ctx.setLineDash([3,3]);
      ctx.strokeStyle = isR ? `rgba(239,68,68,0.5)` : `rgba(34,197,94,0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD_L, midY); ctx.lineTo(W-PAD_R, midY); ctx.stroke();
      ctx.setLineDash([]);
      // Label on right
      ctx.fillStyle = isR ? "#ef4444" : "#22c55e";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      const label = `${isR?"R":"S"} (${zone.touches}x)`;
      ctx.fillText(label, W-PAD_R+2, midY+3);
    });

    // ── Interest / Signal zones ──
    interestZones.forEach(zone => {
      const yTop = toY(zone.top);
      const yBot = toY(zone.bottom);
      if (yTop > PAD_T+chartH || yBot < PAD_T) return;
      const isLong  = zone.type.includes("LONG");
      const isActive = zone.active;

      // Zone band
      const col = isActive
        ? (isLong ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)")
        : (isLong ? "rgba(251,191,36,0.12)" : "rgba(168,85,247,0.12)");
      ctx.fillStyle = col;
      ctx.fillRect(PAD_L, yTop, chartW, yBot-yTop);

      // Dashed midline
      const midY = toY(zone.price);
      ctx.setLineDash([6,3]);
      ctx.strokeStyle = isActive
        ? (isLong ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)")
        : (isLong ? "rgba(251,191,36,0.7)" : "rgba(168,85,247,0.7)");
      ctx.lineWidth = isActive ? 2 : 1.5;
      ctx.beginPath(); ctx.moveTo(PAD_L, midY); ctx.lineTo(W-PAD_R-60, midY); ctx.stroke();
      ctx.setLineDash([]);

      // Tag on right edge
      const tagColor = isActive
        ? (isLong ? "#22c55e" : "#ef4444")
        : (isLong ? "#fbbf24" : "#a855f7");
      ctx.fillStyle = tagColor;
      ctx.font = `bold ${isActive?10:9}px monospace`;
      ctx.textAlign = "right";
      ctx.fillText(zone.label, W-PAD_R-2, midY-3);
    });

    // ── BB ──
    // Shaded area
    ctx.beginPath();
    let firstBB = true;
    bb.forEach((b,i) => {
      if (!b.upper) return;
      if (firstBB) { ctx.moveTo(toX(i), toY(b.upper)); firstBB=false; }
      else ctx.lineTo(toX(i), toY(b.upper));
    });
    for (let i=bb.length-1; i>=0; i--) {
      if (bb[i].lower===null) continue;
      ctx.lineTo(toX(i), toY(bb[i].lower));
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(99,102,241,0.06)";
    ctx.fill();
    // Lines
    [
      [bb.map(b=>b.upper), "rgba(99,102,241,0.55)", [3,3]],
      [bb.map(b=>b.lower), "rgba(99,102,241,0.55)", [3,3]],
      [bb.map(b=>b.mid),   "rgba(99,102,241,0.30)", [5,3]],
    ].forEach(([vals,col,dash]) => {
      ctx.beginPath(); ctx.strokeStyle=col; ctx.lineWidth=1; ctx.setLineDash(dash);
      let st=false;
      vals.forEach((v,i) => { if(v===null){st=false;return;} if(!st){ctx.moveTo(toX(i),toY(v));st=true;}else ctx.lineTo(toX(i),toY(v)); });
      ctx.stroke(); ctx.setLineDash([]);
    });

    // ── MAs ──
    [[ma9,"#f59e0b",1.5],[ma21,"#3b82f6",1.5],[ma50,"#a855f7",2]].forEach(([vals,col,lw]) => {
      ctx.beginPath(); ctx.strokeStyle=col; ctx.lineWidth=lw;
      let st=false;
      vals.forEach((v,i) => { if(v===null){st=false;return;} if(!st){ctx.moveTo(toX(i),toY(v));st=true;}else ctx.lineTo(toX(i),toY(v)); });
      ctx.stroke();
    });

    // ── Candlesticks ──
    const candleW = Math.max(2, (chartW/candles.length)*0.72);
    candles.forEach((c,i) => {
      const x=toX(i), bull=c.close>=c.open;
      ctx.strokeStyle = bull ? "#22c55e" : "#ef4444";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x,toY(c.high)); ctx.lineTo(x,toY(c.low)); ctx.stroke();
      const bt=toY(Math.max(c.open,c.close)), bb2=toY(Math.min(c.open,c.close));
      ctx.fillStyle = bull ? "rgba(34,197,94,0.88)" : "rgba(239,68,68,0.88)";
      ctx.fillRect(x-candleW/2, bt, candleW, Math.max(1,bb2-bt));
    });

    // ── Signal markers on candles (active signals) ──
    interestZones.filter(z=>z.active).forEach(zone => {
      const isLong = zone.type.includes("LONG");
      const y = toY(zone.price);
      const x = toX(candles.length - 1);
      // Triangle marker
      ctx.fillStyle = isLong ? "#22c55e" : "#ef4444";
      ctx.beginPath();
      if (isLong) {
        ctx.moveTo(x, y+14); ctx.lineTo(x-8, y+26); ctx.lineTo(x+8, y+26);
      } else {
        ctx.moveTo(x, y-14); ctx.lineTo(x-8, y-26); ctx.lineTo(x+8, y-26);
      }
      ctx.closePath(); ctx.fill();
    });

    // ── X-axis labels ──
    ctx.fillStyle = "#4b5563";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    candles.forEach((c,i) => {
      if (i % vStep !== 0) return;
      ctx.fillText(fmtTime(c.time, tf), toX(i), H-8);
    });

    // ── Current price line ──
    if (lastClose) {
      const y = toY(lastClose);
      ctx.setLineDash([4,4]);
      ctx.strokeStyle = "rgba(249,250,251,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD_L,y); ctx.lineTo(W-PAD_R,y); ctx.stroke();
      ctx.setLineDash([]);
      // Price tag
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(W-PAD_R-52, y-9, 52, 16);
      ctx.fillStyle = "#f9fafb";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(fmtPrice(lastClose), W-PAD_R-2, y+4);
    }

  }, [candles, srZones.length, interestZones.length, tf]);

  // ── Mouse tooltip ─────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const p = drawParams.current;
    if (!p || !candles.length) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;

    // Check interest zone hover
    for (const zone of interestZones) {
      const yTop = p.toY(zone.top);
      const yBot = p.toY(zone.bottom);
      if (mx >= p.PAD_L && mx <= p.W-p.PAD_R && my >= yTop && my <= yBot) {
        setTooltip({ x: e.clientX, y: e.clientY, lines: zone.tooltip.split("\n"), color: zone.active ? (zone.type.includes("LONG")?"#22c55e":"#ef4444") : "#fbbf24" });
        return;
      }
    }
    // Check S/R zone hover
    for (const zone of srZones) {
      const yTop = p.toY(zone.top);
      const yBot = p.toY(zone.bottom);
      if (mx >= p.PAD_L && mx <= p.W-p.PAD_R && my >= yTop && my <= yBot) {
        const lbl = zone.type==="R"?"Resistance Zone":"Support Zone";
        setTooltip({ x: e.clientX, y: e.clientY, lines: [`${lbl}`, `Mid: ${fmtPrice(zone.midPrice)}`, `Touches: ${zone.touches}`], color: zone.type==="R"?"#ef4444":"#22c55e" });
        return;
      }
    }
    // Candle crosshair
    const idx = Math.round((mx - p.PAD_L) / p.chartW * (candles.length-1));
    if (idx >= 0 && idx < candles.length) {
      const c = candles[idx];
      setTooltip({ x: e.clientX, y: e.clientY, lines: [
        fmtTime(c.time, tf),
        `O: ${fmtPrice(c.open)}`,
        `H: ${fmtPrice(c.high)}`,
        `L: ${fmtPrice(c.low)}`,
        `C: ${fmtPrice(c.close)}`,
        `Vol: ${(c.volume/1000).toFixed(1)}K`,
      ], color: c.close >= c.open ? "#22c55e" : "#ef4444" });
    }
  }, [candles, srZones, interestZones, tf]);

  const handleMouseLeave = () => setTooltip(null);

  // ── Regime colour ────────────────────────────────────────────────────────
  const regimeStyle = {
    TRENDING_UP:   "bg-green-500/20 text-green-400 border-green-500/30",
    TRENDING_DOWN: "bg-red-500/20 text-red-400 border-red-500/30",
    COMPRESSION:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    EXPANSION:     "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CHOP:          "bg-gray-500/20 text-gray-400 border-gray-500/30",
  }[regime] || "bg-gray-500/20 text-gray-400 border-gray-500/30";

  return (
    <div style={{ background:"#0d1117", borderRadius:8, padding:12, position:"relative" }}>

      {/* ── Row 1: title + price + regime ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-extrabold text-bright">📈 {symbol}</span>
          {lastClose && (
            <span className="text-base font-mono font-bold text-bright">{fmtPrice(lastClose)}</span>
          )}
          {change !== null && (
            <span className={`text-xs font-bold ${change>=0?"text-green-400":"text-red-400"}`}>
              {change>=0?"+":""}{change.toFixed(3)}%
            </span>
          )}
          {regime && (
            <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase border ${regimeStyle}`}>
              {regime.replace("_"," ")}
            </span>
          )}
        </div>

        {/* Symbol buttons */}
        <div className="flex gap-1 flex-wrap">
          {SYMBOLS.map(s => (
            <button key={s} onClick={()=>setSymbol(s)}
              className={`text-xs px-2 py-1 rounded font-bold transition-colors ${
                symbol===s ? "bg-accent text-black" : "bg-border/50 text-muted hover:text-bright"
              }`}>{s.replace("USDT","")}</button>
          ))}
        </div>
      </div>

      {/* ── Row 2: timeframes + legend ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        {/* Timeframe buttons */}
        <div className="flex gap-1">
          {TIMEFRAMES.map(t => (
            <button key={t.value} onClick={()=>setTf(t.value)}
              className={`text-xs px-2.5 py-1 rounded font-bold transition-colors ${
                tf===t.value
                  ? "bg-indigo-600 text-white"
                  : "bg-border/40 text-muted hover:text-bright hover:bg-border/70"
              }`}>{t.label}</button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-3 text-xs flex-wrap">
          <span style={{color:"#f59e0b"}}>● MA9</span>
          <span style={{color:"#3b82f6"}}>● MA21</span>
          <span style={{color:"#a855f7"}}>● MA50</span>
          <span style={{color:"rgba(99,102,241,0.9)"}}>▬ BB(20)</span>
          <span style={{color:"rgba(34,197,94,0.8)"}}>▪ Support</span>
          <span style={{color:"rgba(239,68,68,0.8)"}}>▪ Resistance</span>
          <span style={{color:"#fbbf24"}}>⚡ Interest</span>
          <span style={{color:"#22c55e"}}>🔥 Signal</span>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{position:"relative"}}>
        {candles.length === 0 ? (
          <div className="flex items-center justify-center text-muted text-sm" style={{height:380}}>
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              Loading {symbol} {tf} candles...
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={900}
            height={400}
            style={{width:"100%",height:"400px",display:"block",borderRadius:6,cursor:"crosshair"}}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        )}

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position:"fixed",
            left: tooltip.x+14,
            top:  tooltip.y-10,
            background:"#1f2937",
            border:`1px solid ${tooltip.color}`,
            borderRadius:6,
            padding:"6px 10px",
            zIndex:9999,
            pointerEvents:"none",
            minWidth:140,
            boxShadow:"0 4px 20px rgba(0,0,0,0.5)"
          }}>
            {tooltip.lines.map((l,i) => (
              <div key={i} style={{
                fontSize:11,
                fontFamily:"monospace",
                color: i===0 ? tooltip.color : "#d1d5db",
                fontWeight: i===0 ? "bold" : "normal",
                lineHeight:"1.6",
              }}>{l}</div>
            ))}
          </div>
        )}
      </div>

      {/* ── Interest zone summary below chart ── */}
      {interestZones.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {interestZones.map((z,i) => {
            const isLong  = z.type.includes("LONG");
            const isActive = z.active;
            return (
              <div key={i} style={{
                background: isActive
                  ? (isLong?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)")
                  : "rgba(251,191,36,0.08)",
                border: `1px solid ${isActive?(isLong?"#22c55e":"#ef4444"):"#fbbf24"}`,
                borderRadius:6, padding:"4px 10px",
                fontSize:11, fontFamily:"monospace",
              }}>
                <span style={{color: isActive?(isLong?"#22c55e":"#ef4444"):"#fbbf24", fontWeight:"bold"}}>
                  {z.label}
                </span>
                <span style={{color:"#6b7280", marginLeft:6}}>{fmtPrice(z.price)}</span>
                {isActive && <span style={{color:"#6b7280", marginLeft:6}}>ACTIVE</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}