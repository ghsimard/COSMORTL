/**
 * Script to check the database structure and sample data
 * This helps verify the database connection and table structure
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/COSMO_RLT',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper to run a query
async function runQuery(queryText, params = []) {
  try {
    const result = await pool.query(queryText, params);
    return result.rows;
  } catch (error) {
    console.error('Error running query:', queryText);
    console.error('Error details:', error.message);
    return null;
  }
}

// Check database information
async function checkDatabase() {
  console.log('Checking database connection and structure...');
  
  try {
    // Check connection
    const testResult = await runQuery('SELECT NOW() as time');
    if (testResult) {
      console.log('✅ Database connection successful!');
      console.log('Current database time:', testResult[0].time);
    }
    
    // Check rectores table existence
    const tableCheck = await runQuery(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rectores'
      ) as exists
    `);
    
    if (tableCheck && tableCheck[0].exists) {
      console.log('✅ Table "rectores" exists');
      
      // Check column existence
      const columnCheck = await runQuery(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'rectores'
        AND column_name = 'nombre_de_la_institucion_educativa_en_la_actualmente_desempena_'
      `);
      
      if (columnCheck && columnCheck.length > 0) {
        console.log('✅ Column "nombre_de_la_institucion_educativa_en_la_actualmente_desempena_" exists');
        console.log('   Data type:', columnCheck[0].data_type);
        
        // Get sample data
        const sampleData = await runQuery(`
          SELECT DISTINCT nombre_de_la_institucion_educativa_en_la_actualmente_desempena_
          FROM rectores
          WHERE nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ IS NOT NULL
          LIMIT 5
        `);
        
        if (sampleData && sampleData.length > 0) {
          console.log('✅ Sample data found:');
          sampleData.forEach((row, i) => {
            console.log(`   ${i+1}. ${row.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_}`);
          });
          
          // Count total
          const countResult = await runQuery(`
            SELECT COUNT(DISTINCT nombre_de_la_institucion_educativa_en_la_actualmente_desempena_) as count
            FROM rectores
            WHERE nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ IS NOT NULL
          `);
          
          if (countResult) {
            console.log(`✅ Total distinct school names: ${countResult[0].count}`);
          }
          
          // Test a search query
          const searchTerm = 'mis';
          const searchResults = await runQuery(`
            SELECT DISTINCT nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ as name
            FROM rectores
            WHERE nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ ILIKE $1
            LIMIT 10
          `, [`%${searchTerm}%`]);
          
          if (searchResults) {
            console.log(`\nSearch results for "${searchTerm}":`);
            if (searchResults.length > 0) {
              searchResults.forEach((row, i) => {
                console.log(`   ${i+1}. ${row.name}`);
              });
            } else {
              console.log('   No results found');
            }
          }
        } else {
          console.log('❌ No sample data found. The column might be empty.');
        }
      } else {
        console.log('❌ Column "nombre_de_la_institucion_educativa_en_la_actualmente_desempena_" not found!');
        
        // List all columns in the table
        const allColumns = await runQuery(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'rectores'
        `);
        
        if (allColumns && allColumns.length > 0) {
          console.log('\nAvailable columns in "rectores" table:');
          allColumns.forEach((col, i) => {
            console.log(`   ${i+1}. ${col.column_name}`);
          });
        }
      }
    } else {
      console.log('❌ Table "rectores" not found!');
      
      // List all tables in the database
      const allTables = await runQuery(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      
      if (allTables && allTables.length > 0) {
        console.log('\nAvailable tables in the database:');
        allTables.forEach((table, i) => {
          console.log(`   ${i+1}. ${table.table_name}`);
        });
      }
    }
  } catch (error) {
    console.error('Error during database check:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the check
checkDatabase(); 