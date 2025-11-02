import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  try {
    console.log('Initializing database...');

    // Read schema.sql
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await pool.query(statement);
      }
    }

    console.log('✅ Database initialized successfully!');

    // Optionally run DDL for sample data
    const ddlPath = path.join(__dirname, '..', 'ddl.sql');
    if (fs.existsSync(ddlPath)) {
      console.log('Loading sample data...');
      const ddlSQL = fs.readFileSync(ddlPath, 'utf8');
      const ddlStatements = ddlSQL.split(';').filter(stmt => stmt.trim().length > 0);

      for (const statement of ddlStatements) {
        if (statement.trim()) {
          console.log('Executing DDL:', statement.trim().substring(0, 50) + '...');
          await pool.query(statement);
        }
      }
      console.log('✅ Sample data loaded!');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    process.exit();
  }
}

initDatabase();
