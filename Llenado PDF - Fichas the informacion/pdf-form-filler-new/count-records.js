const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile('../--- Ficha de Información Básica.xlsx');

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON to count records
const data = XLSX.utils.sheet_to_json(worksheet);

// Count records (excluding header row)
const recordCount = data.length;

console.log(`Number of records in the Excel file: ${recordCount}`);

// Print details of each record
data.forEach((row, index) => {
  console.log(`\nRecord ${index + 1}:`);
  console.log('Nombre:', row['Nombre(s) y Apellido(s) completo(s)'] || 'Missing');
  console.log('Zona:', row['Zona de la sede principal de la IE'] || 'Missing');
  console.log('Jornadas:', row['Jornadas de la IE'] || 'Missing');
  console.log('Preescolar:', row['Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)'] || 'Missing');
  
  // Check for potential issues
  const issues = [];
  
  // Check for special characters in name
  const name = row['Nombre(s) y Apellido(s) completo(s)'];
  if (name && /[áéíóúÁÉÍÓÚñÑ]/.test(name)) {
    issues.push('Contains special characters in name');
  }
  
  // Check for unusual jornadas format
  const jornadas = row['Jornadas de la IE'];
  if (jornadas) {
    if (jornadas.includes('CLEI')) {
      issues.push('Contains CLEI in jornadas');
      // Additional check for CLEI format
      console.log('CLEI format details:');
      console.log('- Original value:', jornadas);
      console.log('- Split by semicolon:', jornadas.split(';'));
      console.log('- Contains spaces:', jornadas.includes(' '));
    }
    if (jornadas.includes('Sabado') || jornadas.includes('Sábado')) {
      issues.push('Contains Sabado/Sábado in jornadas');
    }
  }
  
  if (issues.length > 0) {
    console.log('Potential issues:', issues.join(', '));
  }
}); 