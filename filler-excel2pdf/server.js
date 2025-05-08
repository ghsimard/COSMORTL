const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Enable request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Log directory contents for debugging
const publicDir = path.resolve(__dirname, 'public');
const rootDir = path.resolve(__dirname);
console.log(`Public directory path: ${publicDir}`);
console.log(`Root directory path: ${rootDir}`);
console.log(`Public directory exists: ${fs.existsSync(publicDir)}`);
console.log(`Root directory exists: ${fs.existsSync(rootDir)}`);

// Log public directory contents
if (fs.existsSync(publicDir)) {
  console.log('Public directory contents:');
  const files = fs.readdirSync(publicDir);
  files.forEach(file => {
    const filePath = path.join(publicDir, file);
    const stats = fs.statSync(filePath);
    console.log(`- ${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
    
    if (stats.isDirectory()) {
      const subFiles = fs.readdirSync(filePath);
      subFiles.forEach(subFile => {
        console.log(`  - ${subFile}`);
      });
    }
  });
}

// Log root directory contents
console.log('Root directory contents:');
const rootFiles = fs.readdirSync(rootDir);
rootFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  const stats = fs.statSync(filePath);
  console.log(`- ${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
  
  if (stats.isDirectory() && (file === 'js' || file === 'css')) {
    const subFiles = fs.readdirSync(filePath);
    subFiles.forEach(subFile => {
      console.log(`  - ${subFile}`);
    });
  }
});

// Custom middleware to log static file requests
app.use((req, res, next) => {
  if (req.url.startsWith('/js/') || req.url.startsWith('/css/') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
    const filePath = path.join(rootDir, req.url);
    console.log(`Static file request: ${req.url}`);
    console.log(`Full path: ${filePath}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
  }
  next();
});

// Serve static files from the root directory
app.use(express.static(rootDir, {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set proper content type for JavaScript files
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    
    // Log file serving
    console.log(`Serving static file: ${filePath}`);
  }
}));

// Serve the main HTML file
app.get('/', (req, res) => {
  console.log('Serving index.html from root directory');
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Serve the test page from the root directory
app.get('/test', (req, res) => {
  console.log('Serving test.html from root directory');
  res.sendFile(path.join(rootDir, 'test.html'));
});

// Also handle /test.html directly from the root directory
app.get('/test.html', (req, res) => {
  console.log('Serving test.html directly from root directory');
  res.sendFile(path.join(rootDir, 'test.html'));
});

// Serve the root test file
app.get('/root-test', (req, res) => {
  console.log('Serving root-test.html');
  res.sendFile(path.join(rootDir, 'root-test.html'));
});

// Also handle /root-test.html directly
app.get('/root-test.html', (req, res) => {
  console.log('Serving root-test.html directly');
  res.sendFile(path.join(rootDir, 'root-test.html'));
});

// Add a simple test route
app.get('/api/test', (req, res) => {
  console.log('API test route accessed');
  res.json({ message: 'API test route is working' });
});

// Handle all other routes by serving the index.html
app.get('*', (req, res) => {
  // Check if the requested file exists in root directory
  const filePath = path.join(rootDir, req.url);
  console.log(`Checking if file exists: ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    console.log(`File exists, serving: ${filePath}`);
    res.sendFile(filePath);
  } else {
    console.log(`File not found, serving index.html from root directory`);
    res.sendFile(path.join(rootDir, 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Internal Server Error');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Serving static files from: ${rootDir}`);
  console.log(`Current directory: ${__dirname}`);
}); 