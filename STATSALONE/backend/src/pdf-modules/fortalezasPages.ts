import { CustomPDFKit, addHeader } from './pdfUtils';
import { pool } from '../db';
import { FrequencyData, FrequencyResult } from '../types';

// Get the correct column name based on the section
const getColumnName = (section: string) => {
  switch (section.toLowerCase()) {
    case 'comunicacion':
      return 'comunicacion';
    case 'practicas_pedagogicas':
      return 'practicas_pedagogicas';
    case 'convivencia':
      return 'convivencia';
    default:
      return section.toLowerCase();
  }
};

// Calculate frequencies for a given question
async function calculateFrequencies(tableName: string, question: string, section: string, school?: string): Promise<FrequencyResult> {
  if (question === 'NA') {
    return { S: -1, A: -1, N: -1 };
  }

  const columnName = getColumnName(section);
  let query = `
    SELECT 
      key as question,
      LOWER(TRIM(value)) as rating,
      COUNT(*) as count
    FROM ${tableName},
      jsonb_each_text(${columnName}) as x(key, value)
    WHERE key = $1
  `;
  
  const queryParams = [question];
  
  // Add school filter if provided
  if (school) {
    query += ` AND institucion_educativa = $2`;
    queryParams.push(school);
  }
  
  query += `
    GROUP BY key, value
    ORDER BY key, value;
  `;

  try {
    const { rows } = await pool.query(query, queryParams);
    
    if (rows.length === 0) {
      return { S: -1, A: -1, N: -1 }; // Indicate no data available
    }

    let total = 0;
    const counts: Record<string, number> = { S: 0, A: 0, N: 0 };

    rows.forEach((row: { rating: string; count: string }) => {
      const count = parseInt(row.count);
      const rating = row.rating.toLowerCase().trim();
      
      total += count;
      if (rating.includes('siempre')) {
        counts.S += count;
      } else if (rating.includes('veces')) {
        counts.A += count;
      } else if (rating.includes('nunca')) {
        counts.N += count;
      }
    });

    if (total === 0) {
      return { S: -1, A: -1, N: -1 }; // Indicate no valid data
    }

    const result = {
      S: Math.round((counts.S / total) * 100),
      A: Math.round((counts.A / total) * 100),
      N: Math.round((counts.N / total) * 100)
    };

    return result;
  } catch (error) {
    console.error(`Error in calculateFrequencies:`, error);
    return { S: -1, A: -1, N: -1 }; // Indicate error condition
  }
}

