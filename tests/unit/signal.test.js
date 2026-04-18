// Unit tests — Signal Engine (generate signal from context)
const { generateSignal } = require("../backend/src/engines/SignalEngine");

function makeContext(overrides = {}) {
  return {
    regime:     { type: "COMPRESSION", confidence: 80 },
    compression:{ score: 75 },
    liquidity:  { buySide: [], sellSide: [] },
    stopHunt:   null,
    orderflow:  { bias: "BUYERS_IN_CONTROL" },
    absorption: { absorption: true },
    volatility: { atr: 50, state: "LOW" },
    ...overrides
  };
}

describe("SignalEngine", () => {
  test("returns TRADE for high-score setup", () => {
    const ctx = makeContext({
      regime:     { type: "COMPRESSION", confidence: 90 },
      compression:{ score: 90 },
      stopHunt:   { signal: "BULLISH_REVERSAL" }
    });
    const sig = generateSignal(ctx);
    expect(sig.action).toBe("TRADE");
    expect(sig.score).toBeGreaterThanOrEqual(85);
  });

  test("returns NO_TRADE for CHOP regime", () => {
    const ctx = makeContext({
      regime:     { type: "CHOP", confidence: 0 },
      compression:{ score: 0 },
      absorption: { absorption: false },
      orderflow:  { bias: "NEUTRAL" }
    });
    const sig = generateSignal(ctx);
    expect(sig.action).toBe("NO_TRADE");
  });

  test("signal always has a numeric score", () => {
    const ctx = makeContext();
    const sig = generateSignal(ctx);
    expect(typeof sig.score).toBe("number");
  });
});
