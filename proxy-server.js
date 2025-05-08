const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const url = require('url');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 80;

// Read environment variables for service URLs or use development defaults
const DOCENTES_URL = process.env.DOCENTES_URL || 'http://localhost:3001';
const ACUDIENTES_URL = process.env.ACUDIENTES_URL || 'http://localhost:3005';
const ESTUDIANTES_URL = process.env.ESTUDIANTES_URL || 'http://localhost:3006';
const STATS_FRONTEND_URL = process.env.STATS_FRONTEND_URL || 'http://localhost:4000';
const STATS_BACKEND_URL = process.env.STATS_BACKEND_URL || 'http://localhost:4001';

// Add body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Access tokens - simplified to avoid special characters
const ACCESS_TOKENS = {
  'docentes': process.env.DOCENTES_TOKEN || 'DocToken123',
  'acudientes': process.env.ACUDIENTES_TOKEN || 'AcuToken456',
  'estudiantes': process.env.ESTUDIANTES_TOKEN || 'EstToken789',
  'stats': process.env.STATS_TOKEN || 'StatsToken012'
};

// CRITICAL: Direct handlers for specific problematic assets - these must come FIRST before any other middleware
// Direct handler for docentes JavaScript
app.get('/docentes/DocToken123/static/js/main.599a54e8.js', (req, res) => {
  console.log('DIRECT HANDLER: Serving main.js for docentes');
  
  const filePath = path.join(__dirname, 'form-docentes', 'build', 'static', 'js', 'main.599a54e8.js');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error reading JS file: ${err.message}`);
      return res.status(404).send('JS file not found');
    }
    
    res.setHeader('Content-Type', 'application/javascript');
    res.send(data);
  });
});

// Direct handler for docentes JavaScript chunk
app.get('/docentes/DocToken123/static/js/453.3efecf6a.chunk.js', (req, res) => {
  console.log('DIRECT HANDLER: Serving chunk.js for docentes');
  
  const filePath = path.join(__dirname, 'form-docentes', 'build', 'static', 'js', '453.3efecf6a.chunk.js');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error reading JS chunk file: ${err.message}`);
      return res.status(404).send('JS chunk file not found');
    }
    
    res.setHeader('Content-Type', 'application/javascript');
    res.send(data);
  });
});

// Direct handler for docentes CSS
app.get('/docentes/DocToken123/static/css/main.04ee0050.css', (req, res) => {
  console.log('DIRECT HANDLER: Serving main.css for docentes');
  
  const filePath = path.join(__dirname, 'form-docentes', 'build', 'static', 'css', 'main.04ee0050.css');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error reading CSS file: ${err.message}`);
      return res.status(404).send('CSS file not found');
    }
    
    res.setHeader('Content-Type', 'text/css');
    res.send(data);
  });
});

// Direct handler for docentes manifest
app.get('/docentes/DocToken123/manifest.json', (req, res) => {
  console.log('DIRECT HANDLER: Serving manifest.json for docentes');
  
  const filePath = path.join(__dirname, 'form-docentes', 'build', 'manifest.json');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error reading manifest.json file: ${err.message}`);
      
      // Try from public directory as fallback
      const publicFilePath = path.join(__dirname, 'form-docentes', 'public', 'manifest.json');
      fs.readFile(publicFilePath, (publicErr, publicData) => {
        if (publicErr) {
          console.error(`Error reading manifest.json from public: ${publicErr.message}`);
          return res.status(404).send('Manifest file not found');
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.send(publicData);
      });
      return;
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  });
});

// Helper function to normalize tokens for comparison
function normalizeToken(token) {
  return token.replace(/\s/g, '');
}

