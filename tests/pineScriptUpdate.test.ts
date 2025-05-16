import { describe, it, expect } from 'vitest';
import TradingView from '../main';

const token = <string>process.env.SESSION;
const signature = <string>process.env.SIGNATURE;

describe('Pine Script Update', () => {
  let client: TradingView.Client;
  let chart: InstanceType<typeof client.Session.Chart>;
  let scriptId: string;
  const scriptName = `Test Script ${Date.now()}`;

  const noAuth = !token || !signature;

  it.skipIf(noAuth)('creates a client', async () => {
    client = new TradingView.Client({ token, signature });
    expect(client).toBeDefined();
    expect(client.cookie).toBe(`sessionid=${token}; sessionid_sign=${signature}`);
  });

  it.skipIf(noAuth)('creates a chart', async () => {
    chart = new client.Session.Chart();
    expect(chart).toBeDefined();
  });

  it.skipIf(noAuth)('creates a Pine script', async () => {
    const newContent = `//@version=5
strategy(title="${scriptName}", shorttitle="${scriptName}", overlay=true, initial_capital=10000.0, commission_type=strategy.commission.percent, commission_value=0.2)
line.new(x1=1741478400000, y1=0.015483999999999998, x2=1747267200000, y2=100000, color=color.red, width=2, xloc=xloc.bar_time)`;
    const result = await chart.createPineScript(newContent, { name: scriptName });
    expect(result).not.toBeNull();
    scriptId = result as string;
  });

  it.skipIf(noAuth)('updates the Pine script', async () => {
    const updatedContent = `//@version=5
strategy(title="${scriptName} Updated", shorttitle="${scriptName}", overlay=true, initial_capital=10000.0, commission_type=strategy.commission.percent, commission_value=0.2)
line.new(x1=1741478400000, y1=0.015483999999999998, x2=1747267200000, y2=100000, color=color.blue, width=2, xloc=xloc.bar_time)`;
    const newVersion = await chart.updatePineScript(scriptId, updatedContent, { name: `${scriptName} Updated`, allowCreateNew: false });
    expect(newVersion).not.toBeNull();
    globalThis.__lastPineVersion = newVersion;
  });

  it.skipIf(noAuth)('verifies the update', async () => {
    const version = globalThis.__lastPineVersion;
    let currentContent = await chart.getPineScriptContent(scriptId, version);
    if (!currentContent) {
      currentContent = await chart.getPineScriptContent(scriptId);
    }
    expect(currentContent).toContain('color=color.blue');
  });

  it.skipIf(noAuth)('destroys the Pine script', async () => {
    const result = await chart.deletePineScript(scriptId);
    expect(result).toBe(true);
  });

  it.skipIf(noAuth)('verifies script is destroyed', async () => {
    const scripts = await chart.listPineScripts();
    const found = scripts.find(s => s.id === scriptId);
    expect(found).toBeUndefined();
  });
}); 