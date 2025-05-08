import PDFKit from 'pdfkit';
import { CustomPDFKit } from './pdfUtils';
import { generateCoverPage } from './coverPage';
import { generateExplanatoryPage1 } from './explanatoryPage1';
import { generateExplanatoryPage2 } from './explanatoryPage2';
import { generateEncuestadosPage } from './encuestadosPage';
import { generateSummaryPage } from './summaryPage';
import { generateFortalezasPages } from './fortalezasPages';

/**
 * Generates a complete school environment survey PDF report
 * @param school School name to filter data
 * @returns The generated PDF document
 */
export async function generatePDF(school?: string): Promise<PDFKit.PDFDocument> {
  // Create a new PDF document with proper formatting
  const doc = new PDFKit({
    autoFirstPage: false,
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    },
    size: 'A4'
  }) as CustomPDFKit;

  console.log(`Generating PDF for school: ${school || 'All schools'}`);

  try {
    // Generate each page separately in sequence
    await generateCoverPage(doc, school);
    generateExplanatoryPage1(doc);
    generateExplanatoryPage2(doc);
    
    // Handle school parameter for pages that require it
    if (school) {
      await generateEncuestadosPage(doc, school);
      await generateSummaryPage(doc, school);
      await generateFortalezasPages(doc, school);
    } else {
      // Handle case where no school is specified
      doc.addPage();
      doc.fontSize(14)
         .fillColor('black')
         .text('No school specified. Please select a school to view detailed data.', 100, 100);
    }
    
    console.log('PDF generation completed successfully');
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Add an error page if there was a problem
    doc.addPage();
    doc.fontSize(20)
       .fillColor('red')
       .text('Error generating PDF report', 100, 100)
       .fontSize(12)
       .fillColor('black')
       .moveDown()
       .text(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return doc;
} 