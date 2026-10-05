const BASE = process.env.FLOWICT_VERIFY_URL || 'https://flowict.vercel.app';

const checks = [
  ['kline', '/v5/market/kline?category=linear&symbol=BTCUSDT&interval=60&limit=5'],
  ['trades', '/v5/market/recent-trade?category=linear&symbol=BTCUSDT&limit=5'],
  ['open-interest', '/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=5'],
  ['funding', '/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=3'],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('FlowICT production verification:', BASE);

const page = await fetch(BASE + '/', { cache: 'no-store' });
assert(page.ok, 'Homepage HTTP ' + page.status);
const html = await page.text();
assert(html.includes('FlowICT'), 'FlowICT marker missing');
assert(html.includes("const API='/api/bybit?path=';"), 'Same-origin proxy frontend not live');
console.log('SITE_OK');

for (const [name, path] of checks) {
  const url = BASE + '/api/bybit?path=' + encodeURIComponent(path);
  const response = await fetch(url, { cache: 'no-store' });
  const body = await response.text();
  assert(response.ok, name + ' HTTP ' + response.status + ': ' + body.slice(0, 200));
  let data;
  try { data = JSON.parse(body); } catch { throw new Error(name + ' returned non-JSON'); }
  assert(data.retCode === 0, name + ' retCode=' + data.retCode);
  assert(data.result && Array.isArray(data.result.list), name + ' result.list missing');
  assert(data.result.list.length > 0, name + ' returned empty list');
  console.log(name.toUpperCase() + '_OK', data.result.list.length);
}

const blockedPath = encodeURIComponent('/v5/account/wallet-balance');
const blocked = await fetch(BASE + '/api/bybit?path=' + blockedPath, { cache: 'no-store' });
assert(blocked.status === 403, 'Private endpoint allowlist failed: HTTP ' + blocked.status);
console.log('ALLOWLIST_OK');
console.log('FLOWICT_PRODUCTION_DATA_OK');
