// Logger - structured logging with levels and timestamps
const fs   = require("fs");
const path = require("path");

const LOG_DIR  = path.join(__dirname, "..", "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "system.log");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString();
}

function write(level, message, data) {
  const entry = {
    ts: timestamp(),
    level,
    message,
    ...(data ? { data } : {})
  };
  const line = JSON.stringify(entry);

  // Console
  const prefix = level === "ERROR" ? "❌" : level === "WARN" ? "⚠️" : level === "SIGNAL" ? "🔥" : "ℹ️";
  console.log(`${prefix} [${entry.ts}] ${message}`, data ? JSON.stringify(data) : "");

  // File
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch (e) { /* non-critical */ }
}

const logger = {
  info:   (msg, data) => write("INFO",   msg, data),
  warn:   (msg, data) => write("WARN",   msg, data),
  error:  (msg, data) => write("ERROR",  msg, data),
  signal: (msg, data) => write("SIGNAL", msg, data)
};

module.exports = logger;
