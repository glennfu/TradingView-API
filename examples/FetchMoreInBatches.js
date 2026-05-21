const TradingView = require('../main');

/**
 * Paginate with large wire pages (fetchSize) and consume in smaller batches (batchSize).
 */

const client = new TradingView.Client();

const chart = new client.Session.Chart();

chart.setMarket('BINANCE:BTCEUR', {
  timeframe: '15',
  range: 50,
});

chart.onError((...err) => {
  console.error('Chart error:', ...err);
});

chart.onSymbolLoaded(async () => {
  console.log(`Market "${chart.infos.description}" loaded (${chart.periods.length} periods)`);

  let batchNum = 0;
  let totalNew = 0;

  for await (const { periods, meta } of chart.fetchMoreInBatches(200, {
    batchSize: 50,
    fetchSize: 100,
    timeout: 30000,
    maxRequests: 50,
  })) {
    batchNum += 1;
    totalNew += periods.length;
    console.log(
      `batch #${batchNum} request=${meta.requestIndex} periods=${periods.length} ` +
      `exhausted=${meta.exhausted} grew=${meta.grew}${meta.stallReason ? ` stall=${meta.stallReason}` : ''}`,
    );
  }

  console.log(`Done: ${chart.periods.length} on chart, ${totalNew} new across batches, exhausted=${chart.historyExhausted}`);

  if (chart.periods.length > 0) {
    const oldest = chart.periods[chart.periods.length - 1];
    const newest = chart.periods[0];
    console.log('Oldest:', new Date(oldest.time * 1000).toISOString());
    console.log('Newest:', new Date(newest.time * 1000).toISOString());
  }

  chart.delete();
  client.end();
});
