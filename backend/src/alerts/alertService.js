// Alert Service - filters + throttles signals before sending to Telegram
// Rules: score >= 80 only | 30s cooldown per asset | TRADE action only
const { sendMessage }  = require("./telegramBot");
const { formatSignal } = require("./messageFormatter");

const lastSignalTime = {};
const COOLDOWN_MS    = 30000; // 30 second cooldown per asset
const MIN_SCORE      = 80;    // only strong signals

function shouldSend(symbol, score, action) {
  if (action === "NO_TRADE" || action === "WATCH") return false;
  if (score < MIN_SCORE) return false;

  const now = Date.now();
  if (lastSignalTime[symbol] && now - lastSignalTime[symbol] < COOLDOWN_MS) return false;

  lastSignalTime[symbol] = now;
  return true;
}

async function processSignal(signal) {
  if (!signal) return;
  if (!shouldSend(signal.asset, signal.score, signal.action)) return;

  const message = formatSignal(signal);
  await sendMessage(message);
  console.log(`📲 Telegram alert sent: ${signal.asset} ${signal.action} ${signal.direction} [${signal.score}]`);
}

module.exports = { processSignal };
