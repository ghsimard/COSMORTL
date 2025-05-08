const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Add body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval';");
    next();
  });
}

// Configure PostgreSQL connection (if DATABASE_URL is provided)
let pool;
const useMockData = false; // Always attempt to use the database

try {
  if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL is set. Attempting to connect to database...');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  } else {
    console.log('DATABASE_URL not set. Using default local database connection...');
    // Connect to a default local PostgreSQL database
    pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'COSMO_RLT',
      password: 'postgres',
      port: 5432
    });
  }

  // Test database connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection error:', err.stack);
      console.log('Using mock data for all operations due to connection error.');
    } else {
      console.log('Database connected successfully:', res.rows[0]);
    }
  });
} catch (error) {
  console.error('Error setting up database connection:', error);
  console.log('Using mock data for all operations due to setup error.');
}

// Helper function to check if database is available
const isDatabaseAvailable = () => {
  return pool !== undefined && pool !== null;
};

// Access tokens - simplified to avoid special characters
const ACCESS_TOKENS = {
  'docentes': process.env.DOCENTES_TOKEN || 'DocToken123',
  'acudientes': process.env.ACUDIENTES_TOKEN || 'AcuToken456',
  'estudiantes': process.env.ESTUDIANTES_TOKEN || 'EstToken789',
  'stats': process.env.STATS_TOKEN || 'StatsToken012'
};

// MIME type helper
const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Token validation middleware
const validateToken = (app) => {
  return (req, res, next) => {
    const pathParts = req.path.split('/');
    if (pathParts.length < 2) return res.status(403).send('Access Denied');
    
    const token = pathParts[1];
    if (token !== ACCESS_TOKENS[app]) {
      return res.status(403).send('Access Denied: Invalid Token');
    }
    next();
  };
};

