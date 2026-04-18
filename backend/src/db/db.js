// SQLite Database Connection
// Uses SQLite for lightweight local storage - upgrade path: PostgreSQL
const sqlite3 = require("sqlite3").verbose();
const path    = require("path");

const DB_PATH = path.join(__dirname, "..", "..", "..", "data", "trades.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("DB connection error:", err.message);
  } else {
    console.log("🟢 SQLite connected:", DB_PATH);
  }
});

module.exports = db;
