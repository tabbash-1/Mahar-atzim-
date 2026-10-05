const ALLOWED_PATHS = new Set([
  '/v5/market/kline',
  '/v5/market/recent-trade',
  '/v5/market/open-interest',
  '/v5/market/funding/history'
]);

const HOSTS = ['https://api.bybit.com', 'https://api.bytick.com'];

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-FlowICT-Region': process.env.VERCEL_REGION || 'unknown'
    }
  });
}

async function handle(request) {
  try {
    const incoming = new URL(request.url);
    const raw = incoming.searchParams.get('path');

    if (!raw || raw.length > 1000) {
      return json({ error: 'Invalid path' }, 400);
    }

    let target;
    try {
      target = new URL(raw, HOSTS[0]);
    } catch {
      return json({ error: 'Invalid URL' }, 400);
    }

    if (!ALLOWED_PATHS.has(target.pathname)) {
      return json({ error: 'Endpoint not allowed' }, 403);
    }

    const symbol = target.searchParams.get('symbol');
    if (symbol && !/^[A-Z0-9-]{2,40}$/.test(symbol)) {
      return json({ error: 'Invalid symbol' }, 400);
    }

    let lastError = null;

    for (const host of HOSTS) {
      const url = host + target.pathname + target.search;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const upstream = await fetch(url, {
          headers: {
            accept: 'application/json',
            'user-agent': 'FlowICT/1.0'
          },
          signal: controller.signal,
          cache: 'no-store'
        });

        const body = await upstream.text();

        if (upstream.ok) {
          return new Response(body, {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-FlowICT-Region': process.env.VERCEL_REGION || 'unknown',
              'X-FlowICT-Upstream': new URL(host).hostname
            }
          });
        }

        lastError = {
          host: new URL(host).hostname,
          status: upstream.status,
          body: body.slice(0, 240)
        };

        if (upstream.status !== 403 && upstream.status < 500) {
          return new Response(body, {
            status: upstream.status,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-FlowICT-Region': process.env.VERCEL_REGION || 'unknown'
            }
          });
        }
      } catch (error) {
        lastError = {
          host: new URL(host).hostname,
          error: String(error?.message || error)
        };
      } finally {
        clearTimeout(timeout);
      }
    }

    console.error('Bybit proxy failed', lastError);
    return json({ error: 'Market data unavailable', detail: lastError }, 502);
  } catch (error) {
    console.error('FlowICT proxy internal error', error);
    return json({ error: 'Proxy internal error', message: String(error?.message || error) }, 500);
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Allow': 'GET',
          'Cache-Control': 'no-store'
        }
      });
    }
    return handle(request);
  }
};