// Special middleware to handle static asset requests at the root level
app.use((req, res, next) => {
  const originalUrl = req.originalUrl || req.url;
  
  // Only process direct requests to static assets at the root path or specific application paths
  if (originalUrl.startsWith('/static/') || 
      originalUrl === '/manifest.json' || 
      originalUrl === '/favicon.ico' ||
      originalUrl.match(/\.(js|css|map|jpeg|jpg|png|gif|svg|ico)$/) ||
      originalUrl.includes('rectores.jpeg') ||
      originalUrl.includes('coordinadores.jpeg') ||
      originalUrl.includes('/images/') ||  // Add support for images directory
      // Handle Stats application specific paths
      (originalUrl.includes('/stats/StatsToken012/static/') ||
       originalUrl.includes('/stats/StatsToken012/images/') ||  // Add support for Stats images
       originalUrl.includes('/stats/StatsToken012/manifest.json') ||
       originalUrl.includes('/stats/StatsToken012/favicon'))) {
    
    console.log(`Caught static asset request: ${originalUrl}`);
    
    // Get the referer to determine which app the request is coming from
    const referer = req.headers.referer || '';
    console.log(`Static asset referer: ${referer}`);
    
    // Default to docentes if we can't determine
    let targetApp = 'docentes';
    let targetPort = 3001;
    
    // Special direct handling for image requests - particularly for /images/LogoCosmo.png
    if (originalUrl.startsWith('/images/')) {
      console.log(`Direct image request: ${originalUrl}`);
      
      // Check if this is a request from Stats based on referer
      if (referer.includes('/stats/')) {
        targetApp = 'stats';
        targetPort = 4000;
      } else if (originalUrl === '/images/LogoCosmo.png') {
        // Always route LogoCosmo.png to the Stats app regardless of referer
        targetApp = 'stats';
        targetPort = 4000;
        console.log('Routing LogoCosmo.png directly to Stats application');
      } else {
        // Try to determine app from referer
        for (const app of Object.keys(ACCESS_TOKENS)) {
          if (referer.includes(`/${app}/`)) {
            targetApp = app;
            break;
          }
        }
        
        // Update target port based on app
        if (targetApp === 'acudientes') targetPort = 3005;
        else if (targetApp === 'estudiantes') targetPort = 3006;
        else if (targetApp === 'stats') targetPort = 4000;
        else targetPort = 3001; // Default to docentes
      }
      
      // Proxy the image request to the correct application
      const newUrl = `http://localhost:${targetPort}${originalUrl}`;
      console.log(`Redirecting image to: ${newUrl}`);
      
      const proxyReq = require('http').request(
        newUrl,
        {
          method: req.method,
          headers: {
            ...req.headers,
            host: `localhost:${targetPort}`
          }
        },
        (proxyRes) => {
          // Set appropriate content type
          if (originalUrl.endsWith('.png')) {
            proxyRes.headers['content-type'] = 'image/png';
          } else if (originalUrl.endsWith('.jpg') || originalUrl.endsWith('.jpeg')) {
            proxyRes.headers['content-type'] = 'image/jpeg';
          } else if (originalUrl.endsWith('.gif')) {
            proxyRes.headers['content-type'] = 'image/gif';
          } else if (originalUrl.endsWith('.svg')) {
            proxyRes.headers['content-type'] = 'image/svg+xml';
          }
          
          // Copy headers and pipe response
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );
      
      proxyReq.on('error', (err) => {
        console.error(`Error proxying image: ${err.message}`);
        res.writeHead(500);
        res.end(`Error loading image: ${err.message}`);
      });
      
      req.pipe(proxyReq);
      return;
    }
    
    // Special case for Stats application images
    if (originalUrl.includes('/stats/StatsToken012/images/') || 
        (originalUrl.includes('/images/') && referer.includes('/stats/'))) {
      targetApp = 'stats';
      targetPort = 4000;
      
      // Modify the URL to remove the token for the Stats application
      let newPath = originalUrl.replace('/stats/StatsToken012', '');
      
      console.log(`Stats image asset: ${originalUrl} -> ${newPath}`);
      
      // Forward the request directly to the Stats frontend
      const newUrl = `http://localhost:${targetPort}${newPath}`;
      console.log(`Redirecting Stats image to: ${newUrl}`);
      
      const proxyReq = require('http').request(
        newUrl,
        {
          method: req.method,
          headers: {
            ...req.headers,
            host: `localhost:${targetPort}`
          }
        },
        (proxyRes) => {
          // Set content type based on file extension
          if (originalUrl.endsWith('.png')) {
            proxyRes.headers['content-type'] = 'image/png';
          } else if (originalUrl.endsWith('.jpg') || originalUrl.endsWith('.jpeg')) {
            proxyRes.headers['content-type'] = 'image/jpeg';
          } else if (originalUrl.endsWith('.gif')) {
            proxyRes.headers['content-type'] = 'image/gif';
          } else if (originalUrl.endsWith('.svg')) {
            proxyRes.headers['content-type'] = 'image/svg+xml';
          }
          
          // Copy all headers from the proxied response
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          
          // Pipe the response data
          proxyRes.pipe(res);
        }
      );
      
      // Handle errors
      proxyReq.on('error', (err) => {
        console.error(`Error proxying image asset: ${err.message}`);
        res.writeHead(500);
        res.end(`Error loading resource: ${err.message}`);
      });
      
      // Pipe the request body (if any)
      req.pipe(proxyReq);
      
      // Don't continue to other middleware
      return;
    }
    
    // Special case for Stats application
    if (originalUrl.includes('/stats/StatsToken012/')) {
      targetApp = 'stats';
      targetPort = 4000;
      
      // Modify the URL to remove the token for the Stats application
      let newPath = originalUrl.replace('/stats/StatsToken012', '');
      
      console.log(`Stats static asset: ${originalUrl} -> ${newPath}`);
      
      // Forward the request directly to the Stats frontend
      const newUrl = `http://localhost:${targetPort}${newPath}`;
      console.log(`Redirecting Stats static asset to: ${newUrl}`);
      
      const proxyReq = require('http').request(
        newUrl,
        {
          method: req.method,
          headers: {
            ...req.headers,
            host: `localhost:${targetPort}`
          }
        },
        (proxyRes) => {
          // Set content type based on file extension
          if (originalUrl.endsWith('.js')) {
            proxyRes.headers['content-type'] = 'application/javascript';
          } else if (originalUrl.endsWith('.css')) {
            proxyRes.headers['content-type'] = 'text/css';
          } else if (originalUrl.endsWith('.json')) {
            proxyRes.headers['content-type'] = 'application/json';
          } else if (originalUrl.endsWith('.ico')) {
            proxyRes.headers['content-type'] = 'image/x-icon';
          } else if (originalUrl.endsWith('.png')) {
            proxyRes.headers['content-type'] = 'image/png';
          } else if (originalUrl.endsWith('.jpg') || originalUrl.endsWith('.jpeg')) {
            proxyRes.headers['content-type'] = 'image/jpeg';
          } else if (originalUrl.endsWith('.svg')) {
            proxyRes.headers['content-type'] = 'image/svg+xml';
          }
          
          // Copy all headers from the proxied response
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          
          // Pipe the response data
          proxyRes.pipe(res);
        }
      );
      
      // Handle errors
      proxyReq.on('error', (err) => {
        console.error(`Error proxying static asset: ${err.message}`);
        res.writeHead(500);
        res.end(`Error loading resource: ${err.message}`);
      });
      
      // Pipe the request body (if any)
      req.pipe(proxyReq);
      
      // Don't continue to other middleware
      return;
    }
    
    // Try to extract the app from the referer for non-Stats applications
    for (const app of Object.keys(ACCESS_TOKENS)) {
      if (referer.includes(`/${app}/`)) {
        targetApp = app;
        break;
      }
    }
    
    // Update target port based on app
    switch(targetApp) {
      case 'docentes':
        targetPort = 3001;
        break;
      case 'acudientes':
        targetPort = 3005;
        break;
      case 'estudiantes':
        targetPort = 3006;
        break;
      case 'stats':
        targetPort = 4000;
        break;
      default:
        targetPort = 3001; // Default to docentes
    }
    
    // Construct new URL 
    const newUrl = `http://localhost:${targetPort}${originalUrl}`;
    console.log(`Redirecting static asset to: ${newUrl}`);
    
    // Proxy the request directly
    const proxyReq = require('http').request(
      newUrl,
      {
        method: req.method,
        headers: {
          ...req.headers,
          host: `localhost:${targetPort}`
        }
      },
      (proxyRes) => {
        // Set correct content type based on file extension
        if (originalUrl.endsWith('.js')) {
          proxyRes.headers['content-type'] = 'application/javascript';
        } else if (originalUrl.endsWith('.css')) {
          proxyRes.headers['content-type'] = 'text/css';
        } else if (originalUrl.endsWith('.json')) {
          proxyRes.headers['content-type'] = 'application/json';
        } else if (originalUrl.endsWith('.ico')) {
          proxyRes.headers['content-type'] = 'image/x-icon';
        } else if (originalUrl.endsWith('.png')) {
          proxyRes.headers['content-type'] = 'image/png';
        } else if (originalUrl.endsWith('.jpg') || originalUrl.endsWith('.jpeg')) {
          proxyRes.headers['content-type'] = 'image/jpeg';
        } else if (originalUrl.endsWith('.svg')) {
          proxyRes.headers['content-type'] = 'image/svg+xml';
        } else if (originalUrl.endsWith('.gif')) {
          proxyRes.headers['content-type'] = 'image/gif';
        }
        
        // Copy all headers from the proxied response
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        
        // Pipe the response data
        proxyRes.pipe(res);
      }
    );
    
    // Handle errors
    proxyReq.on('error', (err) => {
      console.error(`Error proxying static asset: ${err.message}`);
      res.writeHead(500);
      res.end(`Error loading resource: ${err.message}`);
    });
    
    // Pipe the request body (if any)
    req.pipe(proxyReq);
    
    // Don't continue to other middleware
    return;
  }
  
  // For non-static asset requests, continue to the next middleware
  next();
});

// Helper function to set correct MIME types 
const setMimeTypes = (proxyRes, req) => {
  const path = req.url || '';
  
  // Set proper MIME types based on file extension
  if (path.endsWith('.js')) {
    proxyRes.headers['content-type'] = 'application/javascript';
  } else if (path.endsWith('.css')) {
    proxyRes.headers['content-type'] = 'text/css';
  } else if (path.endsWith('.json')) {
    proxyRes.headers['content-type'] = 'application/json';
  } else if (path.endsWith('.png')) {
    proxyRes.headers['content-type'] = 'image/png';
  } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
    proxyRes.headers['content-type'] = 'image/jpeg';
  } else if (path.endsWith('.svg')) {
    proxyRes.headers['content-type'] = 'image/svg+xml';
  } else if (path.endsWith('.woff')) {
    proxyRes.headers['content-type'] = 'font/woff';
  } else if (path.endsWith('.woff2')) {
    proxyRes.headers['content-type'] = 'font/woff2';
  } else if (path.endsWith('.ttf')) {
    proxyRes.headers['content-type'] = 'font/ttf';
  } else if (path.endsWith('.ico')) {
    proxyRes.headers['content-type'] = 'image/x-icon';
  } else if (path.endsWith('.gif')) {
    proxyRes.headers['content-type'] = 'image/gif';
  } else if (path.endsWith('.pdf')) {
    proxyRes.headers['content-type'] = 'application/pdf';
  } else if (path.endsWith('.mp4')) {
    proxyRes.headers['content-type'] = 'video/mp4';
  } else if (path.endsWith('.webm')) {
    proxyRes.headers['content-type'] = 'video/webm';
  } else if (path.endsWith('.mp3')) {
    proxyRes.headers['content-type'] = 'audio/mpeg';
  } else if (path.endsWith('.wav')) {
    proxyRes.headers['content-type'] = 'audio/wav';
  }
};

