import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

// Debug environment
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
  PORT: process.env.PORT
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    await pool.query('SELECT NOW()');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: process.env.NODE_ENV === 'production' ? 'Database connection failed' : error.message 
    });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../build')));

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
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Exit in production if we can't connect to the database
    }
  });

// API endpoint to save form data
app.post('/api/submit-form', async (req, res) => {
  try {
    console.log('Received form data:', req.body);

    const {
      schoolName,
      studentGrades,
      frequencyRatings5,
      frequencyRatings6,
      frequencyRatings7
    } = req.body;

    // Validate required fields
    if (!schoolName) {
      throw new Error('Missing required field: schoolName');
    }

    // Validate student grades
    if (!studentGrades || !Array.isArray(studentGrades) || studentGrades.length === 0) {
      throw new Error('Student grades must be a non-empty array');
    }

    // Validate frequency ratings
    if (!frequencyRatings5 || !frequencyRatings6 || !frequencyRatings7) {
      throw new Error('Missing frequency ratings');
    }

    const query = `
      INSERT INTO acudientes_form_submissions (
        institucion_educativa,
        grados_estudiantes,
        comunicacion,
        practicas_pedagogicas,
        convivencia
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      schoolName,
      studentGrades,
      JSON.stringify(frequencyRatings5),
      JSON.stringify(frequencyRatings6),
      JSON.stringify(frequencyRatings7)
    ];

    console.log('Executing query with values:', values);

    const result = await pool.query(query, values);
    console.log('Query result:', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error saving form data:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Failed to save form data' 
        : error.message
    });
  }
});

// API endpoint to search for school names
app.get('/api/search-schools', async (req, res) => {
  const searchTerm = req.query.q;
  
  try {
    const query = `
      SELECT DISTINCT TRIM(nombre_de_la_institucion_educativa_en_la_actualmente_desempena_) as school_name
      FROM rectores
      WHERE LOWER(TRIM(nombre_de_la_institucion_educativa_en_la_actualmente_desempena_)) LIKE LOWER($1)
      ORDER BY school_name;
    `;
    
    const result = await pool.query(query, [`%${searchTerm}%`]);
    res.json(result.rows.map(row => row.school_name));
  } catch (error) {
    console.error('Error searching schools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search schools'
    });
  }
});

// The "catch-all" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build/index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 