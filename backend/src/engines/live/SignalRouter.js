// Signal Router - routes validated signals to Telegram + React Dashboard
// Central nervous system output layer: signal → world
const { processSignal } = require("../../alerts/alertService");

let broadcaster = null;

function setBroadcaster(bc) {
  broadcaster = bc;
}

function routeSignal(payload) {
  if (!payload || !payload.signal) return null;

  const formatted = {
    asset:     payload.symbol,
    action:    payload.signal.action,
    direction: payload.signal.direction,
    score:     payload.signal.score,
    regime:    payload.context ? payload.context.regime.type : payload.regime,
    entry:     payload.signal.tradePlan?.entry     || payload.tradePlan?.entry,
    sl:        payload.signal.tradePlan?.stopLoss  || payload.tradePlan?.stopLoss,
    tp:        payload.signal.tradePlan?.takeProfit|| payload.tradePlan?.takeProfit,
    stopHunt:  payload.context?.stopHunt   || null,
    absorption:payload.context?.absorption || null,
    orderflow: payload.context?.orderflow  || null,
    timestamp: payload.timestamp || Date.now()
  };

  // 🔔 Send to Telegram
  processSignal(formatted);

  // 📡 Broadcast to React Dashboard via WebSocket
  if (broadcaster) {
    broadcaster.broadcast({ type: "SIGNAL_UPDATE", data: formatted });
  }

  return formatted;
}

module.exports = { routeSignal, setBroadcaster };
