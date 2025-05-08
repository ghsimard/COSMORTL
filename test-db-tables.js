/**
 * Script to inspect database tables
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/COSMO_RLT',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// List all tables in the database
async function listTables() {
  try {
    console.log('Checking database tables...');
    
    // Check connection
    const testResult = await pool.query('SELECT NOW() as time');
    console.log('✅ Database connection successful!');
    console.log('Current database time:', testResult.rows[0].time);
    
    // List all tables in the public schema
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nAvailable tables in database:');
    tables.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    // Specifically check for the form submissions tables
    const submissionTables = tables.rows
      .filter(row => row.table_name.includes('submissions'))
      .map(row => row.table_name);
    
    console.log('\nForm submission tables:');
    if (submissionTables.length > 0) {
      submissionTables.forEach((table, index) => {
        console.log(`${index + 1}. ${table}`);
      });
      
      // Check structure of each submissions table
      for (const table of submissionTables) {
        console.log(`\nStructure of ${table}:`);
        const columns = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        columns.rows.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
        });
        
        // Count records
        const count = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  Total records: ${count.rows[0].count}`);
      }
    } else {
      console.log('  No submission tables found');
    }
    
    // Try to manually check if docentes_form_submissions exists
    try {
      const checkTable = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'docentes_form_submissions'
        ) as exists
      `);
      
      if (checkTable.rows[0].exists) {
        console.log('\n✅ Table docentes_form_submissions exists');
        
        // Test a simple insert
        console.log('\nTesting INSERT into docentes_form_submissions...');
        const testData = {
          test: true,
          timestamp: new Date().toISOString()
        };
        
        const insertResult = await pool.query(
          'INSERT INTO docentes_form_submissions (data) VALUES ($1) RETURNING id',
          [JSON.stringify(testData)]
        );
        
        console.log(`✅ Test INSERT successful! Record ID: ${insertResult.rows[0].id}`);
      } else {
        console.log('\n❌ Table docentes_form_submissions does NOT exist');
      }
    } catch (error) {
      console.error('\n❌ Error checking docentes_form_submissions:', error.message);
    }
    
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
listTables(); 