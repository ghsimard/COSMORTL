/**
 * Script to backup the rectores table from COSMO_RLT database
 * This creates a SQL file that can be used to restore the table and its data
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function backupRectoresTable() {
  // Create a timestamped backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups');
  const backupFile = path.join(backupDir, `rectores_backup_${timestamp}.sql`);
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  // Database connection
  const pool = new Pool({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'COSMO_RLT'
  });
  
  let client;
  
  try {
    client = await pool.connect();
    console.log('Connected to database. Starting backup...');
    
    // Get table schema
    console.log('Retrieving table schema...');
    const schemaResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'rectores'
      ORDER BY ordinal_position
    `);
    
    // Create table structure SQL
    let createTableSQL = 'CREATE TABLE IF NOT EXISTS rectores_backup (\n';
    schemaResult.rows.forEach((column, index) => {
      createTableSQL += `  ${column.column_name} ${column.data_type}`;
      
      // Add length for character types
      if (column.character_maximum_length) {
        createTableSQL += `(${column.character_maximum_length})`;
      }
      
      // Add NULL constraint
      if (column.is_nullable === 'NO') {
        createTableSQL += ' NOT NULL';
      }
      
      // Add default value if exists
      if (column.column_default) {
        createTableSQL += ` DEFAULT ${column.column_default}`;
      }
      
      // Add comma if not the last column
      if (index < schemaResult.rows.length - 1) {
        createTableSQL += ',\n';
      }
    });
    
    // Get primary key info
    const pkResult = await client.query(`
      SELECT c.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
      JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
        AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = 'rectores'
    `);
    
    // Add primary key if exists
    if (pkResult.rows.length > 0) {
      const pkColumns = pkResult.rows.map(row => row.column_name).join(', ');
      createTableSQL += `,\n  PRIMARY KEY (${pkColumns})`;
    }
    
    createTableSQL += '\n);\n\n';
    
    // Get all data
    console.log('Retrieving table data...');
    const dataResult = await client.query('SELECT * FROM rectores');
    console.log(`Found ${dataResult.rows.length} records.`);
    
    // Create INSERT statements
    let insertSQL = '';
    
    for (const row of dataResult.rows) {
      const columns = Object.keys(row).filter(key => row[key] !== null);
      const values = columns.map(column => {
        const value = row[column];
        
        if (value === null) {
          return 'NULL';
        } else if (Array.isArray(value)) {
          // Handle array data types
          return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        } else if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        } else if (typeof value === 'object' && value instanceof Date) {
          return `'${value.toISOString()}'`;
        } else {
          return value;
        }
      });
      
      insertSQL += `INSERT INTO rectores_backup (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    // Write backup file
    const fullBackup = createTableSQL + insertSQL;
    fs.writeFileSync(backupFile, fullBackup);
    
    console.log(`Backup completed successfully and saved to: ${backupFile}`);
    
    // Create a JSON backup as well
    const jsonBackupFile = path.join(backupDir, `rectores_backup_${timestamp}.json`);
    fs.writeFileSync(jsonBackupFile, JSON.stringify(dataResult.rows, null, 2));
    console.log(`JSON backup saved to: ${jsonBackupFile}`);
    
  } catch (err) {
    console.error('Error during backup:', err);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

backupRectoresTable().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
}); 