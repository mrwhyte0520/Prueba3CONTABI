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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const baseUrl = process.env.WEBNOTI_BASE_URL;
  const apiKey = process.env.WEBNOTI_API_KEY;

  if (!baseUrl || !apiKey) {
    return res.status(500).json({ ok: false, error: 'Missing WEBNOTI_BASE_URL or WEBNOTI_API_KEY' });
  }

  const body = await readJsonBody(req);
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }

  const title = body.title;
  const message = body.message;

  if (!title || !message) {
    return res.status(400).json({ ok: false, error: 'Missing title or message' });
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/notifications/broadcast`;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ title, message }),
  });

  const text = await upstream.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!upstream.ok) {
    return res.status(upstream.status).json({ ok: false, error: 'WebNotiCenter error', details: data });
  }

  return res.status(200).json({ ok: true, data });
}
