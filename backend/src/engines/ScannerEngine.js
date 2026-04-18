// Scanner Engine - scans all tracked assets, returns ranked signal list
const { runLiveBrain } = require("./live/LiveBrain");
const { rankSignals } = require("../core/scoring/signalRanker");

const scannedResults = {};

function updateScan(symbol, candles) {
  const result = runLiveBrain(symbol, candles);
  if (result) scannedResults[symbol] = result;
}

function getTopSignals() {
  const all = Object.values(scannedResults);
  return rankSignals(all);
}

function getAllSignals() {
  return Object.values(scannedResults);
}

module.exports = { updateScan, getTopSignals, getAllSignals };