// Middleware to check access token
const checkAccessToken = (req, res, next) => {
  const fullPath = req.originalUrl || req.url;
  console.log(`Checking path: ${fullPath}`);
  
  const pathParts = fullPath.split('/').filter(part => part.length > 0);
  
  // If there are no path parts, it's a request to the root
  if (pathParts.length === 0) {
    return next();
  }
  
  const appName = pathParts[0]; // Get the first part of the path
  
  // Check if this is a valid application
  if (!ACCESS_TOKENS[appName]) {
    console.log(`Invalid application: ${appName}`);
    return next(); // Let it proceed to the 404 handler
  }
  
  // Extract token from path (if it exists)
  let token = '';
  if (pathParts.length > 1) {
    token = pathParts[1];
  }

  // Static asset check - direct requests to static assets from root URL
  if ((fullPath.startsWith('/static/') || 
       fullPath.includes('/manifest.json') || 
       fullPath.includes('/favicon.ico') ||
       fullPath.endsWith('.js') || 
       fullPath.endsWith('.css') || 
       fullPath.endsWith('.map'))) {
    
    // Attempt to use referer header to determine which app this request belongs to
    const referer = req.headers.referer || '';
    console.log(`Static asset request from root with referer: ${referer}`);
    
    // Extract app name from referer if possible
    let refererApp = '';
    for (const app of Object.keys(ACCESS_TOKENS)) {
      if (referer.includes(`/${app}/`)) {
        refererApp = app;
        break;
      }
    }
    
    if (refererApp) {
      // Check if the request path already contains the app name to avoid duplication
      if (fullPath.includes(`/${refererApp}/`)) {
        console.log(`Path already contains app name, keeping as is: ${fullPath}`);
        req.url = fullPath;
      } else {
        // The path doesn't contain the app name yet, so we need to add it
        // But make sure not to add it if it's already at the start
        if (fullPath.startsWith('/')) {
          req.url = `/${refererApp}${fullPath}`;
        } else {
          req.url = `/${refererApp}/${fullPath}`;
        }
        console.log(`Redirecting static asset to app: ${req.url}`);
      }
      return next();
    }
    
    // If we can't determine the app, let it continue (it will likely 404)
    console.log(`Unable to determine app for static asset, continuing as is`);
    return next();
  }
  
  // If token matches, allow access
  if (token === ACCESS_TOKENS[appName]) {
    console.log(`Valid token found for ${appName}: ${token}`);
    // Store the app name in a custom header so path rewriter can use it
    req.appName = appName;
    next();
    return;
  }
  
  // For regular requests without a valid token, require authentication
  console.log(`--------------------------------------------------`);
  console.log(`Access attempt at ${new Date().toISOString()}`);
  console.log(`Full path: ${fullPath}`);
  console.log(`App: ${appName}`);
  console.log(`Token: "${token}"`);
  
  // Check for missing token
  if (!token || token.trim() === '') {
    console.log('Access denied: Missing token');
    return res.status(403).send('Access Denied: Missing Token');
  }
  
  // Validate token
  const expectedToken = ACCESS_TOKENS[appName];
  console.log(`Expected token: "${expectedToken}"`);
  
  if (token !== expectedToken) {
    console.log('Access denied: Invalid token');
    console.log(`Token mismatch: "${token}" !== "${expectedToken}"`);
    return res.status(403).send('Access Denied: Invalid Token');
  }
  
  console.log('Access granted!');
  req.appName = appName;
  next();
};

