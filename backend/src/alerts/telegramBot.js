// Telegram Bot - sends trade signals to Telegram channel/chat
// Uses Telegram Bot API (free)
const fetch = require("node-fetch");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID        = process.env.TELEGRAM_CHAT_ID;

async function sendMessage(message) {
  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    // Telegram not configured - skip silently
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  try {
    await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:    CHAT_ID,
        text:       message,
        parse_mode: "Markdown"
      })
    });
  } catch (err) {
    console.error("Telegram error:", err.message);
  }
}

module.exports = { sendMessage };
