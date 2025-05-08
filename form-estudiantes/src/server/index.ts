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
const port = process.env.PORT || 3003;

// Debug environment
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
  PORT: process.env.PORT
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Increase header size limit
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  next();
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../build')));

// PostgreSQL connection configuration
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
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
      process.exit(1);
    }
  });

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

// API endpoint to save form data
app.post('/api/submit-form', async (req, res) => {
  try {
    console.log('Received form data:', JSON.stringify(req.body, null, 2));
    console.log('Form data keys:', Object.keys(req.body));
    console.log('Frequency ratings:', {
      comunicacion: req.body.comunicacion,
      practicas_pedagogicas: req.body.practicas_pedagogicas,
      convivencia: req.body.convivencia
    });

    const {
      schoolName,
      yearsOfExperience,
      teachingGradesEarly,
      teachingGradesLate,
      schedule,
      feedbackSources,
      comunicacion,
      practicas_pedagogicas,
      convivencia
    } = req.body;

    // Validate required fields
    if (!schoolName || !yearsOfExperience || !schedule) {
      console.error('Missing required fields:', { schoolName, yearsOfExperience, schedule });
      throw new Error('Missing required fields');
    }

    // Validate frequency ratings
    if (!comunicacion || !practicas_pedagogicas || !convivencia) {
      console.error('Missing frequency ratings:', { comunicacion, practicas_pedagogicas, convivencia });
      throw new Error('Missing frequency ratings');
    }

    // Combine early and late grades into current_grade
    const currentGrade = [...(teachingGradesEarly || []), ...(teachingGradesLate || [])][0] || '';
    
    if (!currentGrade) {
      console.error('No grade selected');
      throw new Error('No grade selected');
    }

    const query = `
      INSERT INTO estudiantes_form_submissions (
        institucion_educativa,
        anos_estudiando,
        grado_actual,
        jornada,
        comunicacion,
        practicas_pedagogicas,
        convivencia
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [
      schoolName,
      yearsOfExperience,
      currentGrade,
      schedule,
      JSON.stringify(comunicacion),
      JSON.stringify(practicas_pedagogicas),
      JSON.stringify(convivencia)
    ];

    console.log('Executing query with values:', values);

    const result = await pool.query(query, values);
    console.log('Query result:', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      code: error instanceof Error && 'code' in error ? (error as any).code : 'No error code',
      detail: error instanceof Error && 'detail' in error ? (error as any).detail : 'No error detail'
    });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save form response',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : null
    });
  }
});

// API endpoint to search for school names
app.post('/api/search-schools', async (req, res) => {
  const searchTerm = req.body.q;
  
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