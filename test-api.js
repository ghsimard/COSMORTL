// Simple script to test the API endpoints

const fetch = require('node-fetch');

// Base URL for API requests
const baseUrl = 'http://localhost:3000';

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

// Test the POST /api/submit-form endpoint with mock data
async function testSubmitForm() {
  const formData = {
    schoolName: 'Colegio Test',
    yearsOfExperience: '3',
    teachingGradesEarly: ['1°', '2°', '3°'],
    teachingGradesLate: [],
    schedule: ['Mañana', 'Tarde'],
    feedbackSources: ['Alumnos', 'Directivos'],
    comunicacion: {
      'La comunicación en la institución es clara y oportuna.': 'Siempre',
      'Los canales de comunicación son efectivos.': 'Frecuentemente'
    },
    practicas_pedagogicas: {
      'Se utilizan metodologías innovadoras.': 'A veces',
      'El plan de estudios se actualiza regularmente.': 'Frecuentemente'
    },
    convivencia: {
      'El ambiente escolar es respetuoso.': 'Siempre',
      'Se resuelven los conflictos de manera efectiva.': 'Frecuentemente'
    }
  };
  
  try {
    const response = await fetch(`${baseUrl}/api/submit-form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'http://localhost:3000/docentes/DocToken123/'
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Form submission result:');
    console.log(data);
    return data;
  } catch (error) {
    console.error('Error testing form submission:', error);
  }
}

// Run the tests
async function runTests() {
  console.log('Testing API endpoints...\n');
  
  // Test school search - with all examples from mock data
  await testSearchSchools('col');  // Should match Colegios
  await testSearchSchools('mis');  // Should match institutions with "mis" in the name
  await testSearchSchools('inst'); // Should match Instituciones
  
  // Test form submission
  await testSubmitForm();
  
  console.log('\nTests completed!');
}

runTests(); 