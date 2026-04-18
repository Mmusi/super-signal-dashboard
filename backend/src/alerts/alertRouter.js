// Alert Router - routes different alert types to correct channels
const { processSignal } = require("./alertService");
const alertTypes = require("./alertTypes");

function routeAlert(type, payload) {
  switch (type) {
    case alertTypes.SIGNAL_UPDATE:
      return processSignal(payload);
    default:
      // Other alert types handled by broadcaster
      break;
  }
}

module.exports = { routeAlert };
