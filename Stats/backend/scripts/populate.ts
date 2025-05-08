const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function populateTestData() {
  try {
    // Read the SQL file
    const sqlFile = fs.readFileSync(path.join(__dirname, 'populate_test_data.sql'), 'utf8');
    
    // Execute the SQL
    await pool.query(sqlFile);
    
    console.log('Successfully populated test data');
    
    // Query counts to verify
    const tables = ['docentes_form_submissions', 'estudiantes_form_submissions', 'acudientes_form_submissions'];
    
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table} count:`, result.rows[0].count);
    }
  } catch (error) {
    console.error('Error populating test data:', error);
  } finally {
    await pool.end();
  }
}

populateTestData(); 