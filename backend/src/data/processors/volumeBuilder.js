// Volume Builder - calculates volume profile and volume-weighted averages
function volumeProfile(candles) {
  const profile = {};
  for (const c of candles) {
    const priceKey = Math.round(c.close / 10) * 10; // bucket by $10
    profile[priceKey] = (profile[priceKey] || 0) + c.volume;
  }
  return profile;
}

function vwap(candles) {
  let cumTPV = 0;
  let cumVol = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume;
    cumVol += c.volume;
  }
  return cumVol === 0 ? 0 : cumTPV / cumVol;
}

module.exports = { volumeProfile, vwap };
