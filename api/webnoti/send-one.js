async function readJsonBody(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('application/json') && req.body && typeof req.body === 'object') {
    return req.body;
  }

  const raw = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getWebnotiApiKeys() {
  const raw = process.env.WEBNOTI_API_KEYS;
  if (raw && String(raw).trim()) {
    return String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const single = process.env.WEBNOTI_API_KEY;
  return single ? [String(single).trim()] : [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const baseUrl = process.env.WEBNOTI_BASE_URL;
  const apiKeys = getWebnotiApiKeys();

  if (!baseUrl || apiKeys.length === 0) {
    return res.status(500).json({ ok: false, error: 'Missing WEBNOTI_BASE_URL or WEBNOTI_API_KEYS/WEBNOTI_API_KEY' });
  }

  const body = await readJsonBody(req);
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }

  const user_id = body.user_id;
  const title = body.title;
  const message = body.message;

  if (!user_id || !title || !message) {
    return res.status(400).json({ ok: false, error: 'Missing user_id, title or message' });
  }

  const results = [];
  for (const apiKey of apiKeys) {
    const url = `${baseUrl.replace(/\/$/, '')}/api/ingest?api_key=${encodeURIComponent(apiKey)}`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ user_id, title, message }),
    });

    const text = await upstream.text();
    let data = text;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    results.push({ ok: upstream.ok, status: upstream.status, data });
  }

  const anyOk = results.some((r) => r.ok);
  if (!anyOk) {
    const first = results[0] || { status: 500, data: null };
    return res.status(first.status || 500).json({ ok: false, error: 'WebNotiCenter error', details: results });
  }

  return res.status(200).json({ ok: true, results });
}