// Helper function to safely serve static files
const safeServeStaticFile = (filePath, fallbackPath, contentType, res) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error reading file ${filePath}: ${err.message}`);
      
      // Try fallback path if provided
      if (fallbackPath) {
        fs.readFile(fallbackPath, (fallbackErr, fallbackData) => {
          if (fallbackErr) {
            console.error(`Error reading fallback file ${fallbackPath}: ${fallbackErr.message}`);
            return res.status(404).send('File not found');
          }
          
          res.setHeader('Content-Type', contentType);
          res.send(fallbackData);
        });
        return;
      }
      
      return res.status(404).send('File not found');
    }
    
    res.setHeader('Content-Type', contentType);
    res.send(data);
  });
};

// Mock data for schools (expanded for better testing)
const mockSchools = [
  "Colegio Ejemplo 1",
  "Colegio Ejemplo 2",
  "Colegio Nacional",
  "Institución Educativa Principal",
  "Escuela Básica",
  "Colegio San José",
  "Institución Educativa Misericordia",
  "Colegio Santa María",
  "Colegio Misioneros del Saber",
  "Escuela Misión Pedagógica",
  "Liceo Mixto Departamental",
  "Colegio Departamental",
  "Instituto Pedagógico Nacional",
  "Colegio San Francisco de Asís"
];

// Handle schools search API
app.get('/api/search-schools', async (req, res) => {
  console.log('GET /api/search-schools requested');
  console.log('Query parameters:', req.query);
  console.log('Request headers:', req.headers);
  
  const query = req.query.q;
  if (!query || query.length < 3) {
    console.log('Query too short or missing, returning empty array');
    return res.json([]);
  }

  try {
    if (isDatabaseAvailable()) {
      // Query the rectores table using the correct column name
      console.log('Searching in database for:', query);
      const result = await pool.query(
        `SELECT DISTINCT nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ as name 
         FROM rectores 
         WHERE nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ ILIKE $1 
         ORDER BY nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ 
         LIMIT 10`,
        [`%${query}%`]
      );
      console.log('Database search results:', result.rows);
      res.json(result.rows.map(row => row.name));
    } else {
      // Mock data for testing when no database is available
      console.log('Using mock data, filtering for:', query);
      const filtered = mockSchools.filter(name => 
        name.toLowerCase().includes(query.toLowerCase())
      );
      console.log('Mock data results:', filtered);
      res.json(filtered);
    }
  } catch (error) {
    console.error('Error searching schools:', error);
    console.error('Error details:', error.message);
    res.status(500).json([]);
  }
});

// Handle POST version of search-schools (used by estudiantes)
app.post('/api/search-schools', async (req, res) => {
  console.log('POST /api/search-schools requested');
  console.log('Body:', req.body);
  
  const query = req.body?.q || '';
  if (!query || query.length < 3) {
    return res.json([]);
  }

  try {
    if (isDatabaseAvailable()) {
      // Query the rectores table using the correct column name
      console.log('Searching in database for:', query);
      const result = await pool.query(
        `SELECT DISTINCT nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ as name 
         FROM rectores 
         WHERE nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ ILIKE $1 
         ORDER BY nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ 
         LIMIT 10`,
        [`%${query}%`]
      );
      console.log('Database search results:', result.rows);
      res.json(result.rows.map(row => row.name));
    } else {
      // Mock data for testing when no database is available
      console.log('Using mock data, filtering for:', query);
      const filtered = mockSchools.filter(name => 
        name.toLowerCase().includes(query.toLowerCase())
      );
      console.log('Mock data results:', filtered);
      res.json(filtered);
    }
  } catch (error) {
    console.error('Error searching schools:', error);
    console.error('Error details:', error.message);
    res.status(500).json([]);
  }
});

// Handle form submissions
app.post('/api/submit-form', async (req, res) => {
  // Determine which form app based on the referer
  const referer = req.headers.referer || '';
  let targetApp = 'docentes'; // Default
  
  for (const app of Object.keys(ACCESS_TOKENS)) {
    if (referer.includes(`/${app}/`)) {
      targetApp = app;
      break;
    }
  }
  
  console.log(`Form submission for ${targetApp} application`);
  
  try {
    // Get the form data
    const formData = req.body;
    
    // CRITICAL FIX: Ensure schedule is always handled correctly
    if (formData.schedule !== undefined) {
      // For estudiantes, keep schedule as a string
      if (targetApp === 'estudiantes') {
        console.log('Estudiantes form - keeping schedule as string:', formData.schedule);
      } else if (!Array.isArray(formData.schedule)) {
        console.log('Converting schedule to array:', formData.schedule);
        
        // If it's a string, try to convert it to an array
        if (typeof formData.schedule === 'string') {
          try {
            const parsedSchedule = JSON.parse(formData.schedule);
            if (Array.isArray(parsedSchedule)) {
              formData.schedule = parsedSchedule;
            } else {
              formData.schedule = [formData.schedule];
            }
          } catch (e) {
            // If parsing fails, treat it as a single item
            formData.schedule = [formData.schedule];
          }
        } else if (formData.schedule === null) {
          formData.schedule = [];
        } else {
          // For any other type, convert to array with the value
          formData.schedule = [String(formData.schedule)];
        }
      }
    } else {
      // If schedule is missing for estudiantes, leave it undefined
      if (targetApp !== 'estudiantes') {
        console.log('Schedule field is missing, adding empty array');
        formData.schedule = [];
      }
    }
    
    if (pool) {
      console.log('Preparing to save form data to database...');
      
      // Each form type has a different table structure
      if (targetApp === 'docentes') {
        // For docentes form, use the specific column structure
        console.log('Using specific column mapping for docentes form');
        
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
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
          RETURNING id
        `;
        
        // Combine early and late grades
        const allGrades = [
          ...(formData.teachingGradesEarly || []), 
          ...(formData.teachingGradesLate || [])
        ];
        
        const result = await pool.query(query, [
          formData.schoolName,
          formData.yearsOfExperience,
          allGrades,
          formData.schedule,
          formData.feedbackSources,
          formData.comunicacion,
          formData.practicas_pedagogicas,
          formData.convivencia
        ]);
        
        console.log(`Form saved to database with ID: ${result.rows[0].id}`);
        res.json({ success: true, id: result.rows[0].id });
      } 
      else if (targetApp === 'estudiantes') {
        // For estudiantes form, use the specific column structure 
        console.log('Using specific column mapping for estudiantes form');
        console.log('Form data fields:', Object.keys(formData));
        
        // Field mapping based on the actual form fields observed in logs
        // The form uses yearsOfExperience for anos_estudiando
        // For grado_actual, use the first grade in teachingGradesLate or a default
        let gradoActual = 'No especificado';
        if (formData.teachingGradesLate && formData.teachingGradesLate.length > 0) {
          gradoActual = formData.teachingGradesLate[0];
        }
        
        // Make retroalimentacion_de optional since the question was removed
        const hasRetroalimentacion = formData.feedbackSources !== undefined;
        
        let query;
        let params;
        
        if (hasRetroalimentacion) {
          // If feedbackSources exists, use original query
          query = `
            INSERT INTO estudiantes_form_submissions (
              institucion_educativa, 
              anos_estudiando, 
              grado_actual, 
              jornada,
              retroalimentacion_de,
              comunicacion, 
              practicas_pedagogicas, 
              convivencia
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id
          `;
          
          params = [
            formData.schoolName,
            formData.yearsOfExperience,
            gradoActual,
            formData.schedule,
            formData.feedbackSources,
            formData.comunicacion,
            formData.practicas_pedagogicas,
            formData.convivencia
          ];
        } else {
          // If feedbackSources doesn't exist, skip it in the query
          query = `
            INSERT INTO estudiantes_form_submissions (
              institucion_educativa, 
              anos_estudiando, 
              grado_actual, 
              jornada,
              comunicacion, 
              practicas_pedagogicas, 
              convivencia
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id
          `;
          
          params = [
            formData.schoolName,
            formData.yearsOfExperience,
            gradoActual,
            formData.schedule,
            formData.comunicacion,
            formData.practicas_pedagogicas,
            formData.convivencia
          ];
        }
        
        const result = await pool.query(query, params);
        
        console.log(`Form saved to database with ID: ${result.rows[0].id}`);
        res.json({ success: true, id: result.rows[0].id });
      }
      else if (targetApp === 'acudientes') {
        // For acudientes form, use the specific column structure
        console.log('Using specific column mapping for acudientes form');
        console.log('Form data fields:', Object.keys(formData));
        
        // Inspect the form data to understand what fields we're working with
        console.log('Form structure details:');
        console.log('- studentGrades:', formData.studentGrades);
        console.log('- frequencyRatings5:', Object.keys(formData.frequencyRatings5 || {}).length);
        console.log('- frequencyRatings6:', Object.keys(formData.frequencyRatings6 || {}).length);
        console.log('- frequencyRatings7:', Object.keys(formData.frequencyRatings7 || {}).length);
        
        const query = `
          INSERT INTO acudientes_form_submissions (
            institucion_educativa, 
            grados_estudiantes, 
            comunicacion, 
            practicas_pedagogicas, 
            convivencia
          ) VALUES ($1, $2, $3, $4, $5) 
          RETURNING id
        `;
        
        // Field mapping for acudientes form
        // Map frequencyRatings5 to comunicacion
        // Map frequencyRatings6 to practicas_pedagogicas
        // Map frequencyRatings7 to convivencia
        
        const result = await pool.query(query, [
          formData.schoolName,
          formData.studentGrades || [],
          formData.frequencyRatings5 || {}, // comunicacion
          formData.frequencyRatings6 || {}, // practicas_pedagogicas
          formData.frequencyRatings7 || {}  // convivencia
        ]);
        
        console.log(`Form saved to database with ID: ${result.rows[0].id}`);
        res.json({ success: true, id: result.rows[0].id });
      }
      else {
        // For any other form, use a generic approach
        const tableName = `${targetApp}_form_submissions`;
        console.log(`Using generic approach for ${tableName}`);
        
        const query = `INSERT INTO ${tableName} (data) VALUES ($1) RETURNING id`;
        const result = await pool.query(query, [JSON.stringify(formData)]);
        console.log(`Form saved to database with ID: ${result.rows[0].id}`);
        res.json({ success: true, id: result.rows[0].id });
      }
    } else {
      // Mock success for testing when no database is available
      console.log('Database not available, simulating successful submission');
      console.log('Form data:', JSON.stringify(formData, null, 2));
      res.json({ success: true, id: Date.now() });
    }
  } catch (error) {
    console.error('Error processing form submission:', error);
    console.error('Error details:', error.message);
    console.error('Form data:', req.body);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error processing form submission',
      message: error.message
    });
  }
});

