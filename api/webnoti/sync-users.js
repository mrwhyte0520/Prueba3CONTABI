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

async function postBulkUsers(baseUrl, apiKey, payload) {
  const base = baseUrl.replace(/\/$/, '');
  const candidates = [
    {
      url: `${base}/api/v1/app-users/bulk`,
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
      label: 'bulk + x-api-key',
    },
    {
      url: `${base}/api/v1/app-users/bulk?api_key=${encodeURIComponent(apiKey)}`,
      headers: { 'content-type': 'application/json' },
      label: 'bulk + api_key query',
    },
    {
      url: `${base}/api/v1/app-users/bulk/`,
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
      label: 'bulk/ + x-api-key',
    },
    {
      url: `${base}/api/v1/app-users/bulk/?api_key=${encodeURIComponent(apiKey)}`,
      headers: { 'content-type': 'application/json' },
      label: 'bulk/ + api_key query',
    },
  ];

  const attempts = [];

  for (const c of candidates) {
    const upstream = await fetch(c.url, {
      method: 'POST',
      headers: c.headers,
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    let data = text;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    attempts.push({ label: c.label, url: c.url, status: upstream.status, ok: upstream.ok, response: data });

    if (upstream.ok) {
      return { ok: true, data, attempt: { label: c.label, url: c.url, status: upstream.status } };
    }
  }

  return { ok: false, attempts };
}

async function listAllUsers(supabaseAdmin, perPage = 1000) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) break;
    page += 1;
    if (page > 1000) break;
  }

  return users;
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

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const body = (await readJsonBody(req)) ?? {};
  const dry_run = Boolean(body.dry_run);

  let perPage = Number(body.per_page ?? 1000);
  if (!Number.isFinite(perPage) || perPage <= 0) perPage = 1000;
  if (perPage > 1000) perPage = 1000;

  let users;
  try {
    users = await listAllUsers(supabaseAdmin, perPage);
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Failed to list Supabase users', details: e?.message ?? String(e) });
  }

  const appUsers = users
    .filter((u) => u?.id && u?.email)
    .map((u) => ({ user_id: u.id, email: u.email }));

  if (dry_run) {
    return res.status(200).json({ ok: true, dry_run: true, count: appUsers.length, sample: appUsers.slice(0, 5) });
  }

  const result = await postBulkUsers(baseUrl, apiKey, { users: appUsers });
  if (!result.ok) {
    const status = result.attempts.find((a) => a.status)?.status ?? 502;
    return res.status(status).json({
      ok: false,
      error: 'WebNotiCenter error',
      sent: { count: appUsers.length },
      attempts: result.attempts,
    });
  }

  return res.status(200).json({ ok: true, sent: { count: appUsers.length }, data: result.data, attempt: result.attempt });
}
