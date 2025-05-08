// Script to run the migration using Node.js and pg
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Get database URL from environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set.');
  console.error('Please set it to run the migration, e.g.:');
  console.error('export DATABASE_URL=postgresql://user:password@localhost:5432/database');
  process.exit(1);
}

// Create a new database connection pool
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// SQL statements for the migration
const migrationSql = `
-- Update jornada column in docentes_form_submissions table
-- First, create a temporary column for the conversion
ALTER TABLE docentes_form_submissions 
ADD COLUMN jornada_array text[];

-- Convert existing single values to arrays
UPDATE docentes_form_submissions 
SET jornada_array = ARRAY[jornada::text];

-- Drop the old column and rename the new one
ALTER TABLE docentes_form_submissions 
DROP COLUMN jornada;

ALTER TABLE docentes_form_submissions 
RENAME COLUMN jornada_array TO jornada;

-- Set the NOT NULL constraint
ALTER TABLE docentes_form_submissions 
ALTER COLUMN jornada SET NOT NULL;
`;

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting migration to update jornada column to array type');
    
    // Start a transaction
    await client.query('BEGIN');

    // Run the migration SQL
    await client.query(migrationSql);

    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
  } catch (err) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    // Release the client back to the pool
    client.release();
    
    // Close the pool
    await pool.end();
  }
}

// Run the migration
runMigration(); 