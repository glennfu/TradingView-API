/**
 * @param {Object<number, number>} indexes
 * @param {Object<number, import('./session').PricePeriod>} periods
 * @param {{ s?: { i: number, v: number[] }[], ns?: { indexes?: Object } }} seriesData
 * @returns {boolean} true if new bars were merged
 */
function applySeriesBars(indexes, periods, seriesData) {
  if (!seriesData || !seriesData.s || !seriesData.s.length) return false;

  seriesData.s.forEach((p) => {
    [indexes[p.i]] = p.v;
    periods[p.v[0]] = {
      time: p.v[0],
      open: p.v[1],
      close: p.v[4],
      max: p.v[2],
      min: p.v[3],
      volume: Math.round(p.v[5] * 100) / 100,
    };
  });

  if (seriesData.ns && typeof seriesData.ns.indexes === 'object') {
    Object.assign(indexes, seriesData.ns.indexes);
  }

  return true;
}

/**
 * TradingView signals no further history with an empty series payload.
 * @param {{ s?: unknown[], ns?: unknown }} seriesData
 * @returns {boolean}
 */
function isHistoryEnd(seriesData) {
  return !!(
    seriesData
    && Array.isArray(seriesData.s)
    && seriesData.s.length === 0
    && seriesData.ns
  );
}

/**
 * @param {string} key
 * @returns {boolean}
 */
function isPriceSeriesKey(key) {
  return key === '$prices' || key === 'sds_1';
}

module.exports = {
  applySeriesBars,
  isHistoryEnd,
  isPriceSeriesKey,
};
