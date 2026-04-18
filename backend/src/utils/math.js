// Math utilities used across all engines
function round(val, decimals = 4) {
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  const avg = average(arr);
  const sq  = arr.map(v => (v - avg) ** 2);
  return Math.sqrt(average(sq));
}

function percentChange(from, to) {
  if (from === 0) return 0;
  return round(((to - from) / from) * 100, 2);
}

module.exports = { round, clamp, average, stdDev, percentChange };
