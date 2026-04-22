import React, { useState, useEffect, useRef } from "react";
import TradeJournal from "../trade/TradeJournal";
import TradeEntryModal from "../trade/TradeEntryModal";
import { useStore } from "../../store/useStore";

// ── Session Intelligence (UTC+2 Botswana time) ────────────────────────────────
const SESSIONS = [
  { name:"Asia",     start:2,  end:8,  status:"blocked",  color:"#ef4444", icon:"🌏", scoreBonus:0,  rule:"NO TRADING" },
  { name:"London",   start:9,  end:18, status:"primary",  color:"#22c55e", icon:"🏦", scoreBonus:10, rule:"MAIN WINDOW"      },
  { name:"Overlap",  start:15, end:18, status:"hot",      color:"#f59e0b", icon:"🔥", scoreBonus:10, rule:"HIGHEST PROB"     },
  { name:"New York", start:18, end:22, status:"selective",color:"#60a5fa", icon:"🗽", scoreBonus:7,  rule:"HIGH QUALITY ONLY"},
];

function getSessionState() {
  const now     = new Date();
  const utc2Hour= (now.getUTCHours() + 2) % 24;
  const utcMin  = now.getUTCMinutes();
  const decimal = utc2Hour + utcMin / 60;

  const isOverlap = decimal >= 15 && decimal < 18;
  const isLondon  = decimal >= 9  && decimal < 18;
  const isNY      = decimal >= 18 && decimal < 22;
  const isAsia    = decimal >= 2  && decimal < 8;

  let active="Off-Hours", bonus=0, canTrade=false, minScore=999;
  if (isOverlap)     { active="Overlap";  bonus=10; canTrade=true;  minScore=70; }
  else if (isLondon) { active="London";   bonus=10; canTrade=true;  minScore=70; }
  else if (isNY)     { active="New York"; bonus=7;  canTrade=true;  minScore=75; }
  else if (isAsia)   { active="Asia";     bonus=0;  canTrade=false; minScore=999;}

  return { active, bonus, canTrade, minScore, utc2Hour, utcMin, decimal };
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color="#22c55e", height=32 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!data?.length || data.length < 2) return;
    const cvs = ref.current; if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0,0,W,H);
    const min=Math.min(...data), max=Math.max(...data), rng=max-min||1;
    const toX = i => (i/(data.length-1))*W;
    const toY = v => H - ((v-min)/rng)*(H*0.8) - 4;
    ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=1.5;
    data.forEach((v,i)=>i===0?ctx.moveTo(toX(i),toY(v)):ctx.lineTo(toX(i),toY(v)));
    ctx.stroke();
    ctx.lineTo(toX(data.length-1),H); ctx.lineTo(0,H);
    ctx.closePath(); ctx.fillStyle=`${color}22`; ctx.fill();
  },[data,color]);
  return <canvas ref={ref} width={200} height={height} style={{width:"100%",display:"block"}}/>;
}

