import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyKeepalive() {
  const sqlPath = path.join(__dirname, 'supabase_keepalive.sql');

  try {
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found at ${sqlPath}`);
    }

    console.log('Applying Supabase keepalive SQL...');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);

    console.log('Keepalive SQL applied successfully.');
  } catch (error) {
    console.error('Failed to apply keepalive SQL:', error.message || error);
    process.exitCode = 1;
  } finally {
    await pool.end?.();
  }
}

applyKeepalive();