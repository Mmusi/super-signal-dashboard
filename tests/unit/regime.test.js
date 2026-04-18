// Unit tests — Regime Classifier
const { classifyRegime } = require("../backend/src/core/regime/RegimeClassifier");
const { ATR }            = require("../backend/src/core/regime/ATRCalculator");

function mockCandles(count, pattern = "flat") {
  const candles = [];
  let price = 100;

  for (let i = 0; i < count; i++) {
    if      (pattern === "up")   price += 0.2;
    else if (pattern === "down") price -= 0.2;
    else                         price += (Math.random() - 0.5) * 0.1;

    candles.push({
      open:   price,
      high:   price + 0.05,
      low:    price - 0.05,
      close:  price,
      volume: 100,
      time:   Date.now() + i * 60000
    });
  }

  return candles;
}

describe("RegimeClassifier", () => {
  test("classifies uptrend correctly", () => {
    const candles = mockCandles(50, "up");
    const result  = classifyRegime(candles);
    expect(result.regime).toBe("TRENDING_UP");
  });

  test("classifies downtrend correctly", () => {
    const candles = mockCandles(50, "down");
    const result  = classifyRegime(candles);
    expect(result.regime).toBe("TRENDING_DOWN");
  });

  test("returns a confidence number", () => {
    const candles = mockCandles(50, "flat");
    const result  = classifyRegime(candles);
    expect(typeof result.confidence).toBe("number");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe("ATRCalculator", () => {
  test("returns positive ATR for normal candles", () => {
    const candles = mockCandles(50, "flat");
    const atr     = ATR(candles);
    expect(atr).toBeGreaterThan(0);
  });

  test("returns 0 for insufficient candles", () => {
    const atr = ATR([], 14);
    expect(atr).toBe(0);
  });
});