// ── Session Bar ───────────────────────────────────────────────────────────────
function SessionBar() {
  const [session, setSession] = useState(getSessionState);
  useEffect(() => {
    const id = setInterval(()=>setSession(getSessionState()), 30000);
    return ()=>clearInterval(id);
  }, []);
  const nowMins = session.utc2Hour*60 + session.utcMin;

  return (
    <div className="signal-card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted uppercase tracking-widest">🕒 Session Intelligence</span>
        <span className="text-xs font-mono text-muted">
          {String(session.utc2Hour).padStart(2,"0")}:{String(session.utcMin).padStart(2,"0")} UTC+2
        </span>
      </div>

      {/* 24h timeline */}
      <div className="relative h-5 bg-border/30 rounded overflow-hidden mb-3">
        {SESSIONS.map(s => {
          const isActive = s.name===session.active || (s.name==="Overlap"&&session.active==="Overlap");
          return (
            <div key={s.name}
              style={{position:"absolute",left:`${(s.start/24)*100}%`,width:`${((s.end-s.start)/24)*100}%`,
                background:isActive?s.color:`${s.color}40`,top:0,bottom:0,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:8,fontWeight:"bold",color:"#fff",opacity:0.9}}>{s.name}</span>
            </div>
          );
        })}
        <div style={{position:"absolute",top:0,bottom:0,left:`${(nowMins/(24*60))*100}%`,
          width:2,background:"#fff",zIndex:10,borderRadius:1}}/>
      </div>

      {/* Session cards */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {SESSIONS.map(s=>{
          const isActive=s.name===session.active;
          return (
            <div key={s.name} style={{borderColor:isActive?s.color:"#1f2937",
              background:isActive?`${s.color}15`:"transparent"}}
              className="rounded p-2 border text-center">
              <div style={{fontSize:16}}>{s.icon}</div>
              <div className="text-xs font-bold mt-0.5" style={{color:isActive?s.color:"#6b7280"}}>{s.name}</div>
              <div style={{fontSize:9,color:"#4b5563"}}>{s.start}:00–{s.end}:00</div>
              <div className="mt-1 font-bold" style={{fontSize:9,
                color:s.status==="blocked"?"#ef4444":s.status==="hot"?"#f59e0b":"#22c55e"}}>
                {s.status==="blocked"?"🚫 BLOCKED":s.status==="hot"?"🔥 HOT ZONE":s.status==="primary"?"✅ ACTIVE":"⚠️ SELECTIVE"}
              </div>
              {isActive&&s.scoreBonus>0&&<div style={{fontSize:9,color:s.color,fontWeight:"bold"}}>+{s.scoreBonus}pts</div>}
            </div>
          );
        })}
      </div>

      {/* Status banner */}
      <div className="rounded p-2 text-center" style={{
        background:session.canTrade?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",
        border:`1px solid ${session.canTrade?"#22c55e44":"#ef444444"}`
      }}>
        <span className="text-xs font-bold" style={{color:session.canTrade?"#22c55e":"#ef4444"}}>
          {session.canTrade
            ? `✅ ${session.active} OPEN — Min score: ${session.minScore} | Session bonus: +${session.bonus}pts`
            : `🚫 ${session.active} — NO TRADING THIS SESSION`}
        </span>
      </div>
    </div>
  );
}

// ── Daily Discipline ──────────────────────────────────────────────────────────
function DailyDiscipline() {
  const [trades,  setTrades]  = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/trades?limit=200");
      const j = await r.json();
      if (j.ok) {
        const todayTs = new Date(); todayTs.setHours(0,0,0,0);
        setTrades((j.data||[]).filter(t => t.opened_at >= todayTs.getTime()));
      }
    } catch(e) {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const MAX=3, TARGET_USD=50, STOP_USD=-50;
  const closed  = trades.filter(t=>t.status==="CLOSED");
  const open    = trades.filter(t=>t.status==="OPEN");
  const pnl     = closed.reduce((s,t)=>s+(t.pnl_usdt||0),0);
  const wins    = closed.filter(t=>(t.pnl_usdt||0)>0).length;
  const losses  = closed.filter(t=>(t.pnl_usdt||0)<=0).length;
  const blocked = trades.length>=MAX || pnl<=STOP_USD || pnl>=TARGET_USD;
  const pnlCol  = pnl>=0?"#22c55e":"#ef4444";
  const pnlHist = closed.reduce((acc,t)=>[...acc,(acc[acc.length-1]||0)+(t.pnl_usdt||0)],[0]);

  return (
    <div className="signal-card p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-muted uppercase tracking-widest">📋 Daily Discipline</span>
        <button onClick={load} className="text-xs text-muted hover:text-bright border border-border rounded px-2 py-0.5">↺</button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          {label:"Trades", value:`${trades.length}/${MAX}`, color:trades.length>=MAX?"#ef4444":"#f9fafb"},
          {label:"P&L",    value:`${pnl>=0?"+":""}$${pnl.toFixed(2)}`, color:pnlCol},
          {label:"W / L",  value:`${wins} / ${losses}`, color:wins>losses?"#22c55e":losses>wins?"#ef4444":"#f59e0b"},
          {label:"Open",   value:open.length, color:"#60a5fa"},
        ].map(m=>(
          <div key={m.label} className="bg-border/30 rounded p-2 text-center">
            <div className="text-base font-extrabold font-mono" style={{color:m.color}}>{m.value}</div>
            <div className="text-xs text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      {pnlHist.length>1&&(
        <div className="mb-3 p-2 bg-border/20 rounded">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Stop -${Math.abs(STOP_USD)}</span><span>Today's P&L</span><span>Target +${TARGET_USD}</span>
          </div>
          <Sparkline data={pnlHist} color={pnlCol} height={28}/>
        </div>
      )}

      {blocked&&(
        <div className="mb-3 p-2 rounded text-center text-xs font-bold"
          style={{background:"rgba(239,68,68,0.08)",border:"1px solid #ef444433",color:"#ef4444"}}>
          🛑 {trades.length>=MAX?"MAX 3 TRADES":pnl<=STOP_USD?"DAILY STOP HIT":"DAILY TARGET HIT"} — DONE FOR TODAY
        </div>
      )}

      {closed.length>0&&(
        <div className="space-y-1">
          {closed.slice(-3).map((t,i)=>(
            <div key={i} className="flex items-center justify-between text-xs bg-border/20 rounded px-2 py-1.5">
              <span className="font-bold text-bright w-14">{t.signal_asset?.replace("USDT","")}</span>
              <span style={{color:t.direction==="LONG"?"#22c55e":"#ef4444"}} className="font-bold w-10">{t.direction}</span>
              <span className="text-muted w-16 text-center">${parseFloat(t.amount_usdt||0).toFixed(0)} ×{t.leverage}</span>
              <span style={{color:(t.pnl_usdt||0)>=0?"#22c55e":"#ef4444"}} className="font-bold w-16 text-right">
                {(t.pnl_usdt||0)>=0?"+":""} ${Math.abs(t.pnl_usdt||0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
      {loading&&<div className="text-xs text-center text-muted mt-2">Loading...</div>}
      <div className="text-xs text-muted text-center mt-2" style={{fontSize:9}}>
        All trades saved to SQLite · Max {MAX}/day · Target +${TARGET_USD} · Stop -${Math.abs(STOP_USD)}
      </div>
    </div>
  );
}

// ── MTF Confluence ────────────────────────────────────────────────────────────
function MTFPanel({ signals }) {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const sig     = signals.find(s=>(s.asset||s.symbol)===symbol);
  const score   = sig?.signal?.score||sig?.score||0;
  const regime  = sig?.context?.regime?.type||sig?.regime||"—";
  const of      = sig?.context?.orderflow||sig?.orderflow;
  const vol     = sig?.context?.volatility;
  const liq     = sig?.context?.liquidity;
  const stopHunt= sig?.context?.stopHunt||sig?.stopHunt;
  const abs     = sig?.context?.absorption||sig?.absorption;

  const w4h  = ["TRENDING_UP","TRENDING_DOWN"].includes(regime)?28:regime==="COMPRESSION"?20:0;
  const w1h  = (liq?.buySide?.length>0||liq?.sellSide?.length>0)?22:0;
  const w5m  = of?.bias&&of.bias!=="NEUTRAL"?13:0;
  const wSes = 8;
  const wReg = regime!=="CHOP"&&regime!=="—"?10:0;
  const wVol = vol?.state==="LOW"?5:vol?.state==="NORMAL"?3:0;

  const scoreCol=score>=85?"#22c55e":score>=75?"#f59e0b":score>=60?"#60a5fa":"#6b7280";
  const SYMS=["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"];

  const factors=[
    {label:"4H Trend Bias",   pts:w4h, max:30, detail:regime.replace("_"," ")},
    {label:"1H Structure",    pts:w1h, max:25, detail:w1h>0?"Liq zones found":"No zones"},
    {label:"5M Entry Trigger",pts:w5m, max:15, detail:of?.bias||"NEUTRAL"},
    {label:"Session Bonus",   pts:wSes,max:10, detail:"Auto"},
    {label:"Regime Fit",      pts:wReg,max:10, detail:regime.replace("_"," ")},
    {label:"Volatility",      pts:wVol,max:5,  detail:vol?.state||"—"},
  ];

  return (
    <div className="signal-card p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-muted uppercase tracking-widest">🧠 MTF Confluence</span>
        <div className="flex gap-0.5 flex-wrap">
          {SYMS.map(s=>(
            <button key={s} onClick={()=>setSymbol(s)}
              className={`text-xs px-1.5 py-0.5 rounded font-bold transition-colors ${symbol===s?"bg-accent text-black":"text-muted hover:text-bright"}`}>
              {s.replace("USDT","")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-4 mb-4">
        {/* Score donut */}
        <div className="relative flex-shrink-0" style={{width:72,height:72}}>
          <svg viewBox="0 0 36 36" style={{width:72,height:72,transform:"rotate(-90deg)"}}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3.5"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreCol} strokeWidth="3.5"
              strokeDasharray={`${score} ${100-score}`} strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:18,fontWeight:800,color:scoreCol,lineHeight:1}}>{score}</span>
            <span style={{fontSize:8,color:"#6b7280"}}>/ 100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-bright text-sm">{symbol}</div>
          <div className="text-xs text-muted mb-2">{regime.replace("_"," ")}</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {stopHunt&&<span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">💧 Sweep</span>}
            {abs?.absorption&&<span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">🧲 Absorbed</span>}
            {of?.bias==="BUYERS_IN_CONTROL"&&<span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">⬆ Buy Flow</span>}
            {of?.bias==="SELLERS_IN_CONTROL"&&<span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">⬇ Sell Flow</span>}
          </div>
          <div className="text-xs font-bold" style={{color:scoreCol}}>
            {score>=85?"🔥 STRONG TRADE":score>=70?"✅ VALID TRADE":score>=60?"⚠️ WEAK SETUP":"🚫 NO TRADE"}
          </div>
        </div>
      </div>

      {/* Factor bars */}
      <div className="space-y-2">
        {factors.map(f=>(
          <div key={f.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-muted">{f.label}</span>
              <div className="flex items-center gap-2">
                <span style={{fontSize:9,color:"#6b7280"}}>{f.detail}</span>
                <span className="text-xs font-bold text-bright">{f.pts}/{f.max}</span>
              </div>
            </div>
            <div className="h-1.5 bg-border/40 rounded overflow-hidden">
              <div style={{width:`${(f.pts/f.max)*100}%`,
                background:f.pts/f.max>=0.8?"#22c55e":f.pts/f.max>=0.4?"#f59e0b":"#374151"}}
                className="h-full rounded transition-all"/>
            </div>
          </div>
        ))}
      </div>

      {vol?.atr&&(
        <div className="mt-3 pt-2 border-t border-border flex gap-4 text-xs">
          <span className="text-muted">ATR: <span className="font-mono text-bright">{vol.atr.toFixed(4)}</span></span>
          <span className="text-muted">Vol: <span className="font-bold" style={{color:vol.state==="LOW"?"#22c55e":vol.state==="HIGH"?"#ef4444":"#f59e0b"}}>{vol.state}</span></span>
        </div>
      )}
    </div>
  );
}

// ── Risk Engine ───────────────────────────────────────────────────────────────
function RiskEngine({ signals }) {
  const [symbol,  setSymbol]  = useState("BTCUSDT");
  const [capital, setCapital] = useState(()=>parseFloat(localStorage.getItem("mc_capital")||"10000"));
  const [baseRisk,setBaseRisk]= useState(1.0);

  useEffect(()=>localStorage.setItem("mc_capital",String(capital)),[capital]);

  const sig    = signals.find(s=>(s.asset||s.symbol)===symbol);
  const score  = sig?.signal?.score||sig?.score||0;
  const regime = sig?.context?.regime?.type||sig?.regime||"CHOP";
  const plan   = sig?.signal?.tradePlan;
  const atr    = sig?.context?.volatility?.atr||0;

  const regMult= regime==="CHOP"?0:regime==="EXPANSION"?0.8:1.0;
  const scMult = score>=85?1.5:score>=75?1.0:score>=70?0.5:0;
  const adjRisk= parseFloat((baseRisk*scMult*regMult).toFixed(2));
  const riskAmt= capital*(adjRisk/100);

  const rr   = plan?.riskReward||2.0;
  const winP = Math.min(0.85, score/100*0.78);
  const exp  = (winP*rr)-((1-winP)*1);
  const posSize = atr>0?(riskAmt/(atr*1.5)):0;

  const expCol  = exp>0.15?"#22c55e":exp>0?"#f59e0b":"#ef4444";
  const riskCol = adjRisk>=1?"#22c55e":adjRisk>0?"#f59e0b":"#ef4444";
  const canExec = exp>0&&adjRisk>0&&score>=70&&(plan?.riskReward||0)>=1.5&&regime!=="CHOP";
  const SYMS=["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"];

  return (
    <div className="signal-card p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-muted uppercase tracking-widest">💰 Risk Engine</span>
        <select value={symbol} onChange={e=>setSymbol(e.target.value)}
          className="bg-border/50 rounded px-2 py-0.5 text-xs text-bright border border-border">
          {SYMS.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Capital + risk controls */}
      <div className="flex gap-2 mb-3 p-2 bg-border/20 rounded items-center">
        <span className="text-xs text-muted">Capital $</span>
        <input value={capital} onChange={e=>setCapital(parseFloat(e.target.value)||0)}
          type="number" className="flex-1 bg-transparent font-mono font-bold text-bright text-sm outline-none min-w-0"/>
        <select value={baseRisk} onChange={e=>setBaseRisk(parseFloat(e.target.value))}
          className="bg-border/50 rounded px-1 py-0.5 text-xs text-bright border border-border">
          {[0.5,1.0,1.5,2.0].map(r=><option key={r} value={r}>{r}% risk</option>)}
        </select>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          {label:"Expectancy",value:`${exp>=0?"+":""}${exp.toFixed(2)}R`,color:expCol,sub:exp>0.15?"Edge ✅":exp>0?"Marginal ⚠️":"BLOCK 🚫"},
          {label:"Adj. Risk",  value:`${adjRisk}%`,                      color:riskCol,sub:`$${riskAmt.toFixed(0)} at risk`},
          {label:"R:R",        value:plan?.riskReward?`${plan.riskReward}:1`:"—",
            color:plan?.riskReward>=1.5?"#22c55e":"#ef4444",sub:plan?.riskReward>=1.5?"Min 1.5 ✅":"Below min 🚫"},
          {label:"Size",       value:posSize>0?posSize.toFixed(4):"—",color:"#9ca3af",sub:symbol.replace("USDT","")+" units"},
        ].map(m=>(
          <div key={m.label} className="bg-border/30 rounded p-2">
            <div className="text-xs text-muted mb-1">{m.label}</div>
            <div className="text-base font-extrabold font-mono" style={{color:m.color}}>{m.value}</div>
            <div className="text-xs text-muted">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Trade plan */}
      {plan&&(
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div className="bg-border/30 rounded p-2 text-center">
            <div className="text-muted mb-1">ENTRY</div>
            <div className="font-mono font-bold text-bright">{plan.entry?.toFixed(2)||"—"}</div>
          </div>
          <div className="rounded p-2 text-center border border-red-500/20" style={{background:"rgba(239,68,68,0.06)"}}>
            <div className="text-muted mb-1">STOP</div>
            <div className="font-mono font-bold text-red-400">{plan.stopLoss?.toFixed(2)||"—"}</div>
          </div>
          <div className="rounded p-2 text-center border border-green-500/20" style={{background:"rgba(34,197,94,0.06)"}}>
            <div className="text-muted mb-1">TARGET</div>
            <div className="font-mono font-bold text-green-400">{plan.takeProfit?.toFixed(2)||"—"}</div>
          </div>
        </div>
      )}

      {/* Final decision */}
      <div className="p-2 rounded text-center" style={{
        background:canExec?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",
        border:`1px solid ${canExec?"#22c55e44":"#ef444444"}`
      }}>
        <div className="text-xs font-bold" style={{color:canExec?"#22c55e":"#ef4444"}}>
          {canExec
            ? `✅ EXECUTE — $${riskAmt.toFixed(0)} | ${adjRisk}% | E=${exp.toFixed(2)}R | RR=${plan?.riskReward||"—"}`
            : exp<=0?"🚫 BLOCK — Negative expectancy"
            : (plan?.riskReward||0)<1.5?"🚫 BLOCK — RR below 1.5"
            : regime==="CHOP"?"🚫 BLOCK — Chop regime"
            : "🚫 BLOCK — Score too low"}
        </div>
      </div>
    </div>
  );
}

// ── Capital Allocation ─────────────────────────────────────────────────────────
function CapitalAllocation() {
  const [capital, setCapital] = useState(()=>parseFloat(localStorage.getItem("mc_capital")||"10000"));
  useEffect(()=>localStorage.setItem("mc_capital",String(capital)),[capital]);

  const slices=[
    {label:"Trading Capital",pct:70,color:"#22c55e",val:capital*0.70},
    {label:"Stable Vault",   pct:20,color:"#3b82f6",val:capital*0.20},
    {label:"Withdrawals",    pct:10,color:"#f59e0b",val:capital*0.10},
  ];
  const canvasRef=useRef(null);
  useEffect(()=>{
    const cvs=canvasRef.current; if(!cvs) return;
    const ctx=cvs.getContext("2d"),W=cvs.width,H=cvs.height,cx=W/2,cy=H/2,r=Math.min(W,H)/2-6;
    ctx.clearRect(0,0,W,H);
    let angle=-Math.PI/2;
    slices.forEach(s=>{
      const end=angle+(s.pct/100)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,angle,end); ctx.closePath();
      ctx.fillStyle=s.color+"bb"; ctx.fill();
      angle=end;
    });
    ctx.beginPath(); ctx.arc(cx,cy,r*0.56,0,Math.PI*2);
    ctx.fillStyle="#111827"; ctx.fill();
  },[capital]);

  return (
    <div className="signal-card p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-muted uppercase tracking-widest">💼 Capital Allocation</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted">$</span>
          <input value={capital} onChange={e=>{const v=parseFloat(e.target.value)||0;setCapital(v);}}
            type="number" className="w-24 bg-border/50 rounded px-2 py-0.5 text-xs font-mono font-bold text-bright border border-border"/>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <canvas ref={canvasRef} width={88} height={88} style={{flexShrink:0}}/>
        <div className="flex-1 space-y-2">
          {slices.map(s=>(
            <div key={s.label}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="flex items-center gap-1 text-muted">
                  <span style={{width:8,height:8,background:s.color,borderRadius:2,display:"inline-block"}}/>
                  {s.label} ({s.pct}%)
                </span>
                <span className="font-mono font-bold" style={{color:s.color}}>
                  ${s.val.toLocaleString(undefined,{maximumFractionDigits:0})}
                </span>
              </div>
              <div className="h-1.5 bg-border/30 rounded overflow-hidden">
                <div style={{width:`${s.pct}%`,background:s.color}} className="h-full rounded"/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-border text-xs text-muted">
        <div className="flex justify-between">
          <span>Fee model: OKX 0.06–0.1% · BingX 0.05–0.1%</span>
        </div>
        <div className="mt-1 font-mono text-bright text-xs">Net = Profit − Fees − Withdrawals</div>
      </div>
    </div>
  );
}

// ── Opportunity Radar ─────────────────────────────────────────────────────────
function OpportunityRadar({ signals }) {
  const session=getSessionState();
  const ranked=[...signals]
    .map(s=>{
      const score  =s.signal?.score||s.score||0;
      const regime =s.context?.regime?.type||s.regime||"CHOP";
      const action =s.signal?.action||s.action;
      const dir    =s.signal?.direction||s.direction;
      const rr     =s.signal?.tradePlan?.riskReward||0;
      const plan   =s.signal?.tradePlan;
      const blocked=!session.canTrade||score<session.minScore||regime==="CHOP"||rr<1.5;
      return{...s,_score:score,_regime:regime,_action:action,_dir:dir,_rr:rr,_plan:plan,_blocked:blocked,
             _pri:score+(rr*5)+(session.canTrade?session.bonus:0)};
    })
    .sort((a,b)=>b._pri-a._pri);

  return (
    <div className="signal-card p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-muted uppercase tracking-widest">🎯 Opportunity Radar</span>
        <span className="text-xs text-muted">{session.canTrade?`Active • Min ${session.minScore}`:"Session closed"}</span>
      </div>
      <div className="space-y-1.5">
        {ranked.map((s,i)=>{
          const sym=s.asset||s.symbol;
          const dirCol=s._dir==="LONG"?"#22c55e":s._dir==="SHORT"?"#ef4444":"#6b7280";
          const scrCol=s._score>=85?"#22c55e":s._score>=75?"#f59e0b":"#6b7280";
          return (
            <div key={sym} className="flex items-center gap-2 rounded border px-2 py-2 transition-all"
              style={{borderColor:s._blocked?"#1f2937":"#22c55e44",
                background:s._blocked?"rgba(255,255,255,0.01)":"rgba(34,197,94,0.04)",
                opacity:s._blocked?0.55:1}}>
              <span className="text-muted w-4 text-xs">{i+1}</span>
              <span className="font-bold text-bright text-xs w-12">{sym?.replace("USDT","")}</span>
              <div className="flex-1 h-1.5 bg-border/40 rounded overflow-hidden">
                <div style={{width:`${s._score}%`,background:scrCol}} className="h-full rounded"/>
              </div>
              <span className="text-xs font-bold w-6 text-right" style={{color:scrCol}}>{s._score}</span>
              <span className="text-xs font-bold w-10" style={{color:dirCol}}>{s._dir||"—"}</span>
              <span className="text-xs text-muted w-10">{s._rr>0?`${s._rr.toFixed(1)}:1`:"—"}</span>
              <span className="text-xs font-bold w-12 text-right" style={{color:s._blocked?"#ef4444":"#22c55e"}}>
                {s._blocked?"🚫":"✅"} {s._action||"—"}
              </span>
            </div>
          );
        })}
        {ranked.length===0&&<div className="text-center text-muted text-sm py-4">Scanning markets...</div>}
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
// ── Root component ────────────────────────────────────────────────────────────
export default function MissionControl() {
  const { signals } = useStore();
  const [showEntry, setShowEntry] = useState(false);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SessionBar/>
        <DailyDiscipline/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MTFPanel signals={signals}/>
        <RiskEngine signals={signals}/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <OpportunityRadar signals={signals}/>
        <CapitalAllocation/>
      </div>

      {/* Trade Journal — full width */}
      <div className="signal-card p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-muted uppercase tracking-widest">📒 Trade Journal</span>
          <button
            onClick={() => setShowEntry(true)}
            className="text-xs px-3 py-1.5 rounded font-bold border transition-colors"
            style={{background:"rgba(34,197,94,0.1)",borderColor:"#22c55e66",color:"#22c55e"}}>
            + Open Trade Manually
          </button>
        </div>
        <TradeJournal />
      </div>

      {showEntry && (
        <TradeEntryModal
          signal={null}
          onClose={() => setShowEntry(false)}
          onSaved={() => setShowEntry(false)}
        />
      )}
    </div>
  );
}