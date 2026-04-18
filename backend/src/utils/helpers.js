// General helpers used across backend
function safeGet(obj, path, fallback = null) {
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object") return acc[key];
    return fallback;
  }, obj) ?? fallback;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function formatPrice(price, decimals = 4) {
  if (!price) return "N/A";
  return parseFloat(price).toFixed(decimals);
}

module.exports = { safeGet, sleep, chunk, formatPrice };