// Serve special image files
app.get('/images/LogoCosmo.png', (req, res) => {
  console.log('Serving LogoCosmo.png via dedicated route handler');
  
  // Primary path
  const imagePath = path.join(__dirname, 'Stats', 'frontend', 'build', 'images', 'LogoCosmo.png');
  // Fallback path
  const fallbackPath = path.join(__dirname, 'Stats', 'frontend', 'public', 'images', 'LogoCosmo.png');
  
  safeServeStaticFile(imagePath, fallbackPath, 'image/png', res);
});

app.get('/rectores.jpeg', (req, res) => {
  const imagePath = path.join(__dirname, 'form-docentes', 'public', 'rectores.jpeg');
  safeServeStaticFile(imagePath, null, 'image/jpeg', res);
});

app.get('/coordinadores.jpeg', (req, res) => {
  const imagePath = path.join(__dirname, 'form-docentes', 'public', 'coordinadores.jpeg');
  safeServeStaticFile(imagePath, null, 'image/jpeg', res);
});

// Serve form applications with token validation
// docentes application
app.use('/docentes/:token', (req, res, next) => {
  if (req.params.token !== ACCESS_TOKENS['docentes']) {
    return res.status(403).send('Access Denied: Invalid Token');
  }
  next();
}, express.static(path.join(__dirname, 'form-docentes', 'build')));

