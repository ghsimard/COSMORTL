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
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Test database connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection error:', err.stack);
    } else {
      console.log('Database connected successfully');
    }
  });
}

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

// Handle schools search API
app.get('/api/search-schools', async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 3) {
    return res.json([]);
  }

  try {
    if (pool) {
      // If we have a database connection, search in the database
      const result = await pool.query(
        `SELECT name FROM schools WHERE name ILIKE $1 ORDER BY name LIMIT 10`,
        [`%${query}%`]
      );
      res.json(result.rows.map(row => row.name));
    } else {
      // Mock data for testing when no database is available
      const mockSchools = [
        "Colegio Ejemplo 1",
        "Colegio Ejemplo 2",
        "Colegio Nacional",
        "Institución Educativa Principal",
        "Escuela Básica"
      ];
      const filtered = mockSchools.filter(name => 
        name.toLowerCase().includes(query.toLowerCase())
      );
      res.json(filtered);
    }
  } catch (error) {
    console.error('Error searching schools:', error);
    res.status(500).json([]);
  }
});

// Handle POST version of search-schools (used by estudiantes)
app.post('/api/search-schools', async (req, res) => {
  const query = req.body?.q || '';
  if (!query || query.length < 3) {
    return res.json([]);
  }

  try {
    if (pool) {
      // If we have a database connection, search in the database
      const result = await pool.query(
        `SELECT name FROM schools WHERE name ILIKE $1 ORDER BY name LIMIT 10`,
        [`%${query}%`]
      );
      res.json(result.rows.map(row => row.name));
    } else {
      // Mock data for testing when no database is available
      const mockSchools = [
        "Colegio Ejemplo 1",
        "Colegio Ejemplo 2",
        "Colegio Nacional",
        "Institución Educativa Principal",
        "Escuela Básica"
      ];
      const filtered = mockSchools.filter(name => 
        name.toLowerCase().includes(query.toLowerCase())
      );
      res.json(filtered);
    }
  } catch (error) {
    console.error('Error searching schools:', error);
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
      // If we have a database connection, save to the database
      const tableName = `${targetApp}_submissions`;
      const query = `INSERT INTO ${tableName} (data) VALUES ($1) RETURNING id`;
      const result = await pool.query(query, [JSON.stringify(formData)]);
      console.log(`Form saved to database with ID: ${result.rows[0].id}`);
      res.json({ success: true, id: result.rows[0].id });
    } else {
      // Mock success for testing when no database is available
      console.log('Database not available, simulating successful submission');
      console.log('Form data:', JSON.stringify(formData, null, 2));
      res.json({ success: true, id: Date.now() });
    }
  } catch (error) {
    console.error('Error processing form submission:', error);
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