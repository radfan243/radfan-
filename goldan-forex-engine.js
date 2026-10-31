/* GOLDAN AI — isolated XAUUSD analysis engine
 * Input: verified OHLC candles supplied by a data adapter or pasted JSON.
 * No broker credentials, order execution, or fabricated market prices.
 */
(function (root) {
  'use strict';
  const finite = n => Number.isFinite(Number(n));
  const ema = (values, period) => {
    if (values.length < period) return null;
    const k = 2 / (period + 1);
    let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < values.length; i++) value = values[i] * k + value * (1 - k);
    return value;
  };
  const rsi = (values, period = 14) => {
    if (values.length <= period) return null;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
      const d = values[i] - values[i - 1];
      if (d > 0) gain += d; else loss -= d;
    }
    gain /= period; loss /= period;
    for (let i = period + 1; i < values.length; i++) {
      const d = values[i] - values[i - 1];
      gain = (gain * (period - 1) + Math.max(d, 0)) / period;
      loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    }
    if (loss === 0) return 100;
    return 100 - 100 / (1 + gain / loss);
  };
  const atr = (candles, period = 14) => {
    if (candles.length <= period) return null;
    const tr = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i], p = candles[i - 1];
      tr.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
    }
    let v = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < tr.length; i++) v = (v * (period - 1) + tr[i]) / period;
    return v;
  };
  function normalize(input) {
    if (!Array.isArray(input) || input.length < 60) throw new Error('نحتاج 60 شمعة OHLC على الأقل للتحليل.');
    const rows = input.map((c, i) => {
      const row = { time: c.time ?? i, open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close), volume: Number(c.volume || 0) };
      if (![row.open, row.high, row.low, row.close].every(Number.isFinite) ||
          row.high < Math.max(row.open, row.close, row.low) ||
          row.low > Math.min(row.open, row.close, row.high)) throw new Error('بيانات الشموع غير صحيحة عند الشمعة رقم ' + (i + 1));
      return row;
    });
    return rows;
  }
  function analyze(input) {
    const candles = normalize(input), closes = candles.map(c => c.close);
    const last = candles[candles.length - 1], prev = candles.slice(-21, -1);
    const e20 = ema(closes, 20), e50 = ema(closes, 50), strength = rsi(closes), volatility = atr(candles);
    const rangeHigh = Math.max(...prev.map(c => c.high));
    const rangeLow = Math.min(...prev.map(c => c.low));
    const bullish = e20 > e50 && last.close > e20 && strength >= 52 && strength <= 72 && last.close > rangeHigh;
    const bearish = e20 < e50 && last.close < e20 && strength <= 48 && strength >= 28 && last.close < rangeLow;
    const direction = bullish ? 'BUY' : bearish ? 'SELL' : 'WAIT';
    const entry = last.close;
    const risk = volatility * 1.5;
    const stop = direction === 'BUY' ? entry - risk : direction === 'SELL' ? entry + risk : null;
    const targets = direction === 'BUY'
      ? [entry + risk, entry + risk * 2, entry + risk * 3]
      : direction === 'SELL' ? [entry - risk, entry - risk * 2, entry - risk * 3] : [];
    const reasons = [];
    reasons.push(e20 > e50 ? 'EMA20 أعلى EMA50' : 'EMA20 أسفل EMA50');
    reasons.push('RSI14 = ' + strength.toFixed(1));
    reasons.push(bullish ? 'اختراق أعلى نطاق آخر 20 شمعة' : bearish ? 'كسر أسفل نطاق آخر 20 شمعة' : 'لا يوجد اختراق مؤكد للنطاق');
    return {
      direction, entry, stop, targets, rsi: strength, atr: volatility, ema20: e20, ema50: e50,
      rangeHigh, rangeLow, candleCount: candles.length, lastTime: last.time,
      riskReward: direction === 'WAIT' ? null : '1:1 / 1:2 / 1:3',
      reasons, valid: direction !== 'WAIT'
    };
  }
  root.GoldanForexEngine = Object.freeze({ analyze });
})(typeof window !== 'undefined' ? window : globalThis);