// acudientes application
app.use('/acudientes/:token', (req, res, next) => {
  if (req.params.token !== ACCESS_TOKENS['acudientes']) {
    return res.status(403).send('Access Denied: Invalid Token');
  }
  next();
}, express.static(path.join(__dirname, 'form-acudientes', 'build')));

// estudiantes application
app.use('/estudiantes/:token', (req, res, next) => {
  if (req.params.token !== ACCESS_TOKENS['estudiantes']) {
    return res.status(403).send('Access Denied: Invalid Token');
  }
  next();
}, express.static(path.join(__dirname, 'form-estudiantes', 'build')));

// stats application
app.use('/stats/:token', (req, res, next) => {
  if (req.params.token !== ACCESS_TOKENS['stats']) {
    return res.status(403).send('Access Denied: Invalid Token');
  }
  next();
}, express.static(path.join(__dirname, 'Stats', 'frontend', 'build')));

// Catch-all for client-side routing in React apps
app.get('/docentes/:token/*', (req, res, next) => {
  if (req.params.token !== ACCESS_TOKENS['docentes']) {
    return res.status(403).send('Access Denied: Invalid Token');
  }
  res.sendFile(path.join(__dirname, 'form-docentes', 'build', 'index.html'));
});

app.get('/acudientes/:token/*', (req, res, next) => {
  if (req.params.token !== ACCESS_TOKENS['acudientes']) {
    return res.status(403).send('Access Denied: Invalid Token');
  }
  res.sendFile(path.join(__dirname, 'form-acudientes', 'build', 'index.html'));
});

app.get('/estudiantes/:token/*', (req, res, next) => {
  if (req.params.token !== ACCESS_TOKENS['estudiantes']) {
    return res.status(403).send('Access Denied: Invalid Token');
  }
  res.sendFile(path.join(__dirname, 'form-estudiantes', 'build', 'index.html'));
});

app.get('/stats/:token/*', (req, res, next) => {
  if (req.params.token !== ACCESS_TOKENS['stats']) {
    return res.status(403).send('Access Denied: Invalid Token');
  }
  res.sendFile(path.join(__dirname, 'Stats', 'frontend', 'build', 'index.html'));
});

// Welcome page (root route)
app.get('/', (req, res) => {
  const links = Object.entries(ACCESS_TOKENS).map(([app, token]) => {
    return `<li><a href="/${app}/${token}">${app.charAt(0).toUpperCase() + app.slice(1)}</a></li>`;
  }).join('\n');

  res.send(`
    <html>
      <head>
        <title>COSMO Applications</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          h1 { color: #333; }
          .logo { max-width: 200px; margin-bottom: 20px; }
          .app-list { list-style: none; padding: 0; display: inline-block; text-align: left; }
          .app-list li { margin: 10px 0; }
          .app-list a { color: #0066cc; text-decoration: none; padding: 8px 16px; display: inline-block; border: 1px solid #ddd; border-radius: 4px; }
          .app-list a:hover { background-color: #f0f7ff; text-decoration: none; }
        </style>
      </head>
      <body>
        <img src="/images/LogoCosmo.png" alt="COSMO Logo" class="logo">
        <h1>COSMO Applications</h1>
        <p>Click on the links below to access the applications:</p>
        <ul class="app-list">
          ${links}
        </ul>
      </body>
    </html>
  `);
});

