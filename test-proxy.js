#!/usr/bin/env node

/**
 * Test script for COSMO Proxy server
 * This script tests the complex URL paths for each application
 */

const { execSync } = require('child_process');
// Import chalk properly
const chalk = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`
};

// Token configurations
const TOKENS = {
  'docentes': 'A@#$$F%65FT&',
  'acudientes': '@#$#%%GT%',
  'estudiantes': '%?$%#G%6$%',
  'stats': '$@#@$%&*?$'
};

// Direct test of a specific URL
function directTest(app, token) {
  const rawUrl = `http://localhost/${app}/${token}`;
  console.log(chalk.yellow(`\nTesting direct URL: ${rawUrl}`));
  try {
    const result = execSync(`curl -s -i "${rawUrl}"`, { timeout: 5000 });
    console.log(result.toString());
    return true;
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`));
    return false;
  }
}

// Test homepage to verify proxy is running
function testHomepage() {
  console.log(chalk.yellow(`\nTesting homepage: http://localhost/`));
  try {
    const result = execSync(`curl -s -i "http://localhost/"`, { timeout: 5000 });
    console.log(result.toString().split('\n').slice(0, 10).join('\n') + '\n... (truncated)');
    return true;
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`));
    return false;
  }
}

// Test with encoded URLs
function testWithEncoded() {
  console.log(chalk.yellow(`\nTesting with URL-encoded tokens:`));
  
  for (const [app, token] of Object.entries(TOKENS)) {
    const encodedToken = encodeURIComponent(token);
    const url = `http://localhost/${app}/${encodedToken}`;
    console.log(chalk.blue(`Testing: ${url}`));
    
    try {
      const result = execSync(`curl -s -o /dev/null -w "%{http_code}" "${url}"`, { timeout: 5000 });
      const statusCode = result.toString().trim();
      console.log(statusCode.startsWith('2') 
        ? chalk.green(`✓ Success! Status: ${statusCode}`) 
        : chalk.red(`✗ Failed! Status: ${statusCode}`));
    } catch (error) {
      console.log(chalk.red(`✗ Error: ${error.message}`));
    }
  }
}

// Main test function
async function runTests() {
  console.log(chalk.yellow('=== COSMO Proxy Path Tests ==='));
  
  // Test if proxy is running
  testHomepage();
  
  // Print the tokens we're using
  console.log(chalk.yellow('\nToken values:'));
  for (const [app, token] of Object.entries(TOKENS)) {
    console.log(`${app}: "${token}" (${encodeURIComponent(token)})`);
  }
  
  // Test with encoded tokens
  testWithEncoded();
  
  // Direct test of docentes
  directTest('docentes', TOKENS.docentes);
  
  console.log(chalk.yellow('\n=== Test Complete ==='));
}

// Parse command line arguments
if (process.argv.length > 2) {
  const app = process.argv[2];
  const token = process.argv[3] || TOKENS[app] || '';
  directTest(app, token);
} else {
  // Run all tests
  runTests();
} 