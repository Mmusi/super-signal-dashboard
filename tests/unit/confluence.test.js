// Unit tests — Confluence Scoring Engine
const { calculateConfluence } = require("../backend/src/core/scoring/ConfluenceEngine");

describe("ConfluenceEngine", () => {
  test("strong setup returns high score", () => {
    const score = calculateConfluence({
      regime:     { type: "COMPRESSION" },
      compression:{ score: 80 },
      liquidity:  { stopHunt: { signal: "BULLISH_REVERSAL" }, buySide: [{ price: 100 }], sellSide: [] },
      orderflow:  { bias: "BUYERS_IN_CONTROL" },
      absorption: { absorption: true },
      volatility: { state: "LOW" }
    });
    expect(score).toBeGreaterThanOrEqual(85);
  });

  test("CHOP regime returns low score", () => {
    const score = calculateConfluence({
      regime:     { type: "CHOP" },
      compression:{ score: 0 },
      liquidity:  null,
      orderflow:  { bias: "NEUTRAL" },
      absorption: { absorption: false },
      volatility: { state: "NORMAL" }
    });
    expect(score).toBeLessThan(75);
  });

  test("score is capped at 100", () => {
    const score = calculateConfluence({
      regime:     { type: "COMPRESSION" },
      compression:{ score: 100 },
      liquidity:  { stopHunt: true, buySide: [{}], sellSide: [{}] },
      orderflow:  { bias: "BUYERS_IN_CONTROL" },
      absorption: { absorption: true },
      volatility: { state: "LOW" }
    });
    expect(score).toBeLessThanOrEqual(100);
  });
});
