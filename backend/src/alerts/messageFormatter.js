// Message Formatter - formats signals into clean Telegram messages
function formatSignal(signal) {
  const dir = signal.direction ? `${signal.direction}` : "";
  const emoji = signal.direction === "LONG" ? "🟢" : signal.direction === "SHORT" ? "🔴" : "🟡";

  return `
🔥 *NEW TRADE SIGNAL*

📊 Asset: *${signal.asset}*
🎯 Direction: *${signal.action} ${dir}* ${emoji}
🧠 Score: *${signal.score}/100*
📉 Regime: *${signal.regime}*

────────────────────

📍 ENTRY: \`${signal.entry ? signal.entry.toFixed(4) : "N/A"}\`
⛔ SL:    \`${signal.sl    ? signal.sl.toFixed(4)    : "N/A"}\`
🎯 TP:    \`${signal.tp    ? signal.tp.toFixed(4)    : "N/A"}\`

────────────────────

💧 Liquidity + Order Flow Confirmed
⚡ System Confidence: ${signal.score >= 90 ? "VERY HIGH" : signal.score >= 80 ? "HIGH" : "MODERATE"}
  `.trim();
}

module.exports = { formatSignal };