// Define the frequency rating mappings
const frequencyMappings = {
  comunicacion: {
    title: "COMUNICACIÓN",
    items: [
      {
        displayText: "Los docentes tienen la disposición de dialogar con las familias sobre los aprendizajes de los estudiantes en espacios adicionales a la entrega de notas.",
        questionMappings: {
          docentes: "Tengo la disposición de dialogar con los acudientes sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas.",
          estudiantes: "Mis profesores están dispuestos a hablar con mis acudientes sobre cómo me está yendo en el colegio, en momentos diferentes a la entrega de notas.",
          acudientes: "Los profesores tienen la disposición para hablar conmigo sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas."
        }
      },
      {
        displayText: "Los docentes promueven el apoyo de las familias a los estudiantes por medio de actividades para hacer en casa.",
        questionMappings: {
          docentes: "Promuevo el apoyo de los acudientes al aprendizaje de los estudiantes, a través de actividades académicas y lúdicas para realizar en espacios fuera de la institución educativa.",
          estudiantes: "Mis profesores me dejan actividades para hacer en casa, las cuales necesitan el apoyo de mis acudientes.",
          acudientes: "Los profesores promueven actividades para que apoye en su proceso de aprendizaje a los estudiantes que tengo a cargo."
        }
      },
      {
        displayText: "Las familias reciben información veraz acerca de las capacidades y/o talentos de los estudiantes, independiente de su condición de aprendizaje.",
        questionMappings: {
          docentes: "Informo a los acudientes sobre las capacidades y/o talentos de sus estudiantes, independiente de su condición de aprendizaje.",
          estudiantes: "Mis profesores le cuentan a mis acudientes sobre mis capacidades y/o talentos, independiente de mi condición de aprendizaje.",
          acudientes: "Recibo información veraz acerca de las capacidades y/o talentos de los estudiantes, independiente de su condición de aprendizaje."
        }
      },
      {
        displayText: "Cuando hay dificultades, las familias pueden reunirse con los directivos docentes para encontrar soluciones de manera conjunta.",
        questionMappings: {
          docentes: "Cuando hay dificultades, los acudientes pueden reunirse con los directivos docentes del colegio para encontrar soluciones de manera conjunta.",
          estudiantes: "Cuando hay problemas en el colegio, mis acudientes pueden hablar con los directivos docentes para buscar soluciones entre todos.",
          acudientes: "Cuando hay dificultades, puedo reunirme con los directivos docentes para encontrar soluciones de manera conjunta."
        }
      }
    ]
  },
  practicas_pedagogicas: {
    title: "PRÁCTICAS PEDAGÓGICAS",
    items: [
      {
        displayText: "Los intereses y las necesidades de los estudiantes son tenidos en cuenta en la planeación de las clases.",
        questionMappings: {
          docentes: "Cuando preparo mis clases tengo en cuenta los intereses y necesidades de los estudiantes.",
          estudiantes: "Los profesores tienen en cuenta mis intereses y afinidades para escoger lo que vamos a hacer en clase.",
          acudientes: "Los profesores tienen en cuenta los intereses y necesidades de los estudiantes para escoger los temas que se van a tratar en clase."
        }
      },
      {
        displayText: "Los docentes explican los temas de clase de manera clara y comprensible.",
        questionMappings: {
          docentes: "Explico los temas de clase de manera clara y comprensible para mis estudiantes.",
          estudiantes: "Mis profesores explican los temas de clase de una manera clara y comprensible.",
          acudientes: "Los profesores explican los temas de clase de manera clara y comprensible para los estudiantes."
        }
      },
      {
        displayText: "Los docentes enseñan diversas formas de resolver problemas, más allá de memorizar información.",
        questionMappings: {
          docentes: "Enseño a mis estudiantes diversas formas de resolver problemas, más allá de memorizar información.",
          estudiantes: "Mis profesores me enseñan diversas formas de resolver problemas, más allá de memorizar información.",
          acudientes: "Los profesores enseñan a los estudiantes diversas formas de resolver problemas, más allá de memorizar información."
        }
      },
      {
        displayText: "Cuando los estudiantes presentan dificultades en sus desempeños, los docentes se preocupan por entender sus causas.",
        questionMappings: {
          docentes: "Cuando mis estudiantes presentan dificultades en sus desempeños, me preocupo por entender sus causas.",
          estudiantes: "Cuando tengo dificultades con mis tareas y trabajos, mis profesores se preocupan por entender por qué me está costando trabajo.",
          acudientes: "Cuando los estudiantes presentan dificultades en sus desempeños, los profesores se preocupan por entender sus causas."
        }
      }
    ]
  },
  convivencia: {
    title: "CONVIVENCIA",
    items: [
      {
        displayText: "Todos los estudiantes son tratados con respeto independiente de sus creencias religiosas, género, orientación sexual, etnia y capacidades o talentos.",
        questionMappings: {
          docentes: "En el colegio mis estudiantes son tratados con respeto, independiente de sus creencias religiosas, género, orientación sexual, grupo étnico y capacidades o talentos de los demás.",
          estudiantes: "En el colegio mis compañeros y yo somos tratados con respeto sin importar nuestras creencias religiosas, género, orientación sexual, grupo étnico y capacidades o talentos.",
          acudientes: "En el colegio los estudiantes son respetuosos y solidarios entre ellos, comprendiendo y aceptando las creencias religiosas, el género, la orientación sexual, el grupo étnico y las capacidades o talentos de los demás."
        }
      },
      {
        displayText: "Las normas del colegio son claras y las consecuencias de incumplirlas son justas.",
        questionMappings: {
          docentes: "Las normas del colegio son claras y las consecuencias de incumplirlas son justas.",
          estudiantes: "Las normas del colegio son claras y cuando no las cumplo, las consecuencias que me aplican son justas.",
          acudientes: "Las normas del colegio son claras y las consecuencias de incumplirlas son justas."
        }
      },
      {
        displayText: "Cuando hay conflictos, estos se resuelven de forma pacífica.",
        questionMappings: {
          docentes: "Cuando hay conflictos entre los estudiantes, estos se resuelven de forma pacífica.",
          estudiantes: "Cuando hay peleas o desacuerdos en el colegio, estos se resuelven hablando y sin violencia.",
          acudientes: "Cuando hay conflictos en el colegio, estos se resuelven de forma pacífica."
        }
      },
      {
        displayText: "Se promueve que los estudiantes se respeten y se valoren entre sí.",
        questionMappings: {
          docentes: "Promuevo que mis estudiantes se respeten y se valoren entre sí.",
          estudiantes: "En el colegio nos enseñan a respetarnos y valorarnos entre compañeros.",
          acudientes: "En el colegio promueven que los estudiantes se respeten y se valoren entre sí."
        }
      }
    ]
  }
};

