/**
 * Script to check available PostgreSQL databases
 */

const { Pool } = require('pg');

// Connect to default postgres database
const pool = new Pool({
  connectionString: 'postgres://localhost:5432/postgres',
  ssl: false
});

async function listDatabases() {
  console.log('Checking available PostgreSQL databases...');
  
  try {
    // Check connection
    const testResult = await pool.query('SELECT NOW() as time');
    console.log('✅ PostgreSQL connection successful!');
    console.log('Current database time:', testResult.rows[0].time);
    
    // List all databases
    const result = await pool.query('SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname');
    
    console.log('\nAvailable databases:');
    result.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ${row.datname}`);
    });
    
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error.message);
    console.log('\nPossible issues:');
    console.log('1. PostgreSQL is not running');
    console.log('2. Default connection parameters are incorrect');
    console.log('3. PostgreSQL is not configured to accept connections from localhost');
  } finally {
    await pool.end();
  }
}

// Run the check
listDatabases(); 