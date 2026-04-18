-- Trade Event Store Schema
-- Stores every trade event (live + backtest) with full decision context
-- This is the TRUTH LAYER - enables strategy analytics + performance validation

CREATE TABLE IF NOT EXISTS trades (
  id              TEXT PRIMARY KEY,

  asset           TEXT,
  direction       TEXT,        -- LONG | SHORT

  entry_price     REAL,
  exit_price      REAL,

  entry_time      INTEGER,
  exit_time       INTEGER,

  pnl             REAL,
  r_multiple      REAL,

  result          TEXT,        -- WIN | LOSS

  setup_type      TEXT,        -- COMPRESSION | LIQUIDITY_SWEEP | TREND

  regime          TEXT,        -- COMPRESSION | EXPANSION | CHOP | TREND

  liquidity_sweep INTEGER,     -- 0 | 1 boolean
  absorption      INTEGER,     -- 0 | 1 boolean

  orderflow_bias  TEXT,        -- BUYERS_IN_CONTROL | SELLERS_IN_CONTROL | NEUTRAL

  score           INTEGER,

  sl              REAL,
  tp              REAL
);

CREATE INDEX IF NOT EXISTS idx_trades_asset   ON trades(asset);
CREATE INDEX IF NOT EXISTS idx_trades_regime  ON trades(regime);
CREATE INDEX IF NOT EXISTS idx_trades_result  ON trades(result);
CREATE INDEX IF NOT EXISTS idx_trades_setup   ON trades(setup_type);