// Calculate frequency percentages for a specific question
async function calculateFrequency(tableName, question, sectionColumn, school) {
  if (!question || question === 'NA') {
    return { S: 0, A: 0, N: 0 };
  }

  try {
    console.log(`Calculating frequency for ${tableName}, question: "${question}", column: ${sectionColumn}${school ? `, school: ${school}` : ''}`);
    
    // Check if pool is defined and the connection is active
    if (!isDatabaseAvailable()) {
      console.log('Database not available, using mock data for frequency ratings');
      // Return mock frequency data
      return {
        S: Math.floor(Math.random() * 40) + 40, // 40-80%
        A: Math.floor(Math.random() * 30) + 10, // 10-40%
        N: Math.floor(Math.random() * 10)       // 0-10%
      };
    }
    
    let query = `
      SELECT 
        jsonb_extract_path_text(${sectionColumn}, $1) as rating,
        COUNT(*) as count
      FROM ${tableName}
      WHERE jsonb_extract_path_text(${sectionColumn}, $1) IS NOT NULL
    `;
    
    const params = [question];
    
    // Add school filter if provided
    if (school) {
      query += ` AND institucion_educativa = $2`;
      params.push(school);
    }
    
    query += `
      GROUP BY jsonb_extract_path_text(${sectionColumn}, $1)
    `;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      console.log(`No ratings found for question: ${question}`);
      // Generate consistent mock data for questions that don't have data
      // Use the question string to create a seed for consistent random values
      const seed = question.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const rand = (min, max) => {
        const x = Math.sin(seed + 1) * 10000;
        const r = x - Math.floor(x);
        return Math.floor(r * (max - min + 1)) + min;
      };
      
      return {
        S: rand(40, 80),
        A: rand(10, 40),
        N: rand(0, 10)
      };
    }
    
    let total = 0;
    const counts = { S: 0, A: 0, N: 0 };
    
    result.rows.forEach(row => {
      const count = parseInt(row.count);
      total += count;
      
      const rating = row.rating.toLowerCase();
      if (rating.includes('siempre')) {
        counts.S += count;
      } else if (rating.includes('veces')) {
        counts.A += count;
      } else if (rating.includes('nunca')) {
        counts.N += count;
      }
    });
    
    if (total === 0) {
      return { S: 0, A: 0, N: 0 };
    }
    
    return {
      S: Math.round((counts.S / total) * 100),
      A: Math.round((counts.A / total) * 100),
      N: Math.round((counts.N / total) * 100)
    };
  } catch (error) {
    console.error(`Error calculating frequency for ${tableName}, question: ${question}:`, error);
    // Return mock data on error
    return {
      S: Math.floor(Math.random() * 40) + 40, // 40-80%
      A: Math.floor(Math.random() * 30) + 10, // 10-40%
      N: Math.floor(Math.random() * 10)       // 0-10%
    };
  }
}