// Helper function to get frequency data
async function getFrequencyData(school?: string): Promise<FrequencyData[]> {
  // Define sections configuration (simplified for this module)
  const sections: Record<string, any> = {
    comunicacion: {
      title: 'COMUNICACIÓN',
      items: [
        {
          displayText: 'Los docentes tienen la disposición de dialogar con las familias sobre los aprendizajes de los estudiantes en espacios adicionales a la entrega de notas.',
          questionMappings: {
            docentes: 'Tengo la disposición de dialogar con los acudientes sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas.',
            estudiantes: 'Mis profesores están dispuestos a hablar con mis acudientes sobre cómo me está yendo en el colegio, en momentos diferentes a la entrega de notas.',
            acudientes: 'Los profesores tienen la disposición para hablar conmigo sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas.'
          }
        },
        {
          displayText: 'Los docentes promueven el apoyo de las familias a los estudiantes por medio de actividades para hacer en casa.',
          questionMappings: {
            docentes: 'Promuevo el apoyo de los acudientes al aprendizaje de los estudiantes, a través de actividades académicas y lúdicas para realizar en espacios fuera de la institución educativa.',
            estudiantes: 'Mis profesores me dejan actividades para hacer en casa, las cuales necesitan el apoyo de mis acudientes.',
            acudientes: 'Los profesores promueven actividades para que apoye en su proceso de aprendizaje a los estudiantes que tengo a cargo.'
          }
        },
        {
          displayText: 'En la Institución Educativa se promueve la participación de docentes, familias y estudiantes en la toma de decisiones sobre los objetivos institucionales.',
          questionMappings: {
            docentes: 'En el colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales.',
            estudiantes: 'En mi colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales.',
            acudientes: 'En el colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales.'
          }
        },
        {
          displayText: 'En la Institución Educativa se hace reconocimiento público de las prácticas pedagógicas innovadoras de los docentes.',
          questionMappings: {
            docentes: 'En el colegio se hace reconocimiento público de nuestras prácticas pedagógicas exitosas e innovadoras.',
            estudiantes: 'En mi colegio reconocen públicamente las actividades y esfuerzos exitosos que hacen los profesores para que nosotros aprendamos.',
            acudientes: 'En el colegio se hace reconocimiento público de las prácticas pedagógicas exitosas e innovadoras de los profesores.'
          }
        },
        {
          displayText: 'Los directivos docentes y los diferentes actores de la comunidad se comunican de manera asertiva.',
          questionMappings: {
            docentes: 'La comunicación que tengo con los directivos docentes del colegio es respetuosa y clara.',
            estudiantes: 'La comunicación que tengo con los directivos de mi colegio es respetuosa y clara.',
            acudientes: 'La comunicación que tengo con los directivos docentes del colegio es respetuosa y clara.'
          }
        },
        {
          displayText: 'Los docentes de la Institución Educativa se comunican de manera asertiva.',
          questionMappings: {
            docentes: 'La comunicación que tengo con otros docentes es asertiva.',
            estudiantes: 'La comunicación entre mis profesores es respetuosa y clara.',
            acudientes: 'La comunicación que tengo con los directivos docentes del colegio es respetuosa y clara.'
          }
        }
      ]
    },
    practicas_pedagogicas: {
      title: 'PRÁCTICAS PEDAGÓGICAS',
      items: [
        {
          displayText: 'Los intereses y las necesidades de los estudiantes son tenidos en cuenta en la planeación de las clases.',
          questionMappings: {
            docentes: 'Cuando preparo mis clases tengo en cuenta los intereses y necesidades de los estudiantes.',
            estudiantes: 'Los profesores tienen en cuenta mis intereses y afinidades para escoger lo que vamos a hacer en clase.',
            acudientes: 'Los profesores tienen en cuenta los intereses y necesidades de los estudiantes para escoger los temas que se van a tratar en clase.'
          }
        },
        {
          displayText: 'Los docentes de la Institución Educativa participan en proyectos transversales con otros colegas.',
          questionMappings: {
            docentes: 'Me articulo con profesores de otras áreas y niveles para llevar a cabo proyectos pedagógicos que mejoren los aprendizajes de los estudiantes.',
            estudiantes: 'Los profesores trabajan juntos en proyectos para hacer actividades que nos ayudan a aprender más y mejor.',
            acudientes: 'NA'
          }
        },
        {
          displayText: 'Para el desarrollo de los planes de aula, los docentes utilizan espacios alternativos como bibliotecas, parques, laboratorios, museos, etc.',
          questionMappings: {
            docentes: 'Utilizo diferentes espacios dentro y fuera del colegio como la biblioteca, el laboratorio o el parque para el desarrollo de mis clases.',
            estudiantes: 'Los profesores me llevan a otros sitios fuera del salón o del colegio para hacer las clases (por ejemplo, la biblioteca, el laboratorio, el parque, el museo, el río, etc.).',
            acudientes: 'A los estudiantes los llevan a lugares diferentes al salón para hacer sus clases (por ejemplo, la biblioteca, el laboratorio, el parque, el museo, el río, etc.).'
          }
        },
        {
          displayText: 'Los docentes logran cumplir los objetivos y el desarrollo de las clases que tenían planeados.',
          questionMappings: {
            docentes: 'Logro cumplir los objetivos y el desarrollo que planeo para mis clases.',
            estudiantes: 'Mis profesores logran hacer sus clases de manera fluida.',
            acudientes: 'NA'
          }
        },
        {
          displayText: 'Los docentes demuestran que confían en los estudiantes y que creen en sus capacidades y habilidades.',
          questionMappings: {
            docentes: 'Demuestro a mis estudiantes que confío en ellos y que creo en sus capacidades y habilidades.',
            estudiantes: 'Mis profesores me demuestran que confían en mí y creen en mis habilidades y capacidades.',
            acudientes: 'Los profesores demuestran que confían en los estudiantes y que creen en sus capacidades y habilidades.'
          }
        },
        {
          displayText: 'Los docentes adaptan su enseñanza para que todas y todos aprendan independiente de su entorno social, afectivo y sus capacidades físicas/cognitivas.',
          questionMappings: {
            docentes: 'Desarrollo mis clases con enfoque diferencial para garantizar el derecho a la educación de todas y todos mis estudiantes, independiente de su entorno social, afectivo y sus capacidades físicas y cognitivas.',
            estudiantes: 'Mis profesores hacen las clases de manera que nos permiten aprender a todas y todos sin importar nuestras diferencias (discapacidad, situaciones familiares o sociales).',
            acudientes: 'Los profesores del colegio hacen las clases garantizando el derecho a la educación de los estudiantes que viven condiciones o situaciones especiales (por ejemplo, alguna discapacidad, que sean desplazados o que entraron tarde al curso).'
          }
        },
        {
          displayText: 'Al evaluar, los docentes tienen en cuenta las emociones, en conjunto con el aprendizaje y el comportamiento.',
          questionMappings: {
            docentes: 'Cuando evalúo a mis estudiantes tengo en cuenta su dimensión afectiva y emocional, además de la cognitivas y comportamental.',
            estudiantes: 'Cuando mis profesores me evalúan tienen en cuenta mis emociones, además de mis aprendizajes y comportamiento.',
            acudientes: 'Cuando los profesores evalúan a los estudiantes tienen en cuenta su dimensión afectiva y emocional, además de la cognitiva y la comportamental.'
          }
        },
        {
          displayText: 'La Institución Educativa organiza o participa en actividades deportivas, culturales o académicas con otros colegios.',
          questionMappings: {
            docentes: 'Los profesores organizamos con otros colegios o instituciones actividades deportivas, académicas y culturales.',
            estudiantes: 'Participamos en campeonatos deportivos, ferias y olimpiadas con otros colegios o instituciones.',
            acudientes: 'El colegio organiza o participa en actividades como torneos, campeonatos, olimpiadas o ferias con otros colegios o instituciones.'
          }
        }
      ]
    },
    convivencia: {
      title: 'CONVIVENCIA',
      items: [
        {
          displayText: 'Todos los estudiantes son tratados con respeto independiente de sus creencias religiosas, género, orientación sexual, etnia y capacidades o talentos.',
          questionMappings: {
            docentes: 'En el colegio mis estudiantes son tratados con respeto, independiente de sus creencias religiosas, género, orientación sexual, grupo étnico y capacidades o talentos de los demás.',
            estudiantes: 'En el colegio mis compañeros y yo somos tratados con respeto sin importar nuestras creencias religiosas, género, orientación sexual, grupo étnico y capacidades o talentos.',
            acudientes: 'En el colegio los estudiantes son respetuosos y solidarios entre ellos, comprendiendo y aceptando las creencias religiosas, el género, la orientación sexual, el grupo étnico y las capacidades o talentos de los demás.'
          }
        },
        {
          displayText: 'Docentes y estudiantes establecen acuerdos de convivencia al comenzar el año escolar.',
          questionMappings: {
            docentes: 'Establezco con mis estudiantes acuerdos de convivencia al comenzar el año escolar.',
            estudiantes: 'Mis profesores establecen conmigo y mis compañeros acuerdos de convivencia al comienzo del año.',
            acudientes: 'Los profesores establecen acuerdos de convivencia con los estudiantes al comenzar el año escolar.'
          }
        },
        {
          displayText: 'Las opiniones y propuestas de familias, estudiantes y docentes son tenidas en cuenta cuando se construyen los acuerdos de convivencia en el colegio.',
          questionMappings: {
            docentes: 'Mis opiniones, propuestas y sugerencias se tienen en cuenta cuando se construyen acuerdos de convivencia en el colegio.',
            estudiantes: 'Mis opiniones, propuestas y sugerencias se tienen en cuenta cuando se construyen acuerdos de convivencia en el colegio.',
            acudientes: 'Mis opiniones, propuestas y sugerencias se tienen en cuenta cuando se construyen acuerdos de convivencia en el colegio.'
          }
        },
        {
          displayText: 'Los docentes son tratados con respeto por los estudiantes.',
          questionMappings: {
            docentes: 'Los estudiantes me tratan con respeto a mí y a mis otros compañeros docentes, directivos y administrativos.',
            estudiantes: 'Mis compañeros y yo tratamos con respeto a los profesores, directivos y administrativos del colegio.',
            acudientes: 'Los estudiantes tratan con respeto a los profesores, directivos y administrativos del colegio.'
          }
        },
        {
          displayText: 'Cada miembro de la comunidad educativa se siente escuchado y comprendido por los demás.',
          questionMappings: {
            docentes: 'En el colegio me siento escuchado/a y comprendido/a por otros docentes, los directivos, los estudiantes y los acudientes.',
            estudiantes: 'En el colegio me siento escuchado/a y comprendido/a por los profesores, los directivos, los estudiantes y otros acudientes.',
            acudientes: 'NA'
          }
        },
        {
          displayText: 'En la Institución Educativa, las personas se sienten apoyadas para resolver los conflictos que se dan y se generan aprendizajes a partir de estos.',
          questionMappings: {
            docentes: 'En el colegio recibo apoyo para resolver los conflictos que surgen y generar aprendizajes a partir de estos.',
            estudiantes: 'En el colegio recibo apoyo para resolver los conflictos que se dan y generar aprendizajes a partir de estos.',
            acudientes: 'En el colegio recibo apoyo para resolver los conflictos que se dan y generar aprendizajes a partir de estos.'
          }
        }
      ]
    }
  };

  console.log(`[Fortalezas] Getting frequency data for school: ${school || 'all schools'}`);
  const results: FrequencyData[] = [];

  for (const [sectionKey, section] of Object.entries(sections)) {
    console.log(`[Fortalezas] Processing section: ${section.title} with ${section.items.length} items`);
    const sectionData: FrequencyData = {
      title: section.title,
      questions: []
    };

    for (const item of section.items) {
      try {
        console.log(`[Fortalezas] Processing item: ${item.displayText.substring(0, 30)}...`);
        const gridItem = {
          displayText: item.displayText,
          questionMappings: item.questionMappings,
          results: {
            docentes: await calculateFrequencies('docentes_form_submissions', item.questionMappings.docentes, sectionKey, school),
            estudiantes: await calculateFrequencies('estudiantes_form_submissions', item.questionMappings.estudiantes, sectionKey, school),
            acudientes: await calculateFrequencies('acudientes_form_submissions', item.questionMappings.acudientes, sectionKey, school)
          }
        };
        sectionData.questions.push(gridItem);
      } catch (error) {
        console.error(`[Fortalezas] Error processing item ${item.displayText.substring(0, 30)}...`, error);
        // Add a placeholder with -1 values to ensure all questions are included
        const errorItem = {
          displayText: item.displayText,
          questionMappings: item.questionMappings,
          results: {
            docentes: { S: -1, A: -1, N: -1 },
            estudiantes: { S: -1, A: -1, N: -1 },
            acudientes: { S: -1, A: -1, N: -1 }
          }
        };
        sectionData.questions.push(errorItem);
      }
    }

    results.push(sectionData);
  }

  console.log(`[Fortalezas] Completed frequency data processing, found ${results.length} sections with a total of ${results.reduce((sum, section) => sum + section.questions.length, 0)} questions`);
  return results;
}

// Main function to generate the fortalezas pages
export const generateFortalezasPages = async (doc: CustomPDFKit, school: string): Promise<void> => {
  // Get frequency data
  const frequencyData = await getFrequencyData(school);
  
  // Add initial page with header
  doc.addPage();
  addHeader(doc);
  
  // Add sections
  for (const section of frequencyData) {
    // Define table dimensions and positions
    const startX = 40;
    let currentY = section.title === 'COMUNICACIÓN' ? 65 : doc.y;  // Initial Y position
    const numberWidth = 30;  // Width for the new leftmost column
    const questionWidth = 240;  // Doubled from 120 to 240
    const ratingWidth = 25;
    const groupWidth = ratingWidth * 3;
    const rowHeight = 30;

    // Only force new page for CONVIVENCIA section
    if (section.title === 'CONVIVENCIA') {
      doc.addPage();
      addHeader(doc);
      currentY = doc.y;
    } else {
      // For other sections, only add page break if not enough space
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
        addHeader(doc);
        currentY = doc.y;
      }
    }
    
    // Add main title and legend at the top of first page
    if (section.title === 'COMUNICACIÓN') {
      // Add main title
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('FORTALEZAS Y RETOS', startX, 65, {  // Reduced from 100 to 65
           align: 'left',
           underline: false
         });
      
      doc.moveDown(0.5);  // Reduced from 1 to 0.5 to decrease space after title
      currentY = doc.y;

      // Calculate content width based on table width
      const contentWidth = numberWidth + questionWidth + (groupWidth * 3);  // This matches the table width
      
      // Draw exclamation mark
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('!', startX + 12, currentY + 2);
      
      // Add color legend with solid border
      const legendPadding = 10;
      const iconWidth = 30;  // Space for the exclamation mark
      const textStartX = startX + iconWidth;
      const legendTextWidth = contentWidth - iconWidth;
      
      // Draw border around text (solid line)
      doc.lineWidth(0.5)
         .rect(textStartX, currentY, legendTextWidth, 30)
         .stroke();

      // Add legend text
      doc.fontSize(10)
         .font('Helvetica')
         .text('Los elementos en naranja representan elementos a mejorar.',
           textStartX + legendPadding, currentY + 8, {
             width: legendTextWidth - (legendPadding * 2),
             align: 'center'
           });
      
      doc.moveDown(3);  // Increased space after legend box
      currentY = doc.y;
      
      // Add S, A, N legend
      doc.fontSize(10)
         .font('Helvetica')
         .text('S = Siempre / Casi Siempre', startX, currentY)
         .text('A = A veces', startX, currentY + 15)
         .text('N = Nunca / Casi nunca', startX, currentY + 30);
      
      doc.moveDown(1);  // One line of space after legend
      currentY = doc.y;
    }
    
    // If it's the CONVIVENCIA section on a new page, add the legend
    if (section.title === 'CONVIVENCIA') {
      // Add more space after header before legend
      doc.moveDown(4);  // Increased spacing
      currentY = doc.y;
      
      // Add legend at the top of new page
      doc.fontSize(10)
         .font('Helvetica')
         .text('S = Siempre / Casi Siempre', startX, currentY)
         .text('A = A veces', startX, currentY + 15)
         .text('N = Nunca / Casi nunca', startX, currentY + 30);
      
      doc.moveDown(1);  // One line of space after legend
      currentY = doc.y;
    }
    
    // Draw table outline
    doc.lineWidth(0.5);
    doc.font('Helvetica');
    
    // Define constants
    const groups = ['Docentes', 'Estudiantes', 'Acudientes'];
    const ratings = ['S', 'A', 'N'] as const;
    
    // Calculate merged cell height based on section
    const mergedCellHeight = rowHeight * (
      section.title === 'COMUNICACIÓN' ? section.questions.length :  // Just questions height for COMUNICACIÓN
      section.title === 'PRÁCTICAS PEDAGÓGICAS' ? section.questions.length :  // Just data rows
      section.questions.length  // Changed to match exactly the number of questions
    );
    
    // Calculate starting Y position for the title column
    const titleStartY = 
      section.title === 'COMUNICACIÓN' ? currentY + rowHeight + rowHeight/2 :  // Start after both header rows
      section.title === 'PRÁCTICAS PEDAGÓGICAS' ? currentY + rowHeight :
      currentY + rowHeight + rowHeight/2;  // For CONVIVENCIA, start after headers like COMUNICACIÓN
    
    // Set color based on section
    let sectionColor;
    switch(section.title) {
      case 'COMUNICACIÓN':
        sectionColor = '#2C5282';  // Deep blue
        break;
      case 'PRÁCTICAS PEDAGÓGICAS':
        sectionColor = '#2F6B25';  // Forest green
        break;
      case 'CONVIVENCIA':
        sectionColor = '#923131';  // Deep red
        break;
    }
    
    // Draw merged cell for number column with vertical section title and background color
    doc.rect(startX, titleStartY, numberWidth, mergedCellHeight)
       .fill(sectionColor);
    
    // Save the current graphics state
    doc.save();
    
    // Calculate the center point for rotation
    const centerX = startX + (numberWidth / 2);
    const centerY = titleStartY + (mergedCellHeight / 2);
    
    // Move to center point, rotate, and draw white text
    doc.translate(centerX, centerY)
       .rotate(-90) // Rotate 90 degrees counterclockwise
       .fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('white')  // White text for contrast
       .text(section.title, -(mergedCellHeight / 2), -5, {
         width: mergedCellHeight,
         align: 'center'
       });
    
    // Restore the graphics state and colors
    doc.restore();
    doc.fillColor('black');  // Reset to black for remaining text
    
    // Reset font to normal
    doc.font('Helvetica');
    
    // Draw headers only for COMUNICACIÓN and CONVIVENCIA sections
    if (section.title !== 'PRÁCTICAS PEDAGÓGICAS') {
      // Draw group headers (leaving the question column empty in first row)
      groups.forEach((group, i) => {
        const x = startX + numberWidth + questionWidth + (i * groupWidth);
        
        // Draw thicker vertical separator line before each group and at the edges
        if (i > 0) {
          doc.lineWidth(2)  // Thicker line for separation
             .moveTo(x, currentY)
             .lineTo(x, currentY + rowHeight * (section.questions.length + 1.5))
             .stroke();
          doc.lineWidth(0.5);  // Reset line width
        }
        
        // Draw left edge for Docentes
        if (i === 0) {
          doc.lineWidth(2)
             .moveTo(x, currentY)
             .lineTo(x, currentY + rowHeight * (section.questions.length + 1.5))
             .stroke();
          doc.lineWidth(0.5);
        }
        
        // Draw right edge for Acudientes
        if (i === groups.length - 1) {
          const rightX = x + groupWidth;
          doc.lineWidth(2)
             .moveTo(rightX, currentY)
             .lineTo(rightX, currentY + rowHeight * (section.questions.length + 1.5))
             .stroke();
          doc.lineWidth(0.5);
        }
        
        doc.rect(x, currentY, groupWidth, rowHeight).stroke();
        doc.font('Helvetica-Bold')  // Make group titles bold
           .text(group, x + 3, currentY + 8, {
          width: groupWidth - 6,
          align: 'center'
        });
        doc.font('Helvetica');  // Reset font
      });
      
      // Move to rating headers row
      currentY += rowHeight;
      
      // Draw "Item de la encuesta" header in the second row
      doc.rect(startX + numberWidth, currentY, questionWidth, rowHeight/2).stroke();
      doc.font('Helvetica-Bold')
         .text('Item de la encuesta', startX + numberWidth + 3, currentY + 4, {
         width: questionWidth - 6,
         align: 'center'
      });
      
      // Reset font
      doc.font('Helvetica');
      
      // Draw rating headers (S, A, N)
      groups.forEach((_, groupIndex) => {
        // Draw thicker vertical separator line before each group (except first)
        if (groupIndex > 0) {
          const separatorX = startX + numberWidth + questionWidth + (groupIndex * groupWidth);
          doc.lineWidth(2);  // Thicker line for separation
          doc.moveTo(separatorX, currentY)
             .lineTo(separatorX, currentY + rowHeight/2)
             .stroke();
          doc.lineWidth(0.5);  // Reset line width
        }
        
        ratings.forEach((rating, ratingIndex) => {
          const x = startX + numberWidth + questionWidth + (groupIndex * groupWidth) + (ratingIndex * ratingWidth);
          doc.rect(x, currentY, ratingWidth, rowHeight/2).stroke();
          doc.text(rating, x + 3, currentY + 4, {
            width: ratingWidth - 6,
            align: 'center'
          });
        });
      });
      
      // Move to data rows
      currentY += rowHeight/2;
    } else {
      // For PRÁCTICAS PEDAGÓGICAS, just move to data rows
      currentY += rowHeight;
    }
    
    // Draw data rows
    for (const question of section.questions) {
      // Check if we need a new page before drawing the row
      if (currentY > doc.page.height - rowHeight) {
        doc.addPage();
        addHeader(doc);
        currentY = doc.y;
      }

      const rowStartY = currentY;
      
      // Draw question cell with left alignment
      doc.rect(startX + numberWidth, currentY, questionWidth, rowHeight).stroke();
      doc.fontSize(9)
         .text(question.displayText, startX + numberWidth + 3, currentY + 3, {
        width: questionWidth - 6,
        height: rowHeight - 6,
        align: 'left'
      });
      
      // Draw result cells for each group
      const groupKeys = ['docentes', 'estudiantes', 'acudientes'] as const;
      
      groupKeys.forEach((group, groupIndex) => {
        // Draw vertical separators for PRÁCTICAS PEDAGÓGICAS
        if (section.title === 'PRÁCTICAS PEDAGÓGICAS') {
          const x = startX + numberWidth + questionWidth + (groupIndex * groupWidth);
          
          // Draw vertical separators
          if (groupIndex > 0) {  // Between groups
            doc.lineWidth(2)
               .moveTo(x, currentY)
               .lineTo(x, currentY + rowHeight)
               .stroke()
               .lineWidth(0.5);
          }
          
          if (groupIndex === 0) {  // Left edge
            doc.lineWidth(2)
               .moveTo(x, currentY)
               .lineTo(x, currentY + rowHeight)
               .stroke()
               .lineWidth(0.5);
          }
          
          if (groupIndex === groupKeys.length - 1) {  // Right edge
            const rightX = x + groupWidth;
            doc.lineWidth(2)
               .moveTo(rightX, currentY)
               .lineTo(rightX, currentY + rowHeight)
               .stroke()
               .lineWidth(0.5);
          }
        }
        
        ratings.forEach((rating, ratingIndex) => {
          const x = startX + numberWidth + questionWidth + (groupIndex * groupWidth) + (ratingIndex * ratingWidth);
          const value = question.results[group][rating];
          
          // Draw cell border
          doc.rect(x, currentY, ratingWidth, rowHeight).stroke();
          
          // Handle different value cases
          if (value === -1) {
            doc.font('Helvetica-Oblique')
               .fontSize(7)
               .fillColor('#666666')
               .text('Sin datos', x + 2, currentY + (rowHeight/2) - 6, {
                 width: ratingWidth - 4,
                 align: 'center'
               });
            doc.font('Helvetica')
               .fillColor('#000000');
          } else {
            if (rating === 'S' && value < 50 && value !== -1) {
              doc.rect(x, currentY, ratingWidth, rowHeight)
                 .fill('#FFA500');  // Orange color for values < 50%
              doc.fillColor('#000000');  // Black text for better contrast on orange
            }
            
            doc.fontSize(7)
               .text(
                 `${value}%`,
                 x + 1,
                 currentY + (rowHeight/2) - 6,
                 { 
                   width: ratingWidth - 2,
                   align: 'center'
                 }
               );
            
            doc.fillColor('#000000');
          }
        });
      });
      
      currentY += rowHeight;
    }
    
    // After the table is drawn, only handle page break for PRÁCTICAS PEDAGÓGICAS
    if (section !== frequencyData[frequencyData.length - 1]) {
      if (section.title === 'PRÁCTICAS PEDAGÓGICAS') {
        currentY = doc.y;
      }
    } else {
      // Add challenges section after the last table (CONVIVENCIA)
      if (doc.y > doc.page.height - 300) { // Check if we need a new page for challenges section
        doc.addPage();
        addHeader(doc);
        // Start content further down from header on page 8
        currentY = 150; // Increased starting position
      } else {
        doc.moveDown(4);  // Add space after the last table
        currentY = doc.y;
      }

      // Add title
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('RETOS PARA EL DIRECTIVO EVALUADO', startX, currentY, {
           align: 'left',
           underline: false
         });

      doc.moveDown(1);
      currentY = doc.y;

      // Calculate content width based on table width
      const contentWidth = numberWidth + questionWidth + (groupWidth * 3);

      // Draw exclamation mark
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('!', startX + 12, currentY + 2);

      // Add instruction box with solid border
      const legendPadding = 10;
      const iconWidth = 30;
      const textStartX = startX + iconWidth;
      const challengeTextWidth = contentWidth - iconWidth;

      // Draw border around text (solid line)
      doc.lineWidth(0.5)
         .rect(textStartX, currentY, challengeTextWidth, 30)
         .stroke();

      // Add instruction text
      doc.fontSize(10)
         .font('Helvetica')
         .text('En el recuadro escriba los retos que estos resultados le plantean como líder.',
           textStartX + legendPadding, currentY + 8, {
             width: challengeTextWidth - (legendPadding * 2),
             align: 'center'
           });

      doc.moveDown(2);
      currentY = doc.y;

      // Add large text box for writing challenges
      const boxHeight = 200;  // Height for writing challenges
      doc.lineWidth(0.5)
         .rect(startX, currentY, contentWidth, boxHeight)
         .stroke();
    }
  }
}; 