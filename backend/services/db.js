// ============================================================
// Local store with two backends, chosen automatically:
//   • In the cloud (Render): if TURSO_DATABASE_URL is set, the data
//     lives in a free Turso database so it survives restarts/sleep.
//   • On your laptop: a plain JSON file (backend/data/store.json).
// Either way the rest of the app sees the same tiny API and the whole
// dataset is held in memory (single user, small data).
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EMPTY = { bank_items: [], accounts: [], transactions: [], budgets: [], goals: [], overrides: [] };
const FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'store.json');
const useTurso = !!process.env.TURSO_DATABASE_URL;

let cache = null;
let turso = null;
if (useTurso) {
  const { createClient } = require('@libsql/client');
  turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

function normalize(obj) {
  const c = obj && typeof obj === 'object' ? obj : {};
  for (const k of Object.keys(EMPTY)) if (!Array.isArray(c[k])) c[k] = [];
  return c;
}

// Called once at startup, before the server accepts requests.
async function init() {
  if (useTurso) {
    await turso.execute('create table if not exists kv (k text primary key, v text)');
    const r = await turso.execute({ sql: "select v from kv where k = 'store'", args: [] });
    cache = normalize(r.rows.length ? JSON.parse(r.rows[0].v) : {});
    console.log('[db] using Turso cloud store');
  } else {
    try { cache = normalize(JSON.parse(fs.readFileSync(FILE, 'utf8'))); }
    catch { cache = normalize({}); }
    console.log('[db] using local file store:', FILE);
  }
  return cache;
}

function load() {
  if (!cache) cache = normalize({});
  return cache;
}

// Direct access to one collection array (mutate then await save()).
const table = (name) => load()[name];
const uid = () => crypto.randomUUID();

async function save() {
  if (useTurso) {
    await turso.execute({
      sql: "insert into kv (k, v) values ('store', ?) on conflict(k) do update set v = excluded.v",
      args: [JSON.stringify(cache)],
    });
  } else {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
  }
}

module.exports = { init, load, save, table, uid };
