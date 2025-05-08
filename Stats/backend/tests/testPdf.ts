import fs from 'fs';
import { generatePDF } from './pdf-modules/pdfGenerator';

// Sample school name for testing
const schoolName = 'Institución Educativa Diego Echavarria Misas';

async function testPdfGeneration() {
  console.log(`Testing PDF generation for school: ${schoolName}`);
  
  try {
    // Generate the PDF
    const doc = await generatePDF(schoolName);
    
    // Write to a file
    const outputFile = 'test-report.pdf';
    const writeStream = fs.createWriteStream(outputFile);
    
    // Pipe the PDF to the file
    doc.pipe(writeStream);
    
    // Handle stream events
    writeStream.on('finish', () => {
      console.log(`PDF successfully written to ${outputFile}`);
    });
    
    writeStream.on('error', (err) => {
      console.error('Error writing PDF:', err);
    });
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error in test function:', error);
  }
}

// Execute the test
testPdfGeneration(); 