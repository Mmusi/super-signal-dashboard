// Candle Builder - converts raw Binance kline stream data into OHLCV candle objects
// Maintains a rolling window of 500 candles per symbol

class CandleBuilder {
  constructor() {
    this.candles = {};
  }

  update(symbol, kline) {
    if (!this.candles[symbol]) {
      this.candles[symbol] = [];
    }

    const candle = {
      open:   parseFloat(kline.o),
      high:   parseFloat(kline.h),
      low:    parseFloat(kline.l),
      close:  parseFloat(kline.c),
      volume: parseFloat(kline.v),
      time:   kline.t
    };

    // On closed candle (kline.x = true), push; otherwise update last
    if (kline.x) {
      this.candles[symbol].push(candle);
      if (this.candles[symbol].length > 500) {
        this.candles[symbol].shift();
      }
    } else {
      // Update in-progress candle
      const arr = this.candles[symbol];
      if (arr.length > 0) {
        arr[arr.length - 1] = candle;
      } else {
        arr.push(candle);
      }
    }
  }

  seed(symbol, candles) {
    this.candles[symbol] = candles.slice(-500);
  }

  get(symbol) {
    return this.candles[symbol] || [];
  }
}

module.exports = new CandleBuilder();
