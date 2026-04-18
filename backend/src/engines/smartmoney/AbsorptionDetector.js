// Absorption Detector (smartmoney) - high volume + no continuation = institutional absorption
function detectAbsorption(candles, sweeps) {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  if (!last || !prev) return sweeps.map(s => ({ ...s, absorption: false }));

  const volumeSpike    = last.volume > prev.volume * 1.8;
  const noContinuation = Math.abs(last.close - last.open) < (last.high - last.low) * 0.3;

  return sweeps.map(s => ({
    ...s,
    absorption: volumeSpike && noContinuation
  }));
}

module.exports = { detectAbsorption };