// Create a reusable pathRewriter for all proxy configurations
const pathRewriter = (path, req) => {
  console.log(`Original path: ${path}`);
  
  // If this is a static asset from root path (like /static/* or /manifest.json),
  // it's already been processed by the middleware to include the app name
  if (path.startsWith('/static/') || 
      path.includes('/manifest.json') || 
      path.includes('/favicon.ico') ||
      path.endsWith('.js') || 
      path.endsWith('.css')) {
    console.log(`Already processed static asset, keeping as is: ${path}`);
    return path;
  }
  
  // For app paths with tokens, strip the token but keep the app name
  const appName = req.appName;
  if (!appName) {
    console.log(`No app name found in request, keeping path: ${path}`);
    return path;
  }
  
  // Keep only the app name for the path
  const newPath = `/${appName}`;
  console.log(`Rewriting path: ${path} -> ${newPath}`);
  return newPath;
};

// Proxy configurations - use the common path rewriter
const proxyConfigs = {
  'docentes': {
    target: DOCENTES_URL,
    pathRewrite: pathRewriter
  },
  'acudientes': {
    target: ACUDIENTES_URL,
    pathRewrite: pathRewriter
  },
  'estudiantes': {
    target: ESTUDIANTES_URL,
    pathRewrite: pathRewriter
  },
  'stats': {
    target: STATS_FRONTEND_URL,
    pathRewrite: (path, req) => {
      console.log(`Stats path rewrite: ${path}`);
      
      // For static assets and images, remove the token
      if (path.includes('/stats/StatsToken012/static/') || 
          path.includes('/stats/StatsToken012/images/') ||
          path.includes('/stats/StatsToken012/manifest.json') ||
          path.includes('/stats/StatsToken012/favicon') ||
          path.includes('/stats/StatsToken012/') && (
            path.includes('.js') || 
            path.includes('.css') || 
            path.includes('.map') ||
            path.includes('.png') ||
            path.includes('.jpg') ||
            path.includes('.jpeg') ||
            path.includes('.gif') ||
            path.includes('.svg')
          )) {
        const newPath = path.replace('/stats/StatsToken012', '');
        console.log(`Rewriting Stats asset path: ${path} -> ${newPath}`);
        return newPath;
      }
      
      // For the main application path
      if (path === '/stats/StatsToken012' || path === '/stats/StatsToken012/') {
        console.log(`Rewriting Stats main path: ${path} -> /`);
        return '/';
      }
      
      // Default case
      console.log(`Default Stats path: ${path} -> ${path}`);
      return path;
    }
  }
};

