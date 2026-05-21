import { describe, it, expect } from 'vitest';
import TradingView from '../main';
import utils from './utils';

describe('Chart pagination', () => {
  let client: TradingView.Client;
  let chart: InstanceType<typeof client.Session.Chart>;

  it('creates a client', () => {
    client = new TradingView.Client();
    expect(client).toBeDefined();
  });

  it('creates a chart session', () => {
    chart = new client.Session.Chart();
    expect(chart).toBeDefined();
  });

  it('loads an initial page of candles', async () => {
    chart.setMarket('BINANCE:BTCEUR', {
      timeframe: '15',
      range: 50,
    });

    while (chart.infos.full_name !== 'BINANCE:BTCEUR' || chart.periods.length < 10) {
      await utils.wait(100);
    }

    expect(chart.periods.length).toBeGreaterThanOrEqual(10);
  });

  it('fetches more candles with fetchMore', async () => {
    const before = chart.periods.length;

    chart.fetchMore(100);

    while (chart.periods.length <= before) await utils.wait(100);

    expect(chart.periods.length).toBeGreaterThan(before);
  });

  it('loads up to a target count with fetchMoreInBatches', async () => {
    const target = 200;
    const beforeEnsure = chart.periods.length;
    let batchCount = 0;
    let yielded = 0;

    for await (const { periods, meta } of chart.fetchMoreInBatches(target, {
      timeout: 30000,
      batchSize: 50,
      fetchSize: 100,
    })) {
      batchCount += 1;
      yielded += periods.length;
      if (meta.exhausted) break;
    }

    expect(chart.periods.length).toBeGreaterThanOrEqual(beforeEnsure);
    expect(batchCount).toBeGreaterThan(0);
    expect(yielded).toBeGreaterThan(0);

    if (!chart.historyExhausted) {
      expect(chart.periods.length).toBeGreaterThanOrEqual(target);
    }
  });

  it('closes chart', async () => {
    await utils.wait(500);
    chart.delete();
  });

  it('closes client', async () => {
    await utils.wait(500);
    await client.end();
  });
});
