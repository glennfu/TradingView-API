/**
 * @typedef {Object} PricePeriod
 * @prop {number} time
 * @prop {number} open
 * @prop {number} close
 * @prop {number} max
 * @prop {number} min
 * @prop {number} volume
 */

/**
 * @typedef {Object} FetchMoreInBatchesMeta
 * @prop {number} requestIndex
 * @prop {boolean} exhausted
 * @prop {boolean} grew
 * @prop {string} [stallReason]
 * @prop {boolean} [timedOut]
 */

/**
 * @typedef {Object} FetchMoreInBatchesYield
 * @prop {PricePeriod[]} periods
 * @prop {FetchMoreInBatchesMeta} meta
 */

/**
 * @typedef {Object} ChartPaginationBridge
 * @prop {() => PricePeriod[]} getPeriods
 * @prop {() => boolean} getHistoryExhausted
 * @prop {(count: number) => void} fetchMore
 * @prop {(cb: () => void) => void} onUpdate
 * @prop {(cb: () => void) => void} offUpdate
 */

/**
 * Wait for chart `onUpdate` after a wire fetch: growth, history exhausted, or deadline.
 * @param {ChartPaginationBridge} chart
 * @param {number} beforeCount
 * @param {number} deadlineMs
 * @returns {Promise<{ grew: boolean, exhausted: boolean, timedOut?: boolean }>}
 */
function waitForPage(chart, beforeCount, deadlineMs) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      chart.offUpdate(onUpdate);
      clearTimeout(timer);
      resolve(result);
    };

    const onUpdate = () => {
      if (chart.getHistoryExhausted()) {
        finish({
          grew: chart.getPeriods().length > beforeCount,
          exhausted: true,
        });
        return;
      }

      if (chart.getPeriods().length > beforeCount) {
        finish({ grew: true, exhausted: false });
      }
    };

    const timer = setTimeout(() => {
      finish({
        grew: chart.getPeriods().length > beforeCount,
        exhausted: chart.getHistoryExhausted(),
        timedOut: true,
      });
    }, Math.max(1, deadlineMs - Date.now()));

    chart.onUpdate(onUpdate);
  });
}

/**
 * Slice new periods into batches (newest-first, same order as chart.periods).
 * @param {PricePeriod[]} newPeriods
 * @param {number} batchSize
 * @returns {PricePeriod[][]}
 */
function chunkPeriods(newPeriods, batchSize) {
  const chunks = [];
  for (let i = 0; i < newPeriods.length; i += batchSize) {
    chunks.push(newPeriods.slice(i, i + batchSize));
  }
  return chunks;
}

/**
 * @param {ChartPaginationBridge} chart
 * @param {number} number Target period count (load until chart has at least this many)
 * @param {Object} [options]
 * @param {number} [options.batchSize=1000]
 * @param {number} [options.fetchSize=3400]
 * @param {number} [options.timeout=60000]
 * @param {number} [options.maxRequests=50]
 * @returns {AsyncGenerator<FetchMoreInBatchesYield>}
 */
async function* fetchMoreInBatches(chart, number, options = {}) {
  const target = Math.max(1, Math.floor(Number(number) || 1));
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? 1000));
  const fetchSize = Math.max(1, Math.floor(options.fetchSize ?? 3400));
  const timeout = options.timeout ?? 60000;
  const maxRequests = options.maxRequests ?? 50;
  const deadline = Date.now() + timeout;

  const seenTimes = new Set(chart.getPeriods().map((p) => p.time));
  let requestIndex = 0;

  const collectNew = () => {
    const added = [];
    for (const p of chart.getPeriods()) {
      if (seenTimes.has(p.time)) continue;
      seenTimes.add(p.time);
      added.push(p);
    }
    return added;
  };

  while (chart.getPeriods().length < target && !chart.getHistoryExhausted()) {
    if (Date.now() > deadline) {
      throw new Error(
        `fetchMoreInBatches: timeout after ${timeout}ms (${chart.getPeriods().length}/${target} periods)`,
      );
    }

    if (requestIndex >= maxRequests) {
      throw new Error(`fetchMoreInBatches: maxRequests (${maxRequests}) exceeded`);
    }

    const beforeCount = chart.getPeriods().length;
    requestIndex += 1;
    chart.fetchMore(fetchSize);

    const page = await waitForPage(chart, beforeCount, deadline);
    const newPeriods = collectNew();

    const chunks = chunkPeriods(newPeriods, batchSize);
    for (const periods of chunks) {
      yield {
        periods,
        meta: {
          requestIndex,
          exhausted: chart.getHistoryExhausted(),
          grew: periods.length > 0,
        },
      };
    }

    if (chart.getHistoryExhausted()) {
      return;
    }

    if (!page.grew && newPeriods.length === 0) {
      yield {
        periods: [],
        meta: {
          requestIndex,
          exhausted: false,
          grew: false,
          stallReason: 'no_new_periods',
          timedOut: page.timedOut,
        },
      };
      return;
    }

    if (chart.getPeriods().length >= target) {
      return;
    }
  }
}

module.exports = {
  fetchMoreInBatches,
  waitForPage,
  chunkPeriods,
};
