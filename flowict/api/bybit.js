const ALLOWED_PATHS = new Set([
  '/v5/market/kline',
  '/v5/market/recent-trade',
  '/v5/market/open-interest',
  '/v5/market/funding/history'
]);

const HOSTS = ['https://api.bybit.com', 'https://api.bytick.com'];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;
  if (!raw || typeof raw !== 'string' || raw.length > 1000) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  let target;
  try {
    target = new URL(raw, HOSTS[0]);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!ALLOWED_PATHS.has(target.pathname)) {
    return res.status(403).json({ error: 'Endpoint not allowed' });
  }

  const symbol = target.searchParams.get('symbol');
  if (symbol && !/^[A-Z0-9-]{2,40}$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol' });
  }

  let lastError = null;
  for (const host of HOSTS) {
    try {
      const url = host + target.pathname + target.search;
      const upstream = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'FlowICT/1.0'
        },
        signal: AbortSignal.timeout(8000)
      });

      const body = await upstream.text();
      if (upstream.ok) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(body);
      }

      lastError = { host, status: upstream.status, body: body.slice(0, 300) };
      if (upstream.status !== 403 && upstream.status < 500) {
        return res.status(upstream.status).send(body);
      }
    } catch (error) {
      lastError = { host, error: String(error?.message || error) };
    }
  }

  console.error('Bybit proxy failed', lastError);
  return res.status(502).json({ error: 'Market data unavailable', detail: lastError });
};
