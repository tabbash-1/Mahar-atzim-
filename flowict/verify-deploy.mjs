// FlowICT production gate: validates the currently live production before promotion.\nconst BASE = process.env.FLOWICT_VERIFY_URL || 'https://flowict.vercel.app';

const checks = [
  { name: 'kline', code: 21, path: '/v5/market/kline?category=linear&symbol=BTCUSDT&interval=60&limit=5' },
  { name: 'trades', code: 22, path: '/v5/market/recent-trade?category=linear&symbol=BTCUSDT&limit=5' },
  { name: 'open-interest', code: 23, path: '/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=5' },
  { name: 'funding', code: 24, path: '/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=3' },
];

function fail(code, message) {
  console.error('FLOWICT_VERIFY_FAIL', code, message);
  process.exit(code);
}

console.log('FlowICT production verification:', BASE);

try {
  const page = await fetch(BASE + '/', { cache: 'no-store' });
  if (!page.ok) fail(11, 'Homepage HTTP ' + page.status);
  const html = await page.text();
  if (!html.includes('FlowICT')) fail(12, 'FlowICT marker missing');
  if (!html.includes("const API='/api/bybit?path=';")) fail(13, 'Same-origin proxy frontend not live');
  console.log('SITE_OK');

  for (const check of checks) {
    const url = BASE + '/api/bybit?path=' + encodeURIComponent(check.path);
    let response;
    try {
      response = await fetch(url, { cache: 'no-store' });
    } catch (error) {
      fail(check.code, check.name + ' fetch error: ' + error.message);
    }
    const body = await response.text();
    if (!response.ok) {
      const statusExit = {400:40,401:41,403:43,404:44,429:29,500:50,502:52,503:53,504:54}[response.status] || 90;
      fail(check.name === 'kline' ? statusExit : check.code, check.name + ' HTTP ' + response.status + ': ' + body.slice(0, 160));
    }
    let data;
    try { data = JSON.parse(body); } catch { fail(check.code + 10, check.name + ' returned non-JSON'); }
    if (data.retCode !== 0) fail(check.code + 20, check.name + ' retCode=' + data.retCode);
    if (!data.result || !Array.isArray(data.result.list)) fail(check.code + 30, check.name + ' result.list missing');
    if (data.result.list.length === 0) fail(check.code + 40, check.name + ' empty list');
    console.log(check.name.toUpperCase() + '_OK', data.result.list.length);
  }

  const blockedPath = encodeURIComponent('/v5/account/wallet-balance');
  const blocked = await fetch(BASE + '/api/bybit?path=' + blockedPath, { cache: 'no-store' });
  if (blocked.status !== 403) fail(25, 'Private endpoint allowlist HTTP ' + blocked.status);
  console.log('ALLOWLIST_OK');
  console.log('FLOWICT_PRODUCTION_DATA_OK');
} catch (error) {
  fail(99, error?.stack || error?.message || String(error));
}
