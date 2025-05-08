import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection configuration
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
  process.exit(1); // Exit if no database URL is provided
}

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
    sslmode: 'require'
  } : false
};

console.log('Database config:', {
  hasConnectionString: !!dbConfig.connectionString,
  ssl: dbConfig.ssl
});

const pool = new Pool(dbConfig);

// Test database connection
pool.query('SELECT NOW()')
  .then(() => console.log('Successfully connected to database'))
  .catch(err => {
    console.error('Error connecting to database:', err);
    process.exit(1);
  });

// Create docentes_form_submissions table if it doesn't exist
const createDocentesTableQuery = `
  CREATE TABLE IF NOT EXISTS docentes_form_submissions (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    institucion_educativa VARCHAR(255) NOT NULL,
    anos_como_docente VARCHAR(50) NOT NULL,
    grados_asignados TEXT[] NOT NULL,
    jornada VARCHAR(50) NOT NULL,
    retroalimentacion_de TEXT[] NOT NULL,
    frequency_ratings6 JSONB NOT NULL,
    frequency_ratings7 JSONB NOT NULL,
    frequency_ratings8 JSONB NOT NULL
  );
`;

// Create estudiantes_form_submissions table if it doesn't exist
const createEstudiantesTableQuery = `
  CREATE TABLE IF NOT EXISTS estudiantes_form_submissions (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    institucion_educativa TEXT NOT NULL,
    anos_estudiando TEXT NOT NULL,
    grado_actual TEXT NOT NULL,
    jornada TEXT NOT NULL,
    frequency_ratings5 JSONB NOT NULL,
    frequency_ratings6 JSONB NOT NULL,
    frequency_ratings7 JSONB NOT NULL
  );
`;

// Create acudientes_form_submissions table if it doesn't exist
const createAcudientesTableQuery = `
  CREATE TABLE IF NOT EXISTS acudientes_form_submissions (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    institucion_educativa TEXT NOT NULL,
    grados_estudiantes TEXT[] NOT NULL,
    comunicacion JSONB NOT NULL,
    practicas_pedagogicas JSONB NOT NULL,
    convivencia JSONB NOT NULL
  );
`;

// Run migrations
async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Create docentes table
    await pool.query(createDocentesTableQuery);
    console.log('docentes_form_submissions table created successfully');
    
    // Create estudiantes table
    await pool.query(createEstudiantesTableQuery);
    console.log('estudiantes_form_submissions table created successfully');
    
    // Create acudientes table
    await pool.query(createAcudientesTableQuery);
    console.log('acudientes_form_submissions table created successfully');
    
    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations(); 