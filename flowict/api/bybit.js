const ALLOWED_PATHS = new Set([
  '/v5/market/kline',
  '/v5/market/recent-trade',
  '/v5/market/open-interest',
  '/v5/market/funding/history'
]);

const HOSTS = ['https://api.bybit.com', 'https://api.bytick.com'];

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return send(res, 405, { error: 'Method not allowed' });
    }

    const incoming = new URL(req.url || '/', 'http://flowict.local');
    const raw = incoming.searchParams.get('path');
    if (!raw || raw.length > 1000) {
      return send(res, 400, { error: 'Invalid path' });
    }

    let target;
    try {
      target = new URL(raw, HOSTS[0]);
    } catch {
      return send(res, 400, { error: 'Invalid URL' });
    }

    if (!ALLOWED_PATHS.has(target.pathname)) {
      return send(res, 403, { error: 'Endpoint not allowed' });
    }

    const symbol = target.searchParams.get('symbol');
    if (symbol && !/^[A-Z0-9-]{2,40}$/.test(symbol)) {
      return send(res, 400, { error: 'Invalid symbol' });
    }

    let lastError = null;

    for (const host of HOSTS) {
      const url = host + target.pathname + target.search;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const upstream = await fetch(url, {
          headers: { accept: 'application/json', 'user-agent': 'FlowICT/1.0' },
          signal: controller.signal
        });
        const body = await upstream.text();

        if (upstream.ok) return send(res, 200, body);

        lastError = { host, status: upstream.status, body: body.slice(0, 300) };
        if (upstream.status !== 403 && upstream.status < 500) {
          return send(res, upstream.status, body);
        }
      } catch (error) {
        lastError = { host, error: String(error && error.message ? error.message : error) };
      } finally {
        clearTimeout(timeout);
      }
    }

    console.error('Bybit proxy failed', lastError);
    return send(res, 502, { error: 'Market data unavailable', detail: lastError });
  } catch (error) {
    console.error('FlowICT proxy internal error', error);
    return send(res, 500, {
      error: 'Proxy internal error',
      message: String(error && error.message ? error.message : error)
    });
  }
};