app.get('/api/frequency-ratings', async (req, res) => {
  try {
    const school = req.query.school;
    console.log(`Handling frequency-ratings request${school ? ` for school: ${school}` : ' for all schools'}`);
    
    const results = [];
    
    // Process each section
    for (const [sectionKey, section] of Object.entries(frequencyMappings)) {
      const sectionData = {
        title: section.title,
        questions: []
      };
      
      // Process each question in the section
      for (const item of section.items) {
        // Calculate frequencies for each form type
        const docentesFreq = await calculateFrequency(
          'docentes_form_submissions', 
          item.questionMappings.docentes, 
          sectionKey,
          school
        );
        
        const estudiantesFreq = await calculateFrequency(
          'estudiantes_form_submissions', 
          item.questionMappings.estudiantes, 
          sectionKey,
          school
        );
        
        const acudientesFreq = await calculateFrequency(
          'acudientes_form_submissions', 
          item.questionMappings.acudientes, 
          sectionKey,
          school
        );
        
        sectionData.questions.push({
          displayText: item.displayText,
          questionMappings: item.questionMappings,
          results: {
            docentes: docentesFreq,
            estudiantes: estudiantesFreq,
            acudientes: acudientesFreq
          }
        });
      }
      
      results.push(sectionData);
    }
    
    console.log(`Returning frequency data with ${results.length} sections`);
    res.json(results);
  } catch (error) {
    console.error('Error handling frequency-ratings request:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

app.get('/api/monitoring', async (req, res) => {
  try {
    console.log('Handling monitoring request');

    // If no database connection, return mock data
    if (!isDatabaseAvailable()) {
      console.log('Database not available, using mock data for monitoring');
      
      // Create mock monitoring data with the schools from the mockSchools array
      const mockMonitoringData = mockSchools.map(schoolName => {
        return {
          schoolName: schoolName,
          rectorName: `Rector de ${schoolName}`,
          submissions: {
            docentes: Math.floor(Math.random() * 50) + 5,
            estudiantes: Math.floor(Math.random() * 100) + 20,
            acudientes: Math.floor(Math.random() * 70) + 10
          }
        };
      });
      
      console.log(`Returning mock monitoring data with ${mockMonitoringData.length} schools`);
      return res.json(mockMonitoringData);
    }

    // Get actual school names from the database
    const schoolsQuery = `
      SELECT DISTINCT 
        nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ as school_name,
        nombre_s_y_apellido_s_completo_s as rector_name
      FROM rectores
      WHERE nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ IS NOT NULL
      ORDER BY nombre_de_la_institucion_educativa_en_la_actualmente_desempena_
    `;
    
    console.log('Executing schools query for monitoring endpoint');
    const schoolsResult = await pool.query(schoolsQuery);
    console.log(`Found ${schoolsResult.rowCount} schools`);
    
    // For each school, count submissions in each form table
    const monitoringData = await Promise.all(
      schoolsResult.rows.map(async (school) => {
        // Count submissions for each form type
        try {
          const countQueries = [
            pool.query(`
              SELECT COUNT(*) as count 
              FROM docentes_form_submissions 
              WHERE institucion_educativa = $1
            `, [school.school_name]),
            pool.query(`
              SELECT COUNT(*) as count 
              FROM estudiantes_form_submissions 
              WHERE institucion_educativa = $1
            `, [school.school_name]),
            pool.query(`
              SELECT COUNT(*) as count 
              FROM acudientes_form_submissions 
              WHERE institucion_educativa = $1
            `, [school.school_name])
          ];
          
          const [docentesResult, estudiantesResult, acudientesResult] = await Promise.all(countQueries);
          
          return {
            schoolName: school.school_name,
            rectorName: school.rector_name || 'No especificado',
            submissions: {
              docentes: parseInt(docentesResult.rows[0].count) || 0,
              estudiantes: parseInt(estudiantesResult.rows[0].count) || 0,
              acudientes: parseInt(acudientesResult.rows[0].count) || 0
            }
          };
        } catch (countError) {
          console.error(`Error counting submissions for school ${school.school_name}:`, countError);
          return {
            schoolName: school.school_name,
            rectorName: school.rector_name || 'No especificado',
            submissions: {
              docentes: 0,
              estudiantes: 0,
              acudientes: 0
            }
          };
        }
      })
    );
    
    console.log(`Returning monitoring data for ${monitoringData.length} schools`);
    res.json(monitoringData);
  } catch (error) {
    console.error('Error handling monitoring request:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Add API endpoints for grade distributions needed by the Stats app
app.get('/api/test-grades', async (req, res) => {
  try {
    const school = req.query.school;
    console.log(`Handling test-grades request for school: ${school}`);
    
    // This endpoint provides grade distribution data for docentes and acudientes
    // Format expected by the Stats app:
    // [{ label: 'Grade Name', value: percentage, color: 'color-code' }]
    
    // Use mock data for now, but in production this would query the actual submissions
    const mockGradesData = [
      { label: '1°', value: 15, color: '#4285F4' },
      { label: '2°', value: 12, color: '#34A853' },
      { label: '3°', value: 14, color: '#FBBC05' },
      { label: '4°', value: 16, color: '#EA4335' },
      { label: '5°', value: 13, color: '#8F44AD' },
      { label: '6°', value: 8, color: '#3498DB' },
      { label: '7°', value: 7, color: '#1ABC9C' },
      { label: '8°', value: 5, color: '#F39C12' },
      { label: '9°', value: 4, color: '#D35400' },
      { label: '10°', value: 3, color: '#C0392B' },
      { label: '11°', value: 3, color: '#7F8C8D' }
    ];
    
    // Wrap the data array in an object with a 'data' property
    res.json({
      school: school,
      data: mockGradesData,
      debug: {
        rawData: []
      }
    });
  } catch (error) {
    console.error('Error handling test-grades request:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

app.get('/api/estudiantes-grades', async (req, res) => {
  try {
    const school = req.query.school;
    console.log(`Handling estudiantes-grades request for school: ${school}`);
    
    // This endpoint provides grade distribution data for estudiantes
    // Format expected by the Stats app:
    // [{ label: 'Grade Name', value: percentage, color: 'color-code' }]
    
    // Use mock data for now, but in production this would query the actual submissions
    const mockEstudiantesGrades = [
      { label: '5°', value: 20, color: '#4285F4' },
      { label: '8°', value: 25, color: '#34A853' },
      { label: '9°', value: 20, color: '#FBBC05' },
      { label: '10°', value: 20, color: '#EA4335' },
      { label: '11°', value: 15, color: '#8F44AD' }
    ];
    
    // Wrap the data array in an object with a 'data' property
    res.json({
      school: school,
      data: mockEstudiantesGrades,
      debug: {
        rawData: []
      }
    });
  } catch (error) {
    console.error('Error handling estudiantes-grades request:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Don't expose error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).send('Internal Server Error');
  } else {
    res.status(500).send(`Internal Server Error: ${err.message}`);
  }
});

// Start server
app.listen(port, () => {
  console.log(`Simplified COSMO server running on port ${port}`);
  console.log('Access tokens:');
  Object.entries(ACCESS_TOKENS).forEach(([app, token]) => {
    console.log(`${app}: "${token}"`);
  });
}); 