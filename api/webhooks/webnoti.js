import { createClient } from '@supabase/supabase-js';

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

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const expectedSecret = process.env.WEBNOTI_WEBHOOK_SECRET;
  if (expectedSecret) {
    const got = req.headers['x-webnoti-secret'];
    if (String(got || '') !== String(expectedSecret)) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  const body = await readJsonBody(req);
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }

  const event = body.event;
  const notification = body.notification;

  if (!event || !notification || typeof notification !== 'object') {
    return res.status(400).json({ ok: false, error: 'Missing event or notification' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const user_id = notification.user_id ?? null;
  const title = notification.title ?? null;
  const message = notification.message ?? null;

  const { error } = await supabaseAdmin.from('webnoti_notifications').insert({
    user_id,
    title,
    message,
    event,
    raw: body,
  });

  if (error) {
    return res.status(500).json({ ok: false, error: 'Failed to persist notification', details: error.message });
  }

  return res.status(200).json({ ok: true });
}
