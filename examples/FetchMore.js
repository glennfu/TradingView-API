const TradingView = require('../main');

/**
 * This example loads BINANCE:BTCEUR 15m candles and paginates backward
 * until at least 200 periods are available (or history ends).
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

  const { length, exhausted } = await chart.ensurePeriodCount(200, {
    timeout: 30000,
    chunkSize: 100,
  });

  console.log(`Loaded ${length} periods (history exhausted: ${exhausted})`);

  if (chart.periods.length > 0) {
    const oldest = chart.periods[chart.periods.length - 1];
    const newest = chart.periods[0];
    console.log('Oldest:', new Date(oldest.time * 1000).toISOString());
    console.log('Newest:', new Date(newest.time * 1000).toISOString());
  }

  chart.delete();
  client.end();
});
