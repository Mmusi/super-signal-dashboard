// Market Brain - central decision controller that coordinates all engines
const { updateScan, getTopSignals } = require("./ScannerEngine");
const { routeSignal } = require("./live/SignalRouter");

let broadcaster = null;

function setBroadcaster(bc) {
  broadcaster = bc;
}

function processFeedUpdate({ symbol, candles }) {
  updateScan(symbol, candles);

  const top = getTopSignals();

  if (broadcaster) {
    broadcaster.broadcast({ type: "SCANNER_UPDATE", data: top });
  }
}

function getMarketState() {
  return {
    topSignals: getTopSignals(),
    timestamp: Date.now()
  };
}

module.exports = { processFeedUpdate, getMarketState, setBroadcaster };
