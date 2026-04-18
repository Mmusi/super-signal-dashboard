// Capital Distribution Model - converts normalized weights → real dollar allocations
function distributeCapital(weights, totalCapital) {
  const allocation = {};

  Object.entries(weights).forEach(([strategy, weight]) => {
    allocation[strategy] = {
      capital: +(totalCapital * weight).toFixed(2),
      weight:  +weight.toFixed(4)
    };
  });

  return allocation;
}

module.exports = { distributeCapital };
