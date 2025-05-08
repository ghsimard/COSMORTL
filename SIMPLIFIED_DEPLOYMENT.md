# Simplified Deployment for COSMO Project

This guide provides a simplified approach to deploy the COSMO Project without using a separate proxy server.

## Simplified Architecture

Instead of deploying six separate services (proxy server + 5 applications), we can simplify to a single integrated service that handles:

1. Form access with token validation
2. Serving all form applications 
3. Connecting to the database

## Implementation Steps

### 1. Consolidate Applications into a Single Service

#### Step 1: Create a Combined Express Server

Create a new file called `server.js` in the root directory:

```javascript
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Add body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Access tokens
const ACCESS_TOKENS = {
  'docentes': process.env.DOCENTES_TOKEN || 'DocToken123',
  'acudientes': process.env.ACUDIENTES_TOKEN || 'AcuToken456',
  'estudiantes': process.env.ESTUDIANTES_TOKEN || 'EstToken789',
  'stats': process.env.STATS_TOKEN || 'StatsToken012'
};

// Token validation middleware
const validateToken = (app) => {
  return (req, res, next) => {
    const pathParts = req.path.split('/');
    if (pathParts.length < 3) return res.status(403).send('Access Denied');
    
    const token = pathParts[2];
    if (token !== ACCESS_TOKENS[app]) {
      return res.status(403).send('Access Denied: Invalid Token');
    }
    next();
  };
};

// API Routes
// Set up routes for form-docentes API
app.use('/api/submit-form', (req, res) => {
  // Determine which form app based on the referer
  const referer = req.headers.referer || '';
  let targetApp = 'docentes'; // Default
  
  for (const app of Object.keys(ACCESS_TOKENS)) {
    if (referer.includes(`/${app}/`)) {
      targetApp = app;
      break;
    }
  }
  
  // Here, implement form submission handling based on targetApp
  // This would connect directly to your database
  
  // Example implementation:
  res.json({ success: true });
});

// Serve form applications based on tokens
app.use('/docentes/:token', validateToken('docentes'), express.static(path.join(__dirname, 'form-docentes/build')));
app.use('/acudientes/:token', validateToken('acudientes'), express.static(path.join(__dirname, 'form-acudientes/build')));
app.use('/estudiantes/:token', validateToken('estudiantes'), express.static(path.join(__dirname, 'form-estudiantes/build')));
app.use('/stats/:token', validateToken('stats'), express.static(path.join(__dirname, 'Stats/frontend/build')));

// Catch-all for client-side routing in React apps
const sendSPA = (appDir) => {
  return (req, res) => {
    res.sendFile(path.join(__dirname, appDir, 'build', 'index.html'));
  };
};

app.get('/docentes/:token/*', validateToken('docentes'), sendSPA('form-docentes'));
app.get('/acudientes/:token/*', validateToken('acudientes'), sendSPA('form-acudientes'));
app.get('/estudiantes/:token/*', validateToken('estudiantes'), sendSPA('form-estudiantes'));
app.get('/stats/:token/*', validateToken('stats'), sendSPA('Stats/frontend'));

// Welcome page
app.get('/', (req, res) => {
  const links = Object.entries(ACCESS_TOKENS).map(([app, token]) => {
    return `<li><a href="/${app}/${token}">${app.charAt(0).toUpperCase() + app.slice(1)}</a></li>`;
  }).join('\n');

  res.send(`
    <html>
      <head>
        <title>COSMO Applications</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; }
          .app-list { list-style: none; padding: 0; }
          .app-list li { margin: 10px 0; }
          .app-list a { color: #0066cc; text-decoration: none; }
          .app-list a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
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
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Access tokens:');
  Object.entries(ACCESS_TOKENS).forEach(([app, token]) => {
    console.log(`${app}: "${token}"`);
  });
});
```

#### Step 2: Update package.json

Update your main package.json:

```json
{
  "name": "cosmo-project",
  "version": "1.0.0",
  "description": "Simplified COSMO Project",
  "main": "server.js",
  "engines": {
    "node": ">=16",
    "npm": ">=7"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "npm run build-docentes && npm run build-acudientes && npm run build-estudiantes && npm run build-stats",
    "build-docentes": "cd form-docentes && npm install && npm run build",
    "build-acudientes": "cd form-acudientes && npm install && npm run build",
    "build-estudiantes": "cd form-estudiantes && npm install && npm run build",
    "build-stats": "cd Stats/frontend && npm install && npm run build",
    "test": "echo 'No tests specified'"
  },
  "dependencies": {
    "express": "^4.18.2",
    "path": "^0.12.7"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 2. Setup Database Connection Directly

In your server.js, add direct database connectivity:

```javascript
// Add to the top of your server.js file
const { Pool } = require('pg');

// Configure PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Then add DB functionality to your form handling
app.use('/api/submit-form', async (req, res) => {
  try {
    // Get form data
    const formData = req.body;
    
    // Determine which form based on the referer
    const referer = req.headers.referer || '';
    let targetApp = 'docentes'; // Default
    
    for (const app of Object.keys(ACCESS_TOKENS)) {
      if (referer.includes(`/${app}/`)) {
        targetApp = app;
        break;
      }
    }
    
    // Insert into appropriate table based on targetApp
    const tableName = `${targetApp}_submissions`;
    const query = `INSERT INTO ${tableName} (data) VALUES ($1) RETURNING id`;
    const result = await pool.query(query, [JSON.stringify(formData)]);
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});
```

### 3. Configure for Render.com

Create a simplified render.yaml file:

```yaml
services:
  # Single web service for all applications
  - type: web
    name: cosmo-integrated
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: PORT
        value: 3000
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: DOCENTES_TOKEN
        generateValue: true
      - key: ACUDIENTES_TOKEN
        generateValue: true
      - key: ESTUDIANTES_TOKEN
        generateValue: true
      - key: STATS_TOKEN
        generateValue: true
    autoDeploy: true

  # PostgreSQL Database
  - type: pserv
    name: cosmo-postgres
    plan: free
    env: docker
    disk:
      name: data
      mountPath: /var/lib/postgresql/data
      sizeGB: 1
```

## Advantages of This Approach

1. **Simplified Deployment**: Only one web service instead of six
2. **Reduced Complexity**: No need for a proxy server to route between services
3. **Lower Cost**: Uses fewer resources on Render.com
4. **Easier Maintenance**: Only one service to monitor and update
5. **Better Performance**: No network hops between services

## Disadvantages

1. **Less Isolation**: All applications run in the same Node.js process
2. **Potential for Resource Contention**: High load on one app could affect others
3. **Monolithic Architecture**: Harder to scale individual components
4. **Deployment Coupling**: All applications must be deployed together

## Deployment Steps on Render.com

1. Push the changes (server.js, package.json, render.yaml) to your GitHub repository
2. Go to Render.com and create a new Blueprint
3. Connect to your GitHub repository
4. Render will automatically use the simplified render.yaml configuration
5. Review and click "Apply"

## Post-Deployment

Once deployed, access your applications using:
- http://{your-url}/docentes/{token}
- http://{your-url}/acudientes/{token}
- http://{your-url}/estudiantes/{token}
- http://{your-url}/stats/{token}

The tokens will be automatically generated by Render and available in your service's environment variables.

## Static File Considerations

For a production environment, consider using a CDN service like Render's Global CDN or Cloudflare to serve static assets more efficiently. 