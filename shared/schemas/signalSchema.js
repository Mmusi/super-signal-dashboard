// Signal schema validation helper
function validateSignal(signal) {
  const errors = [];

  if (!signal.asset)                             errors.push("missing asset");
  if (!["TRADE","WATCH","NO_TRADE"].includes(signal.action)) errors.push("invalid action");
  if (typeof signal.score !== "number")          errors.push("score must be number");
  if (signal.action === "TRADE" && !signal.direction) errors.push("TRADE requires direction");

  return {
    valid:  errors.length === 0,
    errors
  };
}

module.exports = { validateSignal };
