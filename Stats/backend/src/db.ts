import { Pool } from 'pg';
import { config } from './config';
const dotenv = require('dotenv');

dotenv.config();

console.log('Attempting to connect to database with connection string:', config.database.connectionString.replace(/:[^:@]*@/, ':****@'));

export const pool = new Pool({
  connectionString: config.database.connectionString,
  ssl: config.database.ssl
});

// Test the connection
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Successfully connected to the database');
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });

export async function getTableColumns(tableName: string): Promise<string[]> {
  const query = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1
  `;
  
  try {
    const { rows } = await pool.query(query, [tableName]);
    console.log(`Found columns for table ${tableName}:`, rows.map(r => r.column_name));
    return rows.map(row => row.column_name);
  } catch (error) {
    console.error(`Error getting columns for table ${tableName}:`, error);
    throw error;
  }
}