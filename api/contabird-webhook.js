async function readRawBody(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return res.status(415).json({ ok: false, error: 'Unsupported Media Type' });
  }

  let body = req.body;

  if (body == null || (typeof body === 'object' && Object.keys(body).length === 0)) {
    const raw = await readRawBody(req);
    body = raw;
  }

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON' });
    }
  }

  if (body == null || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }

  const event = body?.event;
  const notification = body?.notification;

  if (!event || !notification) {
    return res.status(400).json({ ok: false, error: 'Missing event or notification' });
  }

  console.log('[ContabiRD Webhook] Received', {
    event,
    notification,
  });

  return res.status(200).json({ ok: true });
}
