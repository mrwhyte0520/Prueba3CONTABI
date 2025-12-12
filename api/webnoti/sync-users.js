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

function readQuery(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

async function postBulkUsers(baseUrl, apiKey, payload) {
  const base = baseUrl.replace(/\/$/, '');
  const candidates = [
    {
      url: `${base}/api/v1/app-users/bulk`,
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
      label: 'bulk + x-api-key',
      method: 'POST',
    },
    {
      url: `${base}/api/v1/app-users/bulk?api_key=${encodeURIComponent(apiKey)}`,
      headers: { 'content-type': 'application/json' },
      label: 'bulk + api_key query',
      method: 'POST',
    },
    {
      url: `${base}/api/v1/app-users/bulk/`,
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
      label: 'bulk/ + x-api-key',
      method: 'POST',
    },
    {
      url: `${base}/api/v1/app-users/bulk/?api_key=${encodeURIComponent(apiKey)}`,
      headers: { 'content-type': 'application/json' },
      label: 'bulk/ + api_key query',
      method: 'POST',
    },
    {
      url: `${base}/api/app-users/bulk`,
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
      label: 'api bulk + x-api-key',
      method: 'POST',
    },
    {
      url: `${base}/api/app-users/bulk?api_key=${encodeURIComponent(apiKey)}`,
      headers: { 'content-type': 'application/json' },
      label: 'api bulk + api_key query',
      method: 'POST',
    },
    {
      url: `${base}/api/v1/app-users/bulk`,
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
      label: 'bulk PUT + x-api-key',
      method: 'PUT',
    },
  ];

  const attempts = [];

  for (const c of candidates) {
    const upstream = await fetch(c.url, {
      method: c.method,
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

    attempts.push({
      label: c.label,
      method: c.method,
      url: c.url,
      status: upstream.status,
      ok: upstream.ok,
      allow: upstream.headers.get('allow'),
      response: data,
    });

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
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  console.log('[webnoti][sync-users] invoked', {
    method: req.method,
    path: req.url,
    at: new Date().toISOString(),
  });

  const baseUrl = process.env.WEBNOTI_BASE_URL;
  const apiKey = process.env.WEBNOTI_API_KEY;

  if (!baseUrl || !apiKey) {
    return res.status(500).json({ ok: false, error: 'Missing WEBNOTI_BASE_URL or WEBNOTI_API_KEY' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const query = readQuery(req);
  const body = req.method === 'POST' ? (await readJsonBody(req)) ?? {} : {};
  const dry_run = req.method === 'GET'
    ? ['1', 'true', 'yes'].includes(String(query.get('dry_run') || '').toLowerCase())
    : Boolean(body.dry_run);

  let perPage = Number(req.method === 'GET' ? (query.get('per_page') ?? 1000) : (body.per_page ?? 1000));
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
