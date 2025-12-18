import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing ${name}`);
  }
  return v;
}

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i++;
    } else {
      args.set(key, "true");
    }
  }
  return args;
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

async function postBulkUsers(baseUrl, apiKey, payload) {
  const base = baseUrl.replace(/\/$/, "");
  const url = `${base}/api/v1/app-users/bulk`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await upstream.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    ok: upstream.ok,
    status: upstream.status,
    data,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const dryRun = ["1", "true", "yes"].includes(String(args.get("dry-run") || "").toLowerCase());
  const perPageRaw = args.get("per-page");
  let perPage = perPageRaw ? Number(perPageRaw) : 1000;
  if (!Number.isFinite(perPage) || perPage <= 0) perPage = 1000;
  if (perPage > 1000) perPage = 1000;

  const webnotiBaseUrl = requireEnv("WEBNOTI_BASE_URL");
  const webnotiApiKey = requireEnv("WEBNOTI_API_KEY");
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

  const users = await listAllUsers(supabaseAdmin, perPage);

  const appUsers = users
    .filter((u) => u?.id && u?.email)
    .map((u) => ({ user_id: u.id, email: u.email }));

  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dry_run: true, count: appUsers.length, sample: appUsers.slice(0, 5) }, null, 2));
    return;
  }

  const result = await postBulkUsers(webnotiBaseUrl, webnotiApiKey, { users: appUsers });

  if (!result.ok) {
    console.error(JSON.stringify({ ok: false, error: "WebNotiCenter error", status: result.status, details: result.data }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ ok: true, sent: { count: appUsers.length }, response: result.data }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err?.message ?? String(err) }, null, 2));
  process.exitCode = 1;
});