// API backend configurations
const apiConfigs = {
  'docentes': {
    target: DOCENTES_URL
  },
  'acudientes': {
    target: ACUDIENTES_URL
  },
  'estudiantes': {
    target: ESTUDIANTES_URL
  },
  'stats': {
    target: STATS_BACKEND_URL
  }
};

// Set up proxy routes
Object.entries(proxyConfigs).forEach(([path, config]) => {
  app.use(
    `/${path}`,
    checkAccessToken,
    createProxyMiddleware({
      ...config,
      changeOrigin: true,
      secure: false,
      ws: true,
      onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['x-proxied-by'] = 'cosmo-proxy';
        
        // Apply MIME type handler
        setMimeTypes(proxyRes, req);
      }
    })
  );
});

// Special direct handler for search-schools endpoint
app.get('/api/search-schools', (req, res) => {
  const referer = req.headers.referer || '';
  console.log(`Search-schools API request with referer: ${referer}`);
  
  // Default to docentes if we can't determine
  let targetApp = 'docentes';
  
  // Try to extract the app from the referer
  for (const app of Object.keys(ACCESS_TOKENS)) {
    if (referer.includes(`/${app}/`)) {
      targetApp = app;
      break;
    }
  }
  
  // Get the target port for the app
  let targetPort;
  switch(targetApp) {
    case 'docentes':
      targetPort = 3001;
      break;
    case 'acudientes':
      targetPort = 3005;
      break;
    case 'estudiantes':
      targetPort = 3006;
      break;
    default:
      targetPort = 3001; // Default to docentes
  }
  
  // Forward the request to the appropriate server
  const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const newUrl = `http://localhost:${targetPort}/api/search-schools${queryString}`;
  console.log(`Redirecting search-schools API to: ${newUrl}`);
  
  // Proxy the request directly
  const proxyReq = require('http').request(
    newUrl,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${targetPort}`
      }
    },
    (proxyRes) => {
      // Set content-type to JSON
      proxyRes.headers['content-type'] = 'application/json';
      
      // Copy all headers from the proxied response
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      
      // Pipe the response data
      proxyRes.pipe(res);
    }
  );
  
  // Handle errors
  proxyReq.on('error', (err) => {
    console.error(`Error proxying search-schools API: ${err.message}`);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
  
  // Pipe the request body (if any)
  req.pipe(proxyReq);
});

// Also handle POST version for estudiantes
app.post('/api/search-schools', (req, res) => {
  // Always route to estudiantes since they use POST
  const targetPort = 3006;
  
  // Forward the request 
  const newUrl = `http://localhost:${targetPort}/api/search-schools`;
  console.log(`Redirecting POST search-schools API to: ${newUrl}`);
  
  // Get the request body for forwarding
  const bodyData = JSON.stringify(req.body);
  console.log('Search schools request body:', bodyData);
  
  // Proxy the request directly
  const proxyReq = require('http').request(
    newUrl,
    {
      method: 'POST',
      headers: {
        ...req.headers,
        'host': `localhost:${targetPort}`,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(bodyData)
      }
    },
    (proxyRes) => {
      // Set content-type to JSON
      proxyRes.headers['content-type'] = 'application/json';
      
      // Capture response data for logging
      let responseData = '';
      proxyRes.on('data', (chunk) => {
        responseData += chunk;
      });
      
      proxyRes.on('end', () => {
        try {
          console.log('Search schools response:', responseData);
        } catch (err) {
          console.error('Error parsing search-schools response:', err.message);
        }
      });
      
      // Copy all headers from the proxied response
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      
      // Pipe the response data
      proxyRes.pipe(res);
    }
  );
  
  // Handle errors
  proxyReq.on('error', (err) => {
    console.error(`Error proxying POST search-schools API: ${err.message}`);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
  });
  
  // Write the request body to the proxy request and end it
  proxyReq.write(bodyData);
  proxyReq.end();
});

// Handle form submissions - this is a POST endpoint used by all form applications
app.post('/api/submit-form', (req, res) => {
  const referer = req.headers.referer || '';
  console.log(`Submit-form API request with referer: ${referer}`);
  
  // Default to docentes if we can't determine
  let targetApp = 'docentes';
  
  // Try to extract the app from the referer
  for (const app of Object.keys(ACCESS_TOKENS)) {
    if (referer.includes(`/${app}/`)) {
      targetApp = app;
      break;
    }
  }
  
  // Get the target port for the app
  let targetPort;
  switch(targetApp) {
    case 'docentes':
      targetPort = 3001;
      break;
    case 'acudientes':
      targetPort = 3005;
      break;
    case 'estudiantes':
      targetPort = 3006;
      break;
    default:
      targetPort = 3001; // Default to docentes
  }

  // Log the request body for debugging
  console.log('=== FORM SUBMISSION REQUEST ===');
  console.log('Application:', targetApp);
  console.log('Target port:', targetPort);
  
  // Debug the request body
  try {
    // Ensure the body is properly structured - defensive coding
    let bodyToSend = req.body;
    
    // If the body is not properly parsed as an object, try to parse it
    if (typeof bodyToSend !== 'object' || bodyToSend === null) {
      console.error('Body is not an object, attempting to parse as JSON');
      
      try {
        // Try to parse as JSON if it's a string
        if (typeof req.body === 'string') {
          bodyToSend = JSON.parse(req.body);
        } else {
          // Create a default object with an error message
          bodyToSend = {
            error: 'Invalid request body format',
            originalBody: req.body
          };
        }
      } catch (parseError) {
        console.error('Error parsing body as JSON:', parseError.message);
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON in request body'
        });
      }
    }
    
    // CRITICAL FIX: Ensure schedule is always an array 
    if (bodyToSend.schedule !== undefined) {
      // Check which application this is from to handle schedules differently
      if (targetApp === 'estudiantes') {
        // For estudiantes, keep schedule as a string
        console.log('Estudiantes form - keeping schedule as string:', bodyToSend.schedule);
      } else if (!Array.isArray(bodyToSend.schedule)) {
        console.log('Converting schedule to array:', bodyToSend.schedule);
        
        // If it's a string, try to convert it to an array
        if (typeof bodyToSend.schedule === 'string') {
          try {
            const parsedSchedule = JSON.parse(bodyToSend.schedule);
            if (Array.isArray(parsedSchedule)) {
              bodyToSend.schedule = parsedSchedule;
            } else {
              bodyToSend.schedule = [bodyToSend.schedule];
            }
          } catch (e) {
            // If parsing fails, treat it as a single item
            bodyToSend.schedule = [bodyToSend.schedule];
          }
        } else if (bodyToSend.schedule === null) {
          bodyToSend.schedule = [];
        } else {
          // For any other type, convert to array with the value
          bodyToSend.schedule = [String(bodyToSend.schedule)];
        }
      }
    } else {
      // If schedule is missing for estudiantes, leave it undefined
      if (targetApp !== 'estudiantes') {
        console.log('Schedule field is missing, adding empty array');
        bodyToSend.schedule = [];
      }
    }
    
    // Forward the request to the appropriate server
    const newUrl = `http://localhost:${targetPort}/api/submit-form`;
    console.log(`Redirecting submit-form API to: ${newUrl}`);
    
    // Convert the body to a string for forwarding
    const bodyData = JSON.stringify(bodyToSend);
    
    // Proxy the request directly
    const proxyReq = require('http').request(
      newUrl,
      {
        method: 'POST',
        headers: {
          ...req.headers,
          'host': `localhost:${targetPort}`,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(bodyData)
        }
      },
      (proxyRes) => {
        // Set content-type to JSON
        proxyRes.headers['content-type'] = 'application/json';
        
        // Capture response data for logging
        let responseData = '';
        proxyRes.on('data', (chunk) => {
          responseData += chunk;
        });
        
        proxyRes.on('end', () => {
          try {
            console.log('=== FORM SUBMISSION RESPONSE ===');
            console.log('Status code:', proxyRes.statusCode);
            
            // Parse the response to check for errors
            const parsedResponse = JSON.parse(responseData);
            if (!parsedResponse.success) {
              console.error('Form submission failed:', parsedResponse.error);
            } else {
              console.log('Form submission successful.');
            }
          } catch (err) {
            console.error('Error parsing response:', err.message);
          }
        });
        
        // Copy all headers from the proxied response
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        
        // Pipe the response data
        proxyRes.pipe(res);
      }
    );
    
    // Handle errors
    proxyReq.on('error', (err) => {
      console.error(`Error proxying submit-form API: ${err.message}`);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
    
    // Write the request body to the proxy request
    proxyReq.write(bodyData);
    proxyReq.end();
  } catch (err) {
    console.error('Error processing form submission:', err.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error processing form submission'
    });
  }
});

