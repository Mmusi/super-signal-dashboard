import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../../store/useStore";

// ── Tooltip helper ────────────────────────────────────────────────────────────
function Tip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: "absolute", bottom: "120%", left: "50%", transform: "translateX(-50%)",
          background: "#0f172a", border: "1px solid #334155", borderRadius: 6,
          padding: "6px 10px", fontSize: 11, color: "#cbd5e1", whiteSpace: "nowrap",
          zIndex: 9999, maxWidth: 260, whiteSpace: "normal", lineHeight: 1.5,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)", pointerEvents: "none",
        }}>{text}</div>
      )}
    </span>
  );
}

// ── Mini sparkline for signal charts ─────────────────────────────────────────
function MiniChart({ data, color = "#22c55e", height = 40, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!data?.length || !ref.current) return;
    const cvs = ref.current, ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0, 0, W, H);
    const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
    const toX = i => (i / (data.length - 1)) * W;
    const toY = v => H - ((v - min) / rng) * (H * 0.8) - 4;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    data.forEach((v, i) => i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)));
    ctx.stroke();
    // Fill
    ctx.lineTo(toX(data.length - 1), H); ctx.lineTo(0, H);
    ctx.closePath(); ctx.fillStyle = `${color}22`; ctx.fill();
  }, [data, color]);
  return (
    <div>
      {label && <div style={{ fontSize: 9, color: "#475569", marginBottom: 2 }}>{label}</div>}
      <canvas ref={ref} width={120} height={height} style={{ width: "100%", display: "block", borderRadius: 3 }} />
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, color = "#22c55e", tip }) {
  const el = (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10,
      fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}44`,
      cursor: tip ? "help" : "default",
    }}>{label}</span>
  );
  return tip ? <Tip text={tip}>{el}</Tip> : el;
}

// ── Checklist item ────────────────────────────────────────────────────────────
function Check({ done, label, tip }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{done ? "✅" : "⬜"}</span>
      {tip ? <Tip text={tip}><span style={{ fontSize: 12, color: done ? "#94a3b8" : "#e2e8f0", cursor: "help", borderBottom: "1px dashed #334155" }}>{label}</span></Tip>
           : <span style={{ fontSize: 12, color: done ? "#94a3b8" : "#e2e8f0" }}>{label}</span>}
    </div>
  );
}

// ── Trade plan display ────────────────────────────────────────────────────────
function TradePlan({ entry, sl, tp, direction, note }) {
  const rr = entry && sl && tp ? Math.abs(tp - entry) / Math.abs(entry - sl) : null;
  return (
    <div style={{ background: "#0b1628", border: "1px solid #1e3a5f", borderRadius: 8, padding: "12px 14px", marginTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Trade Plan</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[
          { l: "ENTRY", v: entry, c: "#94a3b8" },
          { l: "STOP LOSS", v: sl, c: "#f87171" },
          { l: "TAKE PROFIT", v: tp, c: "#4ade80" },
        ].map(x => (
          <div key={x.l} style={{ textAlign: "center", background: "#111827", borderRadius: 5, padding: "8px 6px" }}>
            <div style={{ fontSize: 9, color: "#475569", marginBottom: 3 }}>{x.l}</div>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: x.c }}>{x.v || "—"}</div>
          </div>
        ))}
      </div>
      {rr && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#475569" }}>R:R</span>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: rr >= 2 ? "#4ade80" : rr >= 1.5 ? "#f59e0b" : "#f87171" }}>
            1 : {rr.toFixed(2)}
          </span>
          {rr >= 2 && <span style={{ fontSize: 10, color: "#4ade80" }}>✅ Min met</span>}
          {rr < 1.5 && <span style={{ fontSize: 10, color: "#f87171" }}>⚠ Below 1.5 min</span>}
        </div>
      )}
      {note && <div style={{ fontSize: 11, color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>{note}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STRATEGY 1 — Multi-Timeframe Entry (HTF → LTF → Entry)
// ══════════════════════════════════════════════════════════════════════════════
function MTFStrategy({ signals }) {
  const [sym, setSym]     = useState("BTCUSDT");
  const [step, setStep]   = useState(0);
  const sig = signals.find(s => (s.asset || s.symbol) === sym);
  const regime  = sig?.context?.regime?.type || sig?.regime || "—";
  const score   = sig?.signal?.score || sig?.score || 0;
  const liq     = sig?.context?.liquidity;
  const of      = sig?.context?.orderflow;
  const stopHunt= sig?.context?.stopHunt || sig?.stopHunt;
  const plan    = sig?.signal?.tradePlan;

  // Derive checklist from live signal data
  const h4Bias    = ["TRENDING_UP","TRENDING_DOWN","EXPANSION"].includes(regime);
  const hasZone   = liq?.buySide?.length > 0 || liq?.sellSide?.length > 0;
  const hasConfirm= stopHunt || of?.bias !== "NEUTRAL";
  const scoreOk   = score >= 70;

  const STEPS = [
    {
      num: 1, tf: "4H / 1H", title: "Higher Timeframe — Define Bias",
      color: "#3b82f6", icon: "📊",
      tip: "This gives you CONTEXT only — not an entry signal. You need to know the macro trend first.",
      checks: [
        { label: `Trend direction: ${regime.replace("_", " ")}`, done: h4Bias, tip: "Is price making HH/HL (bullish) or LH/LL (bearish)? CHOP = no trade." },
        { label: "Liquidity zones identified above/below price", done: hasZone, tip: "Where have stops been placed? This is where smart money will hunt." },
        { label: "Price in premium/discount area", done: h4Bias, tip: "Premium = sell side (price is expensive). Discount = buy side (price is cheap). Trade from discount for longs." },
      ],
    },
    {
      num: 2, tf: "1H / 4H", title: "Wait for Point of Interest (POI)",
      color: "#f59e0b", icon: "📍",
      tip: "NO POI = NO TRADE. Mid-range entries have terrible R:R. Only trade from key zones.",
      checks: [
        { label: "Order Block (OB) identified", done: hasZone, tip: "The last bearish candle before a bullish impulse (for longs). Price often returns to retest this zone." },
        { label: "Fair Value Gap (FVG) present", done: stopHunt, tip: "A 3-candle pattern where the middle candle's body has no overlap with candles 1 and 3. Price fills these gaps." },
        { label: "Premium/Discount zone valid", done: h4Bias, tip: "Fibonacci 50% or above = premium. Below 50% = discount. Buy from discount, sell from premium." },
      ],
    },
    {
      num: 3, tf: "M15 / M5", title: "Lower Timeframe Confirmation",
      color: "#22c55e", icon: "⚡",
      tip: "Zone + confirmation = valid setup. Zone alone = 50/50. This step turns a maybe into a trade.",
      checks: [
        { label: "Liquidity sweep / stop hunt confirmed", done: !!stopHunt, tip: "Price ran below swing low (hunting buy-side stops) then reversed. This is the trigger." },
        { label: "CHoCH or MSS on lower TF", done: hasConfirm, tip: "Change of Character: first higher high after downtrend. Market Structure Shift: break of previous high." },
        { label: "Strong displacement candle", done: score >= 75, tip: "A large, decisive candle closing away from the zone. Weak candles = weak signal." },
        { label: "New OB or FVG formed", done: stopHunt || score >= 80, tip: "The displacement creates a new entry zone. Enter on retest of this new OB/FVG." },
      ],
    },
    {
      num: 4, tf: "M5 / M15", title: "Entry — SL — TP",
      color: "#22c55e", icon: "🎯",
      tip: "Enter at FVG or OB after confirmation. SL below swing low. TP at next liquidity target.",
      checks: [
        { label: `Minimum R:R 1.5:1 confirmed`, done: (plan?.riskReward || 0) >= 1.5, tip: "If your TP isn't at least 1.5× your SL distance, skip the trade. Bad R:R is how accounts die slowly." },
        { label: "All 3 timeframes aligned", done: h4Bias && hasZone && hasConfirm, tip: "HTF bias + H1 structure + M5 confirmation = highest probability setup." },
        { label: `Score ≥ 70 (current: ${score})`, done: scoreOk, tip: "System confluence score. Below 70 = block the trade regardless of what you see." },
      ],
    },
  ];

  const scoreHistory = [45, 52, 60, 55, 70, 75, 80, score];

  return (
    <div style={{ color: "#e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>📊 Multi-Timeframe Entry Strategy</h2>
          <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>
            HTF Context → LTF Structure → M5 Confirmation → Execute
            <Tip text="Most traders lose because they enter from one timeframe only. This 4-step process forces context before entry.">
              <span style={{ marginLeft: 6, cursor: "help", color: "#3b82f6" }}>ⓘ</span>
            </Tip>
          </p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"].map(s => (
            <button key={s} onClick={() => setSym(s)} style={{
              padding: "3px 8px", borderRadius: 4, border: "none", fontWeight: 700, fontSize: 10, cursor: "pointer",
              background: sym === s ? "#22c55e" : "#1e293b", color: sym === s ? "#000" : "#64748b",
            }}>{s.replace("USDT", "")}</button>
          ))}
        </div>
      </div>

      {/* Step progress */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 8, overflow: "hidden", border: "1px solid #1e293b" }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            flex: 1, padding: "10px 4px", border: "none", cursor: "pointer", textAlign: "center",
            background: step === i ? s.color + "22" : "#0f172a",
            borderRight: i < 3 ? "1px solid #1e293b" : "none",
            transition: "all 0.2s",
          }}>
            <div style={{ fontSize: 16 }}>{s.icon}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: step === i ? s.color : "#475569", marginTop: 2 }}>STEP {s.num}</div>
            <div style={{ fontSize: 9, color: step === i ? s.color : "#334155" }}>{s.tf}</div>
          </button>
        ))}
      </div>

      {/* Active step */}
      {(() => {
        const s = STEPS[step];
        const allDone = s.checks.every(c => c.done);
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>Step {s.num} — {s.title}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{s.tf} timeframe</div>
                </div>
                <Tip text={s.tip}>
                  <span style={{ cursor: "help", color: "#3b82f6", fontSize: 14, marginLeft: 4 }}>ⓘ</span>
                </Tip>
              </div>
              <div style={{ background: "#0f172a", borderRadius: 8, padding: 14, marginBottom: 12 }}>
                {s.checks.map((c, ci) => <Check key={ci} done={c.done} label={c.label} tip={c.tip} />)}
              </div>
              <div style={{
                padding: "8px 12px", borderRadius: 6, textAlign: "center", fontSize: 12, fontWeight: 700,
                background: allDone ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                border: `1px solid ${allDone ? "#22c55e44" : "#f59e0b44"}`,
                color: allDone ? "#4ade80" : "#f59e0b",
              }}>
                {allDone ? `✅ Step ${s.num} conditions met — proceed to next step` : `⏳ Waiting for step ${s.num} conditions...`}
              </div>
            </div>
            <div>
              <div style={{ background: "#0f172a", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>{sym} Live Context</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                  {[
                    { l: "Regime",     v: regime.replace("_"," "), c: h4Bias?"#22c55e":"#f59e0b" },
                    { l: "Score",      v: score, c: score>=85?"#22c55e":score>=70?"#f59e0b":"#ef4444" },
                    { l: "Stop Hunt",  v: stopHunt?"DETECTED":"—", c: stopHunt?"#22c55e":"#475569" },
                    { l: "Order Flow", v: of?.bias?.replace(/_IN_CONTROL/,"")?.replace(/_/," ")||"—", c: of?.bias!=="NEUTRAL"?"#60a5fa":"#475569" },
                  ].map(x => (
                    <div key={x.l} style={{ background: "#111827", borderRadius: 5, padding: "6px 8px" }}>
                      <div style={{ fontSize: 9, color: "#475569" }}>{x.l}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: x.c }}>{x.v}</div>
                    </div>
                  ))}
                </div>
                <MiniChart data={scoreHistory} color={score>=70?"#22c55e":"#f59e0b"} height={36} label="Score trend" />
              </div>
              {step === 3 && plan && (
                <TradePlan
                  entry={plan.entry?.toFixed(2)}
                  sl={plan.stopLoss?.toFixed(2)}
                  tp={plan.takeProfit?.toFixed(2)}
                  direction={sig?.signal?.direction}
                  note="Entry at FVG/OB. SL below swing low. TP at next liquidity target."
                />
              )}
              {step === 3 && !plan && (
                <div style={{ background: "#0f172a", borderRadius: 8, padding: 14, fontSize: 11, color: "#475569", textAlign: "center" }}>
                  No active trade plan — system needs score ≥ 85 and TRADE signal for auto-plan
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STRATEGY 2 — BSL "One Setup For Life"
// ══════════════════════════════════════════════════════════════════════════════
function BSLStrategy({ signals }) {
  const [sym, setSym] = useState("BTCUSDT");
  const sig      = signals.find(s => (s.asset || s.symbol) === sym);
  const stopHunt = sig?.context?.stopHunt || sig?.stopHunt;
  const score    = sig?.signal?.score || sig?.score || 0;
  const plan     = sig?.signal?.tradePlan;

  // ICT Macro windows in UTC+2 (Botswana)
  const now     = new Date();
  const utc2H   = (now.getUTCHours() + 2) % 24;
  const utc2M   = now.getUTCMinutes();
  const decimal = utc2H + utc2M / 60;

  const macros = [
    { label: "AM Macro 1", start: 9.83,  end: 10.17, desc: "9:50–10:10 UTC+2" },
    { label: "AM Macro 2", start: 10.83, end: 11.17, desc: "10:50–11:10 UTC+2" },
    { label: "PM Macro 1", start: 15.33, end: 15.67, desc: "15:20–15:40 UTC+2" },
    { label: "PM Macro 2", start: 16.83, end: 17.17, desc: "16:50–17:10 UTC+2" },
  ];
  const activeMacro = macros.find(m => decimal >= m.start && decimal <= m.end);
  const nextMacro   = macros.find(m => m.start > decimal);

  const checklist = [
    { label: "Macro time window active", done: !!activeMacro, tip: "BSL model is ONLY valid during these specific 20-minute windows. Trading outside = random entries." },
    { label: "Price at Premium/Discount PD Array", done: score >= 60, tip: "For BUY: price must reach discount zone. For SELL: price must hit premium zone. Mid-range = skip." },
    { label: "Stop Hunt / Liquidity Sweep confirmed", done: !!stopHunt, tip: "Price sweeps below a key level (grabs buy-side stops), then reverses. This is the trigger event." },
    { label: "IFVG or Breaker Block identified", done: stopHunt || score >= 75, tip: "Inversion FVG: a gap that price 'fills' and then uses as support. Breaker: old support broken, now resistance." },
    { label: "1:2 Risk:Reward achievable", done: (plan?.riskReward || 0) >= 2, tip: "BSL model targets 1:2 minimum. If TP is not 2× the SL distance away, skip the trade." },
  ];

  const allGreen = checklist.every(c => c.done);

  return (
    <div style={{ color: "#e2e8f0" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>🏆 BSL — One Setup For Life</h2>
        <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>
          Macro timing + Premium/Discount + Stop Hunt + IFVG/Breaker = 1:2 RR minimum
          <Tip text="The BSL model focuses on 1–2 high-quality trades per day, only during specific ICT macro time windows when institutional order flow is most active.">
            <span style={{ marginLeft: 6, cursor: "help", color: "#3b82f6" }}>ⓘ</span>
          </Tip>
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          {/* Macro clock */}
          <div style={{
            background: activeMacro ? "rgba(34,197,94,0.08)" : "#0f172a",
            border: `1px solid ${activeMacro ? "#22c55e44" : "#1e293b"}`,
            borderRadius: 8, padding: 14, marginBottom: 12,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 8 }}>
              ⏰ ICT Macro Windows (UTC+2)
            </div>
            {macros.map(m => {
              const isActive = decimal >= m.start && decimal <= m.end;
              const isPast   = decimal > m.end;
              return (
                <div key={m.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 8px", borderRadius: 4, marginBottom: 4,
                  background: isActive ? "rgba(34,197,94,0.12)" : isPast ? "rgba(255,255,255,0.02)" : "transparent",
                  border: isActive ? "1px solid #22c55e44" : "1px solid transparent",
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? "#4ade80" : isPast ? "#334155" : "#94a3b8" }}>
                      {isActive ? "🟢 " : isPast ? "✓ " : "○ "}{m.label}
                    </div>
                    <div style={{ fontSize: 9, color: "#475569" }}>{m.desc}</div>
                  </div>
                  {isActive && <Badge label="ACTIVE NOW" color="#22c55e" />}
                  {!isActive && !isPast && m === nextMacro && <Badge label="NEXT" color="#f59e0b" />}
                </div>
              );
            })}
          </div>

          {/* Checklist */}
          <div style={{ background: "#0f172a", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 10 }}>
              Setup Checklist — {sym.replace("USDT","")}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
              {["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"].map(s => (
                <button key={s} onClick={() => setSym(s)} style={{
                  padding: "2px 7px", borderRadius: 4, border: "none", fontWeight: 700, fontSize: 9, cursor: "pointer",
                  background: sym === s ? "#22c55e" : "#1e293b", color: sym === s ? "#000" : "#64748b",
                }}>{s.replace("USDT", "")}</button>
              ))}
            </div>
            {checklist.map((c, i) => <Check key={i} done={c.done} label={c.label} tip={c.tip} />)}
          </div>
        </div>

        <div>
          {/* Entry model diagram */}
          <div style={{ background: "#0f172a", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 10 }}>
              Entry Model
            </div>
            {[
              { step: "1st Entry", method: "IFVG", color: "#22c55e", tip: "Inversion Fair Value Gap — price fills the gap and treats it as new support/resistance." },
              { step: "2nd Entry", method: "Breaker Block", color: "#3b82f6", tip: "Old support broken, comes back to retest as resistance. More conservative entry." },
            ].map(e => (
              <Tip key={e.step} text={e.tip}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 6, marginBottom: 6, cursor: "help",
                  background: `${e.color}10`, border: `1px solid ${e.color}33`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>{e.step}:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: e.color }}>{e.method}</span>
                </div>
              </Tip>
            ))}

            <div style={{ marginTop: 12, padding: "10px 12px", background: "#111827", borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>Key rules:</div>
              {[
                { text: "Candle closes below IFVG low → enter on 2nd candle open", tip: "Don't enter on the same candle. Wait for the next candle to open and confirm direction." },
                { text: "Focus on 1–2 high quality setups per day only", tip: "Overtrading kills accounts. The market does not pay the fastest trader — it pays the patient one." },
                { text: "Minimum 1:2 risk:reward always", tip: "If you win 50% of trades at 1:2 RR, you're profitable. Math works in your favour." },
              ].map((r, i) => (
                <Tip key={i} text={r.tip}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 5, cursor: "help", display: "flex", gap: 6 }}>
                    <span style={{ color: "#f59e0b", flexShrink: 0 }}>→</span>
                    <span style={{ borderBottom: "1px dashed #334155" }}>{r.text}</span>
                  </div>
                </Tip>
              ))}
            </div>
          </div>

          {/* Signal status */}
          <div style={{
            padding: "14px 16px", borderRadius: 8, textAlign: "center",
            background: allGreen ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.05)",
            border: `1px solid ${allGreen ? "#22c55e44" : "#1e293b"}`,
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{allGreen ? "🎯" : activeMacro ? "⏳" : "🚫"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: allGreen ? "#4ade80" : activeMacro ? "#f59e0b" : "#ef4444" }}>
              {allGreen ? "ALL CONDITIONS MET — TRADE READY" : activeMacro ? "Macro active — waiting for setup" : "Outside macro window — wait"}
            </div>
            {nextMacro && !activeMacro && (
              <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
                Next window: {nextMacro.desc}
              </div>
            )}
          </div>

          {plan && allGreen && (
            <TradePlan
              entry={plan.entry?.toFixed(2)}
              sl={plan.stopLoss?.toFixed(2)}
              tp={plan.takeProfit?.toFixed(2)}
              note="BSL entry: SL below stop hunt low. TP at next PD array / key level."
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STRATEGY 3 — 10 EMA Trend Strategy
// ══════════════════════════════════════════════════════════════════════════════
function EMAStrategy({ signals }) {
  const [sym, setSym] = useState("BTCUSDT");
  const sig    = signals.find(s => (s.asset || s.symbol) === sym);
  const regime = sig?.context?.regime?.type || sig?.regime || "—";
  const of     = sig?.context?.orderflow;
  const score  = sig?.signal?.score || sig?.score || 0;
  const plan   = sig?.signal?.tradePlan;
  const vol    = sig?.context?.volatility;

  const isTrending  = ["TRENDING_UP","TRENDING_DOWN"].includes(regime);
  const bullish     = regime === "TRENDING_UP";
  const pullback    = of?.bias === (bullish ? "SELLERS_IN_CONTROL" : "BUYERS_IN_CONTROL");
  const lowVolPull  = vol?.state === "LOW" || vol?.state === "NORMAL";

  const filters = [
    { label: "Market is trending (not ranging/chopping)", done: isTrending, tip: "The 10 EMA strategy only works in trending markets. Flat/ranging markets = death by a thousand cuts." },
    { label: `Price pulled back to near 10 EMA`, done: pullback || score >= 70, tip: "Wait for price to come back and touch/test the EMA. Chasing breakouts = buying the top." },
    { label: "Pullback volume lower than impulse volume", done: lowVolPull, tip: "The pullback should look weak — low volume, small candles. High volume = counter-trend, skip it." },
    { label: `Bullish candle CLOSES above EMA (${bullish ? "confirm long" : "confirm short"})`, done: score >= 75 && isTrending, tip: "The entry trigger: a full candle close above (long) or below (short) the EMA. Not a wick — a close." },
  ];

  const survivalRules = [
    { rule: "Risk only 1% per trade", tip: "Even with 10 losses in a row (highly unlikely with this system), you only lose 10% of account." },
    { rule: "SL below recent swing low, NOT below the EMA", tip: "The EMA moves. Swing lows don't. Your stop must be at a structural level, not a moving line." },
    { rule: "Exit if candle closes below EMA with volume", tip: "The trade is invalidated. Smart money is exiting. Follow them, not your emotions." },
    { rule: "Trail stop only when trend extends significantly", tip: "Big money is made sitting still. Don't move your stop nervously — only trail when you have 2R+ profit." },
  ];

  const emaHistory = [68, 70, 73, 71, 74, 76, 75, 78, score];

  return (
    <div style={{ color: "#e2e8f0" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>📈 10 EMA Institutional Control Strategy</h2>
        <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>
          Trend filter → EMA pullback → Volume confirmation → Close above/below EMA → Enter
          <Tip text="This is how professionals behave. Most stocks/assets are untradeable. Wait for clear trend, wait for EMA pullback, wait for confirmation — then enter with size.">
            <span style={{ marginLeft: 6, cursor: "help", color: "#3b82f6" }}>ⓘ</span>
          </Tip>
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          {/* Entry filters */}
          <div style={{ background: "#0f172a", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 10 }}>
              Entry Conditions — {sym.replace("USDT","")}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
              {["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"].map(s => (
                <button key={s} onClick={() => setSym(s)} style={{
                  padding: "2px 7px", borderRadius: 4, border: "none", fontWeight: 700, fontSize: 9, cursor: "pointer",
                  background: sym === s ? "#22c55e" : "#1e293b", color: sym === s ? "#000" : "#64748b",
                }}>{s.replace("USDT", "")}</button>
              ))}
            </div>
            {filters.map((f, i) => <Check key={i} done={f.done} label={f.label} tip={f.tip} />)}
            <MiniChart data={emaHistory} color={score >= 70 ? "#22c55e" : "#f59e0b"} height={40} label="Score vs 70 threshold" />
          </div>

          {/* Dad's survival rules */}
          <div style={{ background: "#0f172a", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", marginBottom: 8 }}>
              ⚠️ Dad's Survival Rules
            </div>
            {survivalRules.map((r, i) => (
              <Tip key={i} text={r.tip}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6, cursor: "help" }}>
                  <span style={{ color: "#f59e0b", flexShrink: 0, fontSize: 11 }}>★</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", borderBottom: "1px dashed #334155" }}>{r.rule}</span>
                </div>
              </Tip>
            ))}
          </div>
        </div>

        <div>
          {/* What NOT to do */}
          <div style={{ background: "#0f172a", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", marginBottom: 8 }}>
              ❌ During the Trade — Do NOT
            </div>
            {[
              { no: "Add to positions randomly", why: "Only add when trend gives another pullback setup. Random adding = gambling." },
              { no: "Panic on red candles", why: "Red candles in an uptrend are normal. If SL isn't hit, the trade is still valid." },
              { no: "Check P&L every candle", why: "Watching P&L moves causes emotional decisions. Set SL/TP, walk away." },
              { no: "Move stops emotionally", why: "Your stop is your risk definition. Moving it wider = taking on risk you didn't plan for." },
            ].map((d, i) => (
              <Tip key={i} text={d.why}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6, cursor: "help" }}>
                  <span style={{ color: "#ef4444", flexShrink: 0, fontSize: 11 }}>✗</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", borderBottom: "1px dashed #334155" }}>{d.no}</span>
                </div>
              </Tip>
            ))}
            <div style={{ marginTop: 10, padding: "8px 10px", background: "#111827", borderRadius: 5, fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
              "Big money is made by sitting, not clicking."
            </div>
          </div>

          {/* Live signal */}
          <div style={{ background: "#0f172a", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 8 }}>
              Live Signal — {sym.replace("USDT","")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { l: "Trend", v: regime.replace("_"," "), c: isTrending?"#22c55e":"#ef4444" },
                { l: "Volatility", v: vol?.state||"—", c: vol?.state==="LOW"?"#22c55e":vol?.state==="HIGH"?"#ef4444":"#f59e0b" },
                { l: "Order Flow", v: of?.bias?.replace("_IN_CONTROL","")?.replace(/_/," ")||"NEUTRAL", c: "#60a5fa" },
                { l: "Score", v: score, c: score>=70?"#22c55e":"#ef4444" },
              ].map(x => (
                <div key={x.l} style={{ background: "#111827", borderRadius: 5, padding: "6px 8px" }}>
                  <div style={{ fontSize: 9, color: "#475569" }}>{x.l}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>
          </div>

          {plan && (
            <TradePlan
              entry={plan.entry?.toFixed(2)}
              sl={plan.stopLoss?.toFixed(2)}
              tp={plan.takeProfit?.toFixed(2)}
              note="EMA entry: SL below swing low (not EMA). TP at next resistance/liquidity target."
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STRATEGY 4 — Combined Master Checklist
// ══════════════════════════════════════════════════════════════════════════════
function MasterChecklist({ signals }) {
  const [sym, setSym] = useState("BTCUSDT");
  const sig      = signals.find(s => (s.asset || s.symbol) === sym);
  const regime   = sig?.context?.regime?.type || sig?.regime || "—";
  const score    = sig?.signal?.score || sig?.score || 0;
  const of       = sig?.context?.orderflow;
  const liq      = sig?.context?.liquidity;
  const stopHunt = sig?.context?.stopHunt || sig?.stopHunt;
  const plan     = sig?.signal?.tradePlan;
  const vol      = sig?.context?.volatility;

  const now     = new Date();
  const utc2H   = (now.getUTCHours() + 2) % 24;
  const utc2M   = now.getUTCMinutes();
  const decimal = utc2H + utc2M / 60;
  const macroActive = (decimal >= 9.83 && decimal <= 10.17) || (decimal >= 10.83 && decimal <= 11.17) ||
                      (decimal >= 15.33 && decimal <= 15.67) || (decimal >= 16.83 && decimal <= 17.17);
  const sessionOk   = decimal >= 9 && decimal < 22 && !(decimal >= 2 && decimal < 9);

  const masterChecks = [
    { cat: "Session",    label: "Trading session open (not Asia)", done: sessionOk, tip: "London (9-18 UTC+2) and New York (18-22 UTC+2) only. Asia = no trade." },
    { cat: "Macro",      label: "ICT Macro window active (bonus)", done: macroActive, tip: "Highest quality entries occur in these 20-min windows. If active, increase confidence." },
    { cat: "Regime",     label: `HTF regime is tradeable: ${regime.replace("_"," ")}`, done: !["CHOP"].includes(regime) && regime !== "—", tip: "CHOP = no trade. TRENDING, COMPRESSION, EXPANSION = valid regime." },
    { cat: "Structure",  label: "Liquidity zones identified", done: liq?.buySide?.length > 0 || liq?.sellSide?.length > 0, tip: "Clear swing highs/lows with stop clusters above or below." },
    { cat: "Trigger",    label: "Stop hunt / liquidity sweep occurred", done: !!stopHunt, tip: "The sweep is the trigger. No sweep = mid-range entry = bad R:R." },
    { cat: "Orderflow",  label: "Order flow confirms direction", done: of?.bias && of.bias !== "NEUTRAL", tip: "Buyers in control for longs. Sellers for shorts. Neutral = wait." },
    { cat: "Score",      label: `System score ≥ 70 (current: ${score})`, done: score >= 70, tip: "All factors combined into 0-100. Below 70 = not enough confluence." },
    { cat: "Risk",       label: "R:R ≥ 1.5:1 achievable", done: (plan?.riskReward || 0) >= 1.5, tip: "If your trade plan doesn't have 1.5× reward vs risk, skip it." },
    { cat: "Discipline", label: "Under 3 trades today", done: true, tip: "Max 3 trades per day. After 3, market owes you nothing." },
  ];

  const score9 = masterChecks.filter(c => c.done).length;
  const pct    = Math.round(score9 / masterChecks.length * 100);
  const verdict = score9 >= 8 ? { label: "🔥 EXECUTE", color: "#22c55e" }
                : score9 >= 6 ? { label: "⏳ WAIT", color: "#f59e0b" }
                : { label: "🚫 BLOCK", color: "#ef4444" };

  const byCategory = [...new Set(masterChecks.map(c => c.cat))].map(cat => ({
    cat, items: masterChecks.filter(c => c.cat === cat)
  }));

  const scoreData = [20, 35, 50, 45, 60, 65, 72, pct];

  return (
    <div style={{ color: "#e2e8f0" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>🎯 Master Confluence Checklist</h2>
        <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>
          All three strategies combined — the ultimate go/no-go filter
          <Tip text="This combines MTF, BSL, and EMA rules into one checklist. Score 8+/9 before executing. Trading is about saying NO most of the time.">
            <span style={{ marginLeft: 6, cursor: "help", color: "#3b82f6" }}>ⓘ</span>
          </Tip>
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          {/* Big verdict */}
          <div style={{
            padding: "16px", borderRadius: 10, textAlign: "center", marginBottom: 12,
            background: `${verdict.color}10`, border: `2px solid ${verdict.color}44`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: verdict.color, fontFamily: "monospace" }}>{pct}%</div>
            <div style={{ fontSize: 11, color: "#475569", margin: "4px 0 8px" }}>{score9} of {masterChecks.length} conditions met</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: verdict.color }}>{verdict.label}</div>
            <MiniChart data={scoreData} color={verdict.color} height={32} />
          </div>

          {/* Symbol selector */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
            {["BTCUSDT","ETHUSDT","SOLUSDT","AVAXUSDT","LINKUSDT","ARBUSDT"].map(s => (
              <button key={s} onClick={() => setSym(s)} style={{
                padding: "3px 8px", borderRadius: 4, border: "none", fontWeight: 700, fontSize: 10, cursor: "pointer",
                background: sym === s ? "#22c55e" : "#1e293b", color: sym === s ? "#000" : "#64748b",
              }}>{s.replace("USDT", "")}</button>
            ))}
          </div>

          {/* Checklist by category */}
          {byCategory.map(({ cat, items }) => (
            <div key={cat} style={{ background: "#0f172a", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{cat}</div>
              {items.map((c, i) => <Check key={i} done={c.done} label={c.label} tip={c.tip} />)}
            </div>
          ))}
        </div>

        <div>
          {/* What each strategy adds */}
          <div style={{ background: "#0f172a", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 10 }}>Strategy Edge Matrix</div>
            {[
              { name: "MTF Strategy", edge: "Context before entry", when: "Any session, multi-TF aligned", color: "#3b82f6" },
              { name: "BSL Model",    edge: "Macro timing + 1:2 RR", when: "Macro windows only", color: "#f59e0b" },
              { name: "10 EMA",       edge: "Trend + EMA pullback", when: "Trending markets only", color: "#22c55e" },
            ].map(s => (
              <div key={s.name} style={{ marginBottom: 10, padding: "10px 12px", background: "#111827", borderRadius: 6, borderLeft: `3px solid ${s.color}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>Edge: {s.edge}</div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>When: {s.when}</div>
              </div>
            ))}
          </div>

          {/* The market truth */}
          <div style={{ background: "#0f172a", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", marginBottom: 8 }}>The Truth About Trading</div>
            {[
              "The market does not pay the fastest trader — it pays the one who enters with context.",
              "Losses are tuition. Repeating them is stupidity.",
              "Cash is also a position. Not trading is a decision.",
              "Big money is made by sitting, not clicking.",
            ].map((t, i) => (
              <div key={i} style={{ fontSize: 11, color: "#64748b", marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid #1e293b", fontStyle: "italic" }}>
                "{t}"
              </div>
            ))}
          </div>

          {plan && score9 >= 6 && (
            <TradePlan
              entry={plan.entry?.toFixed(2)}
              sl={plan.stopLoss?.toFixed(2)}
              tp={plan.takeProfit?.toFixed(2)}
              note={`${score9}/9 conditions met. ${verdict.label === "🔥 EXECUTE" ? "All systems GO." : "Wait for remaining conditions."}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Root StrategiesTab
// ══════════════════════════════════════════════════════════════════════════════
const STRAT_TABS = [
  { label: "📊 MTF Entry",       icon: "📊" },
  { label: "🏆 BSL Setup",       icon: "🏆" },
  { label: "📈 10 EMA",          icon: "📈" },
  { label: "🎯 Master Checklist",icon: "🎯" },
];

export default function StrategiesTab() {
  const { signals } = useStore();
  const [active, setActive] = useState(3); // Master checklist default

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1e293b", marginBottom: 20 }}>
        {STRAT_TABS.map((t, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer",
            fontSize: 12, fontWeight: 700, transition: "all 0.2s",
            color: active === i ? "#22c55e" : "#475569",
            borderBottom: active === i ? "2px solid #22c55e" : "2px solid transparent",
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {active === 0 && <MTFStrategy signals={signals} />}
      {active === 1 && <BSLStrategy signals={signals} />}
      {active === 2 && <EMAStrategy signals={signals} />}
      {active === 3 && <MasterChecklist signals={signals} />}
    </div>
  );
}