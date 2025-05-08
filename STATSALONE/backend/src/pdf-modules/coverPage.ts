import path from 'path';
import { pool } from '../db';
import { CustomPDFKit } from './pdfUtils';
import fs from 'fs';

// Function to get entidad_territorial
async function getEntidadTerritorial(school: string): Promise<string> {
  try {
    const query = `
      SELECT entidad_territorial 
      FROM rectores 
      WHERE nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ = $1 
      LIMIT 1
    `;
    const result = await pool.query(query, [school]);
    return result.rows[0]?.entidad_territorial || 'No especificada';
  } catch (error) {
    console.error('Error fetching entidad_territorial:', error);
    return 'No especificada';
  }
}

// Function to find a valid image path by trying multiple potential locations
async function findImagePath(imageName: string): Promise<string | null> {
  // Define potential image paths
  const potentialPaths = [
    // Frontend build path
    path.join(__dirname, '..', '..', '..', 'frontend', 'build', 'images', imageName),
    // Frontend public path
    path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'images', imageName),
    // Root public path
    path.join(__dirname, '..', '..', '..', '..', 'public', 'images', imageName),
    // Absolute path directly to the image file
    path.join('/Users/ghsimard/dev/-- COSMO PROJECT/Stats/frontend/public/images', imageName)
  ];

  // Try each path and return the first one that exists
  for (const imgPath of potentialPaths) {
    try {
      if (fs.existsSync(imgPath)) {
        console.log(`Found valid image path: ${imgPath}`);
        return imgPath;
      }
    } catch (error) {
      // Continue to next path
    }
  }

  console.error(`Could not find image: ${imageName} in any potential locations`);
  return null;
}

// Function to create cover page (first page)
export const generateCoverPage = async (doc: CustomPDFKit, school?: string): Promise<void> => {
  // Create the first page
  doc.addPage();
  
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  // Add logos at top
  const logoHeight = 100;   // Height for logos
  const logoWidth = 180;    // Width for logos
  const logoY = 50;         // Y position for logos
  const sideMargin = 40;    // Margin for both sides
  
  try {
    // Find image paths using the helper function
    const rltLogoPath = await findImagePath('RLT_logo.jpeg');
    const cltLogoPath = await findImagePath('CLT_logo.jpeg');
    
    console.log('Found image paths:');
    console.log('RLT logo path:', rltLogoPath);
    console.log('CLT logo path:', cltLogoPath);
    
    // Add RLT logo on the far left
    if (rltLogoPath) {
      try {
        doc.image(
          rltLogoPath,
          sideMargin,  // X position at left margin
          logoY,
          {
            fit: [logoWidth, logoHeight]  // Width and height constraints
          }
        );
        console.log('RLT logo added successfully');
      } catch (logoError) {
        console.error('Error adding RLT logo to PDF:', logoError);
        // Draw a placeholder rectangle instead
        doc.rect(sideMargin, logoY, logoWidth, logoHeight)
           .stroke()
           .fontSize(12)
           .text('RLT Logo', sideMargin + 10, logoY + 40, { width: logoWidth - 20, align: 'center' });
        console.log('Added RLT logo placeholder rectangle');
      }
    } else {
      // Draw a placeholder rectangle if no logo found
      doc.rect(sideMargin, logoY, logoWidth, logoHeight)
         .stroke()
         .fontSize(12)
         .text('RLT Logo', sideMargin + 10, logoY + 40, { width: logoWidth - 20, align: 'center' });
      console.log('Added RLT logo placeholder rectangle (no image found)');
    }

    // Add CLT logo on the far right
    if (cltLogoPath) {
      try {
        doc.image(
          cltLogoPath,
          pageWidth - logoWidth + sideMargin/2,  // Extend into the margin area
          logoY,
          {
            fit: [logoWidth, logoHeight]  // Width and height constraints
          }
        );
        console.log('CLT logo added successfully');
      } catch (logoError) {
        console.error('Error adding CLT logo to PDF:', logoError);
        // Draw a placeholder rectangle instead
        doc.rect(pageWidth - logoWidth + sideMargin/2, logoY, logoWidth, logoHeight)
           .stroke()
           .fontSize(12)
           .text('CLT Logo', pageWidth - logoWidth + sideMargin/2 + 10, logoY + 40, { width: logoWidth - 20, align: 'center' });
        console.log('Added CLT logo placeholder rectangle');
      }
    } else {
      // Draw a placeholder rectangle if no logo found
      doc.rect(pageWidth - logoWidth + sideMargin/2, logoY, logoWidth, logoHeight)
         .stroke()
         .fontSize(12)
         .text('CLT Logo', pageWidth - logoWidth + sideMargin/2 + 10, logoY + 40, { width: logoWidth - 20, align: 'center' });
      console.log('Added CLT logo placeholder rectangle (no image found)');
    }
  } catch (error) {
    console.error('Error in logo section:', error);
    // Continue without logos if the whole section fails
  }

  doc.moveDown(8);  // Space after logos

  // Program titles in the middle
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('PROGRAMA', {
       align: 'center'
     })
     .moveDown(0.5);  // Reduced spacing

  doc.text('RECTORES LÍDERES TRANSFORMADORES', {
       align: 'center'
     })
     .moveDown(0.5);  // Reduced spacing

  doc.text('COORDINADORES LÍDERES TRANSFORMADORES', {
       align: 'center'
     })
     .moveDown(4);  // Reduced space before survey title from 8 to 4

  // Survey title
  doc.fontSize(36)
     .font('Helvetica')
     .text('Encuesta de', {
       align: 'center'
     })
     .text('Ambiente Escolar', {
       align: 'center'
     })
     .moveDown(2);  // Space before results text

  // Results text at bottom
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('INFORME DE RESULTADOS', {
       align: 'center'
     })
     .moveDown(1);  // Space before school name

  // Add school name if provided
  if (school) {
    // Calculate text dimensions and position for background
    const schoolText = school.toUpperCase();
    
    // Calculate dynamic font size based on text length
    // Start with base font size of 16 and scale down for longer names
    const maxWidth = pageWidth - 120; // Maximum width available for the text box
    let fontSize = 16; // Default font size
    
    // Calculate font size based on text length
    if (schoolText.length > 50) {
      fontSize = 10; // Very long names (50+ chars)
    } else if (schoolText.length > 40) {
      fontSize = 12; // Long names (40-50 chars)
    } else if (schoolText.length > 30) {
      fontSize = 14; // Medium-long names (30-40 chars)
    }
    
    // Set the font size and get the resulting width
    doc.fontSize(fontSize);
    const textWidth = doc.widthOfString(schoolText);
    
    // Further adjust if the width exceeds maximum
    if (textWidth > maxWidth) {
      // Recalculate font size based on available width
      fontSize = Math.floor(fontSize * (maxWidth / textWidth));
      doc.fontSize(fontSize);
      // Recompute text width with new font size
      const adjustedTextWidth = doc.widthOfString(schoolText);
      console.log(`School name "${school}" resized to fontSize ${fontSize}, width: ${adjustedTextWidth}`);
    }
    
    // Final measurement with potentially adjusted font size
    const finalTextWidth = doc.widthOfString(schoolText);
    const padding = 20;  // Padding around text
    const rectWidth = finalTextWidth + (padding * 2);
    const rectHeight = fontSize + (padding * 1.2);  // Slightly increased vertical padding
    const rectX = (pageWidth - rectWidth) / 2;  // Center the rectangle
    const currentY = doc.y;

    // Draw background rectangle for school name
    doc.save()  // Save graphics state
       .fillColor('#2C5282')  // Dark blue background
       .rect(rectX, currentY - padding/2, rectWidth, rectHeight)
       .fill()
       .restore();  // Restore graphics state

    // Add school name text
    doc.font('Helvetica')
       .fillColor('white')  // White text
       .text(schoolText, {
         align: 'center'
       })
       .fillColor('black')  // Reset to black for subsequent text
       .moveDown(3);  // Increased space from 1 to 3 before ENTIDAD TERRITORIAL

    // Add ENTIDAD TERRITORIAL below school name
    const entidadText = await getEntidadTerritorial(school);
    
    // First display the label centered
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('ENTIDAD TERRITORIAL:', {
         align: 'center'
       })
       .moveDown(0.5);  // Add some space between label and value
    
    // Then display the value centered on the next line
    doc.font('Helvetica')
       .text(entidadText, {
         align: 'center'
       });
  }
}; 