// Handle API routes
Object.entries(apiConfigs).forEach(([path, config]) => {
  const apiPath = `/api/${path}`;
  
  app.use(
    apiPath,
    createProxyMiddleware({
      target: config.target,
      pathRewrite: (pathToRewrite) => {
        // For search-schools endpoint, preserve the original path structure
        if (pathToRewrite.includes('/search-schools')) {
          const newPath = pathToRewrite.replace(apiPath, '/api');
          console.log(`Preserving specific API path: ${pathToRewrite} -> ${newPath}`);
          return newPath;
        }
        
        // For general API endpoints, use the standard rewrite to /api
        console.log(`Rewriting API path: ${pathToRewrite} -> /api`);
        return '/api';
      },
      changeOrigin: true,
      secure: false,
      onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['x-proxied-by'] = 'cosmo-proxy-api';
        
        // Apply MIME type handler
        setMimeTypes(proxyRes, req);
      }
    })
  );
});

// Generate HTML for the welcome page
function generateWelcomePage() {
  return `
    <html>
      <head>
        <title>COSMO Project</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f5f5f5;
          }
          .logo-container {
            text-align: center;
          }
          .logo {
            max-width: 300px;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div class="logo-container">
          <img src="/images/LogoCosmo.png" alt="COSMO Logo" class="logo">
        </div>
      </body>
    </html>
  `;
}

// Special routes for image files
app.get('/rectores.jpeg', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  // Use the docentes version of the file
  const imagePath = path.join(__dirname, 'form-docentes', 'public', 'rectores.jpeg');
  
  fs.readFile(imagePath, (err, data) => {
    if (err) {
      console.error(`Error reading image file: ${err.message}`);
      return res.status(404).send('Image not found');
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(data);
  });
});

app.get('/coordinadores.jpeg', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  // Use the docentes version of the file
  const imagePath = path.join(__dirname, 'form-docentes', 'public', 'coordinadores.jpeg');
  
  fs.readFile(imagePath, (err, data) => {
    if (err) {
      console.error(`Error reading image file: ${err.message}`);
      return res.status(404).send('Image not found');
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(data);
  });
});

// Dedicated handlers for manifest.json for each application

// Acudientes manifest.json
app.get('/acudientes/AcuToken456/manifest.json', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  console.log('Serving manifest.json directly for acudientes');
  const manifestPath = path.join(__dirname, 'form-acudientes', 'public', 'manifest.json');
  
  fs.readFile(manifestPath, (err, data) => {
    if (err) {
      console.error(`Error reading manifest.json for acudientes: ${err.message}`);
      return res.status(404).send('Manifest not found');
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  });
});

// Estudiantes manifest.json
app.get('/estudiantes/EstToken789/manifest.json', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  console.log('Serving manifest.json directly for estudiantes');
  const manifestPath = path.join(__dirname, 'form-estudiantes', 'public', 'manifest.json');
  
  fs.readFile(manifestPath, (err, data) => {
    if (err) {
      console.error(`Error reading manifest.json for estudiantes: ${err.message}`);
      return res.status(404).send('Manifest not found');
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  });
});

// Redirect root to a default page or show available applications
app.get('/', (req, res) => {
  res.send(generateWelcomePage());
});

// RTL route - Access to all applications
app.get('/RTL', (req, res) => {
  const links = Object.entries(ACCESS_TOKENS).map(([app, token]) => {
    return `<li><a href="/${app}/${token}">${app.charAt(0).toUpperCase() + app.slice(1)}</a></li>`;
  }).join('\n          ');

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
          table { border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px 15px; text-align: left; }
          th { background-color: #f2f2f2; }
          .logo-container { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 200px; height: auto; }
        </style>
      </head>
      <body>
        <div class="logo-container">
          <img src="/images/LogoCosmo.png" alt="COSMO Logo" class="logo">
        </div>
        <h1>COSMO Applications</h1>
        <p>Click on the links below to access the applications:</p>
        <ul class="app-list">
          ${links}
        </ul>
        
        <h2>Access Tokens Reference</h2>
        <table>
          <tr>
            <th>Application</th>
            <th>Token</th>
            <th>URL</th>
          </tr>
          ${Object.entries(ACCESS_TOKENS).map(([app, token]) => `
            <tr>
              <td>${app}</td>
              <td>${token}</td>
              <td>http://localhost/${app}/${token}</td>
            </tr>
          `).join('')}
        </table>
      </body>
    </html>
  `);
});

// Dedicated route for LogoCosmo.png
app.get('/images/LogoCosmo.png', (req, res) => {
  console.log('Serving LogoCosmo.png via dedicated route handler');
  
  // Primary path
  const imagePath = path.join(__dirname, 'Stats', 'frontend', 'build', 'images', 'LogoCosmo.png');
  // Fallback path
  const fallbackPath = path.join(__dirname, 'Stats', 'frontend', 'public', 'images', 'LogoCosmo.png');
  
  safeServeStaticFile(imagePath, fallbackPath, 'image/png', res);
});

// Routes for PDF generator logo images
app.get('/images/RLT_logo.jpeg', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  console.log('Serving RLT_logo.jpeg via dedicated route handler');
  
  // Use the Stats version of the file
  const imagePath = path.join(__dirname, 'Stats', 'frontend', 'public', 'images', 'RLT_logo.jpeg');
  
  fs.readFile(imagePath, (err, data) => {
    if (err) {
      console.error(`Error reading RLT_logo.jpeg: ${err.message}`);
      return res.status(404).send('Image not found');
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(data);
  });
});

app.get('/images/CLT_logo.jpeg', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  console.log('Serving CLT_logo.jpeg via dedicated route handler');
  
  // Use the Stats version of the file
  const imagePath = path.join(__dirname, 'Stats', 'frontend', 'public', 'images', 'CLT_logo.jpeg');
  
  fs.readFile(imagePath, (err, data) => {
    if (err) {
      console.error(`Error reading CLT_logo.jpeg: ${err.message}`);
      return res.status(404).send('Image not found');
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(data);
  });
});

// Static asset middleware
app.use(express.static(path.join(__dirname, 'form-docentes', 'build'), {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Use express-static for acudientes
app.use('/acudientes', express.static(path.join(__dirname, 'form-acudientes', 'build'), {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Use express-static for estudiantes
app.use('/estudiantes', express.static(path.join(__dirname, 'form-estudiantes', 'build'), {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Direct handlers for docentes static assets
app.get('/docentes/DocToken123/static/js/:filename', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'form-docentes', 'build', 'static', 'js', filename);
  
  console.log(`Serving JS file directly from docentes: ${filename}`);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error reading JS file ${filename}: ${err.message}`);
      return res.status(404).send('File not found');
    }
    
    // Ensure proper content type for all types of JS files
    if (filename.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filename.endsWith('.js.map')) {
      res.setHeader('Content-Type', 'application/json');
    } else if (filename.endsWith('.js.LICENSE.txt')) {
      res.setHeader('Content-Type', 'text/plain');
    }
    
    res.send(data);
  });
});

app.get('/docentes/DocToken123/static/css/:filename', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'form-docentes', 'build', 'static', 'css', filename);
  
  console.log(`Serving CSS file directly from docentes: ${filename}`);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error reading CSS file ${filename}: ${err.message}`);
      return res.status(404).send('File not found');
    }
    
    res.setHeader('Content-Type', 'text/css');
    res.send(data);
  });
});

// Add security headers for production environment
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Don't expose error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).send('Internal Server Error');
  } else {
    res.status(500).send(`Internal Server Error: ${err.message}`);
  }
});

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

// Start server
app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
  console.log('Access tokens:');
  Object.entries(ACCESS_TOKENS).forEach(([app, token]) => {
    console.log(`${app}: "${token}"`);
  });
});