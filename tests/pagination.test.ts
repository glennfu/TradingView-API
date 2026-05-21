import { describe, it, expect } from 'vitest';
import { fetchMoreInBatches } from '../src/chart/pagination';

describe('pagination helpers', () => {
  it('yields batches and stops when target count is met', async () => {
    let periods = [
      { time: 100, open: 1, close: 1, max: 1, min: 1, volume: 1 },
    ];
    let exhausted = false;
    const updates: Array<() => void> = [];
    let fetchCalls = 0;

    const chart = {
      getPeriods: () => periods,
      getHistoryExhausted: () => exhausted,
      fetchMore: (n: number) => {
        fetchCalls += 1;
        const base = 100 - fetchCalls * 10;
        periods = periods.concat([
          { time: base, open: 1, close: 1, max: 1, min: 1, volume: 1 },
          { time: base - 1, open: 1, close: 1, max: 1, min: 1, volume: 1 },
        ]);
        setImmediate(() => updates.forEach((cb) => cb()));
      },
      onUpdate: (cb: () => void) => { updates.push(cb); },
      offUpdate: (cb: () => void) => {
        const i = updates.indexOf(cb);
        if (i >= 0) updates.splice(i, 1);
      },
    };

    const batches = [];
    for await (const chunk of fetchMoreInBatches(chart, 5, {
      batchSize: 2,
      fetchSize: 10,
      timeout: 5000,
      maxRequests: 10,
    })) {
      batches.push(chunk);
    }

    expect(fetchCalls).toBeGreaterThan(0);
    expect(periods.length).toBeGreaterThanOrEqual(5);
    const totalYielded = batches.reduce((n, b) => n + b.periods.length, 0);
    expect(totalYielded).toBe(periods.length - 1);
  });

  it('stops with stallReason when a fetch adds no periods', async () => {
    const periods = [
      { time: 1, open: 1, close: 1, max: 1, min: 1, volume: 1 },
    ];
    const updates: Array<() => void> = [];

    const chart = {
      getPeriods: () => periods,
      getHistoryExhausted: () => false,
      fetchMore: () => {
        setImmediate(() => updates.forEach((cb) => cb()));
      },
      onUpdate: (cb: () => void) => { updates.push(cb); },
      offUpdate: (cb: () => void) => {
        const i = updates.indexOf(cb);
        if (i >= 0) updates.splice(i, 1);
      },
    };

    const last = await (async () => {
      let prev;
      for await (const chunk of fetchMoreInBatches(chart, 100, {
        batchSize: 100,
        fetchSize: 10,
        timeout: 5000,
        maxRequests: 5,
      })) {
        prev = chunk;
      }
      return prev;
    })();

    expect(last?.meta.stallReason).toBe('no_new_periods');
  });
});
