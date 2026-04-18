// Position Sizer - calculates trade size based on account risk %
function positionSize(accountBalance, riskPercent, entry, sl) {
  const riskAmount = accountBalance * (riskPercent / 100);
  const riskPerUnit = Math.abs(entry - sl);

  if (riskPerUnit === 0) return 0;

  const size = riskAmount / riskPerUnit;
  return parseFloat(size.toFixed(4));
}

module.exports = { positionSize };
