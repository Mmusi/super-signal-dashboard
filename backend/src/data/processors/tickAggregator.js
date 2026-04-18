// Tick Aggregator - accumulates raw ticks into volume buckets
class TickAggregator {
  constructor() {
    this.ticks = [];
    this.buyVolume = 0;
    this.sellVolume = 0;
  }

  add(tick) {
    this.ticks.push(tick);
    if (tick.isBuyerMaker) {
      this.sellVolume += tick.volume; // buyer is maker = sell order filled
    } else {
      this.buyVolume += tick.volume;
    }
    if (this.ticks.length > 1000) this.ticks.shift();
  }

  getImbalance() {
    const total = this.buyVolume + this.sellVolume;
    if (total === 0) return 0.5;
    return this.buyVolume / total;
  }

  reset() {
    this.ticks = [];
    this.buyVolume = 0;
    this.sellVolume = 0;
  }
}

module.exports = { TickAggregator };
