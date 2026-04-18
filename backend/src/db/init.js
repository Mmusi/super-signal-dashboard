// Database Initialization - creates schema on first run
const fs = require("fs");
const db = require("./db");

function initDB() {
  const schemaPath = __dirname + "/schema.sql";
  const schema = fs.readFileSync(schemaPath, "utf-8");

  db.exec(schema, (err) => {
    if (err) {
      console.error("DB Init Error:", err.message);
    } else {
      console.log("🟢 Trade DB initialized");
    }
  });
}

module.exports = { initDB };
