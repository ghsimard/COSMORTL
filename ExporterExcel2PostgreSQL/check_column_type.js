const { Pool } = require('pg');

async function checkColumnType() {
  const pool = new Pool({
    user: 'postgres',      // Update with your actual username
    password: 'postgres',  // Update with your actual password
    host: 'localhost',
    port: 5432,
    database: 'COSMO_RLT'
  });
  
  try {
    console.log('Checking column type for niveles_educativos_que_ofrece_la_ie_seleccion_multiple...');
    
    // Get the column type
    const typeResult = await pool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'rectores' AND column_name = 'niveles_educativos_que_ofrece_la_ie_seleccion_multiple'
    `);
    
    console.log('Column type information:');
    console.log(typeResult.rows[0]);
    
    // Get a few example values
    const dataResult = await pool.query(`
      SELECT numero_de_cedula, niveles_educativos_que_ofrece_la_ie_seleccion_multiple
      FROM rectores
      WHERE niveles_educativos_que_ofrece_la_ie_seleccion_multiple IS NOT NULL
      LIMIT 5
    `);
    
    console.log('\nSample values:');
    dataResult.rows.forEach(row => {
      console.log(`ID: ${row.numero_de_cedula}`);
      console.log(`Value: ${JSON.stringify(row.niveles_educativos_que_ofrece_la_ie_seleccion_multiple)}`);
      console.log('--');
    });
    
    // Try inserting a test record with comma-separated array (standard PostgreSQL format)
    try {
      console.log('\nTesting insert with comma-separated array...');
      await pool.query(`
        INSERT INTO rectores (numero_de_cedula, niveles_educativos_que_ofrece_la_ie_seleccion_multiple) 
        VALUES ('99999991', '{"Preescolar","Básica primaria","Básica secundaria"}')
        ON CONFLICT (numero_de_cedula) DO UPDATE 
        SET niveles_educativos_que_ofrece_la_ie_seleccion_multiple = '{"Preescolar","Básica primaria","Básica secundaria"}'
      `);
      console.log('Insert with comma-separated array successful');
    } catch (err) {
      console.error('Error with comma-separated array:', err.message);
    }
    
    // Try inserting a test record with semicolon-separated array
    try {
      console.log('\nTesting insert with semicolon-separated array...');
      await pool.query(`
        INSERT INTO rectores (numero_de_cedula, niveles_educativos_que_ofrece_la_ie_seleccion_multiple) 
        VALUES ('99999992', '{"Preescolar";"Básica primaria";"Básica secundaria"}')
        ON CONFLICT (numero_de_cedula) DO UPDATE 
        SET niveles_educativos_que_ofrece_la_ie_seleccion_multiple = '{"Preescolar";"Básica primaria";"Básica secundaria"}'
      `);
      console.log('Insert with semicolon-separated array successful');
    } catch (err) {
      console.error('Error with semicolon-separated array:', err.message);
    }
    
    // Check the inserted records
    console.log('\nChecking test records:');
    const testResult = await pool.query(`
      SELECT numero_de_cedula, niveles_educativos_que_ofrece_la_ie_seleccion_multiple
      FROM rectores
      WHERE numero_de_cedula IN ('99999991', '99999992')
    `);
    
    testResult.rows.forEach(row => {
      console.log(`ID: ${row.numero_de_cedula}`);
      console.log(`Value: ${JSON.stringify(row.niveles_educativos_que_ofrece_la_ie_seleccion_multiple)}`);
      console.log('--');
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkColumnType(); 