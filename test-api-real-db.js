// Test script for API endpoints with real database data

const fetch = require('node-fetch');

// Base URL for API requests
const baseUrl = 'http://localhost:3000';

// Test search terms
const searchTerms = ['inst', 'mis', 'educacion', 'gerardo', 'don'];

// Test the GET /api/search-schools endpoint
async function testSearchSchools(query) {
  try {
    const response = await fetch(`${baseUrl}/api/search-schools?q=${encodeURIComponent(query)}`, {
      headers: {
        'Referer': 'http://localhost:3000/docentes/DocToken123/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Search results for "${query}":`);
    console.log(data);
    return data;
  } catch (error) {
    console.error('Error testing search-schools:', error);
  }
}

// Run the tests for all search terms sequentially
async function runTests() {
  console.log('Testing API with real database data...\n');
  
  for (const term of searchTerms) {
    await testSearchSchools(term);
    console.log(); // Add a blank line between results
  }
  
  console.log('Tests completed!');
}

runTests(); 