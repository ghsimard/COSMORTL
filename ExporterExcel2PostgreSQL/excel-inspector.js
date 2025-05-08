const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Path to the Excel file
const excelFilePath = './Ficha de Informacion Basica 2.xlsx';

function inspectExcel() {
  try {
    console.log(`Reading Excel file: ${excelFilePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(excelFilePath);
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`Sheet name: ${sheetName}`);
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Print overall stats
    console.log(`Total records: ${data.length}`);
    console.log(`Fields in first record: ${Object.keys(data[0]).length}`);
    console.log(`Field names: ${Object.keys(data[0]).join(', ')}`);
    
    // Check for the specific field name variations
    const possibleFields = [
      'numero_de_cedula', 
      'Número de cédula', 
      'NUMERO DE CEDULA',
      'Numero de cedula',
      'NÚMERO DE CÉDULA',
      'cedula',
      'Cédula',
      'CEDULA'
    ];
    
    console.log('\nChecking for ID field variations:');
    possibleFields.forEach(field => {
      if (data[0][field] !== undefined) {
        console.log(`Found field: "${field}" with value: ${data[0][field]}`);
      }
    });
    
    // Print all fields and their types in the first record
    console.log('\nAll fields and their types in the first record:');
    Object.entries(data[0]).forEach(([key, value]) => {
      console.log(`${key}: ${value} (${typeof value})`);
    });
    
    // Check for '71194166' in the data
    console.log('\nSearching for record with ID 71194166:');
    
    const fieldsToCheck = Object.keys(data[0]);
    const matchingRecords = data.filter(record => {
      return fieldsToCheck.some(field => {
        const value = record[field];
        return value === 71194166 || value === '71194166';
      });
    });
    
    if (matchingRecords.length > 0) {
      console.log(`Found ${matchingRecords.length} records with ID 71194166:`);
      matchingRecords.forEach((record, index) => {
        console.log(`\nRecord #${index + 1}:`);
        Object.entries(record).forEach(([key, value]) => {
          console.log(`  ${key}: ${value} (${typeof value})`);
        });
      });
    } else {
      console.log('No records found with ID 71194166');
    }
    
  } catch (error) {
    console.error('Error inspecting Excel file:', error);
  }
}

inspectExcel(); 