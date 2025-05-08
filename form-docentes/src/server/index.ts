import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const config = {
  ports: {
    backend: process.env.PORT || 3001,
    frontend: process.env.FRONTEND_PORT || 3000
  },
  api: {
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://form-docentes.onrender.com' 
      : `http://localhost:${process.env.PORT || 3001}`
  }
} as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const port = config.ports.backend;

// Debug environment
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
  PORT: process.env.PORT
});

// Middleware
app.use(cors({
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
}));

// Configure express to handle larger request headers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
      process.exit(1); // Exit in production if we can't connect to the database
    }
  });

// API endpoint to save form data
app.post('/api/submit-form', async (req, res) => {
  console.log('=== FORM SUBMISSION HANDLER START ===');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body type:', typeof req.body);
  
  try {
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

    // Log the received data for debugging
    console.log('Received form data:', {
      schoolName,
      yearsOfExperience,
      teachingGradesCount: (teachingGradesEarly?.length || 0) + (teachingGradesLate?.length || 0),
      scheduleType: typeof schedule,
      scheduleIsArray: Array.isArray(schedule),
      scheduleValue: schedule,
      feedbackSourcesCount: feedbackSources?.length || 0,
      hasComunicacion: !!comunicacion,
      hasPracticas: !!practicas_pedagogicas,
      hasConvivencia: !!convivencia
    });

    // Validate required fields
    if (!schoolName || !yearsOfExperience) {
      console.error('Missing required fields: schoolName or yearsOfExperience');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          schoolName: !schoolName,
          yearsOfExperience: !yearsOfExperience
        }
      });
    }

    // Validate schedule field - should be an array with at least one item
    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      console.error('Invalid schedule field:', schedule);
      return res.status(400).json({
        success: false,
        error: 'At least one schedule option must be selected',
        receivedSchedule: schedule
      });
    }

    // Combine early and late teaching grades into a single array
    const allGrades = [...(teachingGradesEarly || []), ...(teachingGradesLate || [])];
    if (allGrades.length === 0) {
      console.error('No teaching grades selected');
      return res.status(400).json({
        success: false,
        error: 'At least one teaching grade must be selected'
      });
    }

    if (!feedbackSources || feedbackSources.length === 0) {
      console.error('No feedback sources selected');
      return res.status(400).json({
        success: false,
        error: 'At least one feedback source must be selected'
      });
    }

    const query = `
      INSERT INTO docentes_form_submissions (
        institucion_educativa,
        anos_como_docente,
        grados_asignados,
        jornada,
        retroalimentacion_de,
        comunicacion,
        practicas_pedagogicas,
        convivencia
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      schoolName,
      yearsOfExperience,
      allGrades,
      schedule,
      feedbackSources,
      comunicacion,
      practicas_pedagogicas,
      convivencia
    ];

    console.log('Executing database query with values:', {
      schoolName,
      yearsOfExperience,
      gradesCount: allGrades.length,
      scheduleCount: schedule.length,
      feedbackSourcesCount: feedbackSources.length
    });
    
    console.log('Database query:', query.replace(/\s+/g, ' '));

    const result = await pool.query(query, values);
    console.log('Form submission successful. Saved record ID:', result.rows[0].id);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error saving form response:', error);
    
    // Check if this is a PostgreSQL error
    if (error.code) {
      console.error('Database error code:', error.code);
      console.error('PostgreSQL error detail:', error.detail);
      console.error('PostgreSQL error schema:', error.schema);
      console.error('PostgreSQL error table:', error.table);
      console.error('PostgreSQL error column:', error.column);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to save form response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  
  console.log('=== FORM SUBMISSION HANDLER END ===');
});

// API endpoint to search for school names
app.get('/api/search-schools', async (req, res) => {
  const searchTerm = req.query.q;
  
  try {
    // First check if the rectores table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rectores'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // If table doesn't exist, return empty results
      return res.json([]);
    }

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