import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

// --- Supabase client (named export)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('Supabase env vars not found. Creating lightweight mock supabase client for local UI testing.');

  // Minimal fluent, thenable mock that safely resolves to empty results.
  // This allows the app to start and pages to render without an active Supabase project.
  const makeMockQuery = () => {
    const q = {
      _single: false,
      _payload: null,
      select() { return this; },
      order() { return this; },
      limit() { return this; },
      eq() { return this; },
      single() { this._single = true; return this; },
      insert(vals) { this._payload = vals; return this; },
      update(vals) { this._payload = vals; return this; },
      delete() { this._deleted = true; return this; },
      // make object awaitable (thenable)
      then(resolve) {
        const result = this._single ? { data: null, error: null } : { data: [], error: null };
        return Promise.resolve(result).then(resolve);
      },
      catch() { return Promise.resolve({ data: [], error: null }); }
    };
    return q;
  };

  supabase = {
    from() { return makeMockQuery(); },
    // basic rpc stub
    rpc() { return Promise.resolve({ data: null, error: null }); }
  };
}

// --- PG Pool (default export)
// Use DATABASE_URL when provided, else rely on PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT
const { Pool } = pg;
let pool;
// Accept multiple env var naming conventions so local .env files like DB_USER/DB_PASS work.
const hasPgEnv = Boolean(
  // include SUPABASE_DB_URL as a valid indicator of a Postgres connection
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
    process.env.PGHOST ||
    process.env.PGUSER ||
    process.env.PGPASSWORD ||
    process.env.PGDATABASE ||
    // common DB_* names used in this project
    process.env.DB_HOST ||
    process.env.DB_USER ||
    process.env.DB_PASS ||
    process.env.DB_NAME
);

let hasPgConnection = hasPgEnv;

if (hasPgEnv) {
  const poolConfig = {};
  // Prefer SUPABASE_DB_URL when present (hosted Postgres), then DATABASE_URL, then DB_* / PG* vars
  if (process.env.SUPABASE_DB_URL) {
    poolConfig.connectionString = process.env.SUPABASE_DB_URL;
  } else if (process.env.DATABASE_URL) {
    poolConfig.connectionString = process.env.DATABASE_URL;
  } else {
    // build from DB_* or PG* env vars
    poolConfig.host = process.env.PGHOST || process.env.DB_HOST;
    poolConfig.user = process.env.PGUSER || process.env.DB_USER;
    poolConfig.password = process.env.PGPASSWORD || process.env.DB_PASS;
    poolConfig.database = process.env.PGDATABASE || process.env.DB_NAME;
    if (process.env.PGPORT || process.env.DB_PORT) {
      poolConfig.port = parseInt(process.env.PGPORT || process.env.DB_PORT, 10);
    }
  }
  
  // If connecting to a Supabase-hosted Postgres URL, enable TLS with relaxed cert
  // verification (Supabase uses managed certs; Node may require rejectUnauthorized=false).
  try {
    if (poolConfig.connectionString && (poolConfig.connectionString.includes('supabase.co') || process.env.SUPABASE_DB_URL)) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(poolConfig);

    // Attach an error handler to catch idle client errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle PG client', err);
    });
  } catch (err) {
    console.error('Failed to create PG pool:', err);
    // Fallback to a benign mock so the app pages can still render in local dev
    pool = { query: async () => ({ rows: [] }) };
  }
} else {
  // Provide a friendly mock pool that returns empty results so the app can start
  // without a Postgres connection for local UI testing.
  console.warn('Postgres environment variables not found. PG pool will return empty results until configured.');
  pool = {
    query: async () => {
      return { rows: [] };
    }
  };
}

// Export both: default is pg Pool (used by many existing route files), and named export for supabase
export { supabase };
export default pool;
