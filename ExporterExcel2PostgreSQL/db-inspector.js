const { Pool } = require('pg');

async function inspectDatabase() {
  // Database connection parameters - use your actual credentials
  const connectionParams = {
    host: 'localhost',
    port: 5432,
    database: 'COSMO_RLT',
    user: 'postgres',  // replace with your username
    password: 'postgres'  // replace with your password
  };
  
  const pool = new Pool(connectionParams);
  
  try {
    console.log('Connecting to database...');
    
    // 1. Get table structure
    const schemaQuery = {
      text: `
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'rectores'
        ORDER BY ordinal_position
      `
    };
    
    console.log('Fetching table structure...');
    const schemaResult = await pool.query(schemaQuery);
    
    console.log('\nTable structure:');
    schemaResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
    });
    
    // 2. Check if record with cedula 71194166 exists
    console.log('\nChecking for record with cedula 71194166...');
    
    // Check as string
    const queryAsString = {
      text: `SELECT * FROM rectores WHERE numero_de_cedula = '71194166'`
    };
    const resultAsString = await pool.query(queryAsString);
    
    console.log(`Record with cedula '71194166' (as string): ${resultAsString.rowCount > 0 ? 'FOUND' : 'NOT FOUND'}`);
    
    // Check as number
    const queryAsNumber = {
      text: `SELECT * FROM rectores WHERE numero_de_cedula = 71194166`
    };
    const resultAsNumber = await pool.query(queryAsNumber);
    
    console.log(`Record with cedula 71194166 (as number): ${resultAsNumber.rowCount > 0 ? 'FOUND' : 'NOT FOUND'}`);
    
    // 3. Get some matching records and inspect the type
    console.log('\nChecking a few records to inspect data types:');
    
    const sampleQuery = {
      text: `SELECT numero_de_cedula, pg_typeof(numero_de_cedula) as data_type FROM rectores LIMIT 5`
    };
    const sampleResult = await pool.query(sampleQuery);
    
    console.log('Sample records and their types:');
    sampleResult.rows.forEach(row => {
      console.log(`Value: ${row.numero_de_cedula}, Type: ${row.data_type}`);
    });
    
    // 4. Try alternative queries to find the record
    console.log('\nTrying alternative queries:');
    
    // Cast both sides to text and use LIKE
    const likeQuery = {
      text: `SELECT * FROM rectores WHERE numero_de_cedula::text LIKE '%71194166%'`
    };
    const likeResult = await pool.query(likeQuery);
    
    console.log(`Search with LIKE '%71194166%': ${likeResult.rowCount > 0 ? 'FOUND' : 'NOT FOUND'}`);
    
    if (likeResult.rowCount > 0) {
      console.log('Matching record details:');
      likeResult.rows.forEach(row => {
        console.log(JSON.stringify(row, null, 2));
      });
    }
    
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

inspectDatabase().catch(err => {
  console.error('Error in main function:', err);
}); 