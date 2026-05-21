import { describe, it, expect } from 'vitest';
import { applySeriesBars, isHistoryEnd, isPriceSeriesKey } from '../src/chart/seriesBars';

describe('seriesBars helpers', () => {
  it('detects price series keys', () => {
    expect(isPriceSeriesKey('$prices')).toBe(true);
    expect(isPriceSeriesKey('sds_1')).toBe(true);
    expect(isPriceSeriesKey('sds_sym_1')).toBe(false);
  });

  it('merges bar values into periods', () => {
    const indexes: Record<number, number[]> = {};
    const periods: Record<number, { time: number, open: number, close: number, max: number, min: number, volume: number }> = {};

    const merged = applySeriesBars(indexes, periods, {
      s: [{ i: 10, v: [1700000000, 1, 2, 0.5, 1.5, 100] }],
    });

    expect(merged).toBe(true);
    expect(periods[1700000000]).toEqual({
      time: 1700000000,
      open: 1,
      close: 1.5,
      max: 2,
      min: 0.5,
      volume: 100,
    });
    expect(indexes[10]).toBe(1700000000);
  });

  it('detects history end payloads', () => {
    expect(isHistoryEnd({ s: [], ns: { d: '', indexes: {} } })).toBe(true);
    expect(isHistoryEnd({ s: [{ i: 1, v: [1, 1, 1, 1, 1, 1] }] })).toBe(false);
  });
});
