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
  // Define sections configuration
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

  console.log(`Getting frequency data for school: ${school || 'all schools'}`);
  const results: FrequencyData[] = [];

  for (const [sectionKey, section] of Object.entries(sections)) {
    console.log(`Processing section: ${section.title} with ${section.items.length} items`);
    const sectionData: FrequencyData = {
      title: section.title,
      questions: []
    };

    for (const item of section.items) {
      try {
        console.log(`Processing item: ${item.displayText.substring(0, 30)}...`);
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
        console.error(`Error processing item ${item.displayText.substring(0, 30)}...:`, error);
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

  console.log(`Completed frequency data processing, found ${results.length} sections`);
  return results;
}

// Function to calculate averages for each category
function calculateCategoryAverages(data: FrequencyData[], category: string, role: 'docentes' | 'estudiantes' | 'acudientes' = 'docentes') {
  const categoryData = data.find(d => d.title === category);
  if (!categoryData) {
    console.log(`Warning: No category data found for ${category}`);
    return { S: 0, A: 0, N: 0 };
  }
  
  let totalS = 0, totalA = 0, totalN = 0;
  let validCount = 0;
  
  // Log the questions being processed
  console.log(`Processing ${categoryData.questions.length} questions for ${category} (${role})`);
  
  categoryData.questions.forEach((q, index) => {
    const results = q.results[role];
    console.log(`Question ${index + 1}: ${q.displayText.substring(0, 30)}... - Values: S=${results.S}, A=${results.A}, N=${results.N}`);
    
    // Only include questions with valid data (not -1, which indicates no data)
    if (results.S !== -1) {
      totalS += results.S;
      totalA += results.A;
      totalN += results.N;
      validCount++;
    }
  });
  
  console.log(`Valid questions for ${category} (${role}): ${validCount} of ${categoryData.questions.length}`);
  
  // If we have no valid data at all, ensure we return zeros
  const averages = {
    S: validCount ? Math.round(totalS / validCount) : 0,
    A: validCount ? Math.round(totalA / validCount) : 0,
    N: validCount ? Math.round(totalN / validCount) : 0
  };
  
  console.log(`Final averages for ${category} (${role}): S=${averages.S}, A=${averages.A}, N=${averages.N}`);
  return averages;
}

// Main function to generate the summary page
export const generateSummaryPage = async (doc: CustomPDFKit, school: string): Promise<void> => {
  // Add a new page with header
  doc.addPage();
  addHeader(doc);

  // Add RESUMEN GENERAL title
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .fillColor('black')
     .text('RESUMEN GENERAL', 40, doc.y + 20, {
       align: 'left',
       underline: false
     });

  // Get frequency data first
  const frequencyData = await getFrequencyData(school);
  
  // Add DOCENTES section
  doc.moveDown(2);
  const sectionStartX = 40;
  const sectionWidth = doc.page.width - (sectionStartX * 2);
  const sectionTitleHeight = 20;
  
  // Get current Y position
  const summaryDocentesY = doc.y;
  
  // Draw background rectangle for DOCENTES
  doc.save()
     .fillColor('#1E3A8A')  // Dark blue background
     .rect(sectionStartX, summaryDocentesY, sectionWidth, sectionTitleHeight)
     .fill()
     .restore();

  // Add DOCENTES title
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('white')  // White text for contrast
     .text('DOCENTES', sectionStartX, summaryDocentesY + 4, {
       width: sectionWidth,
       align: 'center'
     });

  // Constants for stacked bar layout
  const stackedBarLabelWidth = 150;  // Width for category labels
  const stackedBarWidth = sectionWidth - stackedBarLabelWidth;  // Remaining width for bars

  // Get averages for DOCENTES
  const docentesAvgComunicacion = calculateCategoryAverages(frequencyData, 'COMUNICACIÓN', 'docentes');
  const docentesAvgPracticas = calculateCategoryAverages(frequencyData, 'PRÁCTICAS PEDAGÓGICAS', 'docentes');
  const docentesAvgConvivencia = calculateCategoryAverages(frequencyData, 'CONVIVENCIA', 'docentes');

  // Draw stacked bars
  const barStartY = doc.y + 20;  // Add some space after the title
  const barHeight = 20;

  // Helper function to draw a stacked bar
  const drawStackedBar = (label: string, values: { S: number, A: number, N: number }, y: number) => {
    // Draw label
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('black')
       .text(label, sectionStartX, y + 4, {
         width: stackedBarLabelWidth,
         align: 'left'
       });

    // Check if we have any values
    if (values.S === 0 && values.A === 0 && values.N === 0) {
      // Draw a grayed-out bar with "Sin información" text
      doc.rect(sectionStartX + stackedBarLabelWidth, y, stackedBarWidth, barHeight)
         .fillColor('#E0E0E0')  // Light gray
         .fill();
      
      doc.fontSize(9)
         .fillColor('#666666')  // Dark gray text
         .text('Sin información', 
              sectionStartX + stackedBarLabelWidth + (stackedBarWidth/2) - 40, 
              y + 4, {
                width: 80,
                align: 'center'
              });
      return;
    }

    // Normalize values to ensure they sum to 100%
    const actualTotal = values.S + values.A + values.N;
    
    // Safety check to avoid division by zero
    if (actualTotal === 0) {
      console.log(`Warning: Total is zero for ${label} values: S=${values.S}, A=${values.A}, N=${values.N}`);
      // Draw a grayed-out bar with "Error de datos" text
      doc.rect(sectionStartX + stackedBarLabelWidth, y, stackedBarWidth, barHeight)
         .fillColor('#E0E0E0')  // Light gray
         .fill();
      
      doc.fontSize(9)
         .fillColor('#666666')  // Dark gray text
         .text('Error de datos', 
              sectionStartX + stackedBarLabelWidth + (stackedBarWidth/2) - 40, 
              y + 4, {
                width: 80,
                align: 'center'
              });
      return;
    }
    
    const normalizedValues = {
      S: Math.round((values.S / actualTotal) * 100),
      A: Math.round((values.A / actualTotal) * 100),
      N: Math.round((values.N / actualTotal) * 100)
    };

    // Adjust for rounding errors to ensure sum is exactly 100
    const sum = normalizedValues.S + normalizedValues.A + normalizedValues.N;
    if (sum > 100) {
      // Remove excess from the largest value
      const max = Math.max(normalizedValues.S, normalizedValues.A, normalizedValues.N);
      if (max === normalizedValues.S) normalizedValues.S -= (sum - 100);
      else if (max === normalizedValues.A) normalizedValues.A -= (sum - 100);
      else normalizedValues.N -= (sum - 100);
    } else if (sum < 100) {
      // Add remainder to the largest value
      const max = Math.max(normalizedValues.S, normalizedValues.A, normalizedValues.N);
      if (max === normalizedValues.S) normalizedValues.S += (100 - sum);
      else if (max === normalizedValues.A) normalizedValues.A += (100 - sum);
      else normalizedValues.N += (100 - sum);
    }

    let currentX = sectionStartX + stackedBarLabelWidth;
    
    // Draw S segment (Blue)
    const sWidth = (normalizedValues.S / 100) * stackedBarWidth;
    doc.rect(currentX, y, sWidth, barHeight)
       .fillColor('#4472C4')
       .fill();
    if (values.S > 0) {
      doc.fillColor('white')
         .fontSize(8)
         .text(`${values.S}%`,
           currentX + (sWidth/2) - 8,
           y + (barHeight/2),
           { baseline: 'middle' });
    }
    currentX += sWidth;

    // Draw A segment (Yellow)
    const aWidth = (normalizedValues.A / 100) * stackedBarWidth;
    doc.rect(currentX, y, aWidth, barHeight)
       .fillColor('#FFC000')
       .fill();
    if (values.A > 0) {
      doc.fillColor('black')
         .fontSize(8)
         .text(`${values.A}%`,
           currentX + (aWidth/2) - 8,
           y + (barHeight/2),
           { baseline: 'middle' });
    }
    currentX += aWidth;

    // Draw N segment (Red)
    const nWidth = (normalizedValues.N / 100) * stackedBarWidth;
    doc.rect(currentX, y, nWidth, barHeight)
       .fillColor('#FF0000')
       .fill();
    if (values.N > 0) {
      doc.fillColor('white')
         .fontSize(8)
         .text(`${values.N}%`,
           currentX + (nWidth/2) - 8,
           y + (barHeight/2),
           { baseline: 'middle' });
    }
  };

  // Draw bars for each category
  drawStackedBar('Comunicación', docentesAvgComunicacion, barStartY);
  drawStackedBar('Prácticas pedagógicas', docentesAvgPracticas, barStartY + barHeight + 10);
  drawStackedBar('Convivencia', docentesAvgConvivencia, barStartY + (barHeight + 10) * 2);

  // Add legend - Moving it directly under the last bar
  const stackedBarLegendY = barStartY + (barHeight + 10) * 3;
  
  // Place legend at the beginning of the stacked bars
  doc.fontSize(8)
     .fillColor('black');
     
  // Calculate positions - Start exactly at the beginning of the bars
  const legendStartX = sectionStartX + stackedBarLabelWidth; // Start of bars
  const boxSize = 12;
  const textMargin = 16;
  const legendSpacing = 70; // Space between legend items
  const moveAVecesRight = 40; // Additional spacing to move "A veces" more to the right
  
  // S legend
  doc.rect(legendStartX, stackedBarLegendY, boxSize, boxSize)
     .fillColor('#4472C4')
     .fill();
  doc.fillColor('black')
     .text('Siempre/Casi siempre', legendStartX + textMargin, stackedBarLegendY + 2);

  // A legend - moved more to the right
  doc.rect(legendStartX + legendSpacing + moveAVecesRight, stackedBarLegendY, boxSize, boxSize)
     .fillColor('#FFC000')
     .fill();
  doc.fillColor('black')
     .text('A veces', legendStartX + legendSpacing + moveAVecesRight + textMargin, stackedBarLegendY + 2);

  // N legend - adjusted to maintain proper spacing after A legend
  doc.rect(legendStartX + (legendSpacing * 2) + moveAVecesRight, stackedBarLegendY, boxSize, boxSize)
     .fillColor('#FF0000')
     .fill();
  doc.fillColor('black')
     .text('Casi nunca/Nunca', legendStartX + (legendSpacing * 2) + moveAVecesRight + textMargin, stackedBarLegendY + 2);

  // Add ESTUDIANTES section - Using the legend Y position as a starting point for proper spacing
  doc.moveDown(3);
  doc.y = stackedBarLegendY + 30;
  doc.rect(sectionStartX, doc.y, sectionWidth, sectionTitleHeight)
     .fillColor('#1E3A8A')
     .fill();
  doc.fillColor('white')
     .fontSize(12)
     .text('ESTUDIANTES', sectionStartX, doc.y + 4, {
       width: sectionWidth,
       align: 'center'
     });

  // Calculate averages for ESTUDIANTES
  const estudiantesAvgComunicacion = calculateCategoryAverages(frequencyData, 'COMUNICACIÓN', 'estudiantes');
  const estudiantesAvgPracticas = calculateCategoryAverages(frequencyData, 'PRÁCTICAS PEDAGÓGICAS', 'estudiantes');
  const estudiantesAvgConvivencia = calculateCategoryAverages(frequencyData, 'CONVIVENCIA', 'estudiantes');

  // Draw stacked bars for ESTUDIANTES
  const estudiantesBarStartY = doc.y + 20;
  drawStackedBar('Comunicación', estudiantesAvgComunicacion, estudiantesBarStartY);
  drawStackedBar('Prácticas pedagógicas', estudiantesAvgPracticas, estudiantesBarStartY + barHeight + 10);
  drawStackedBar('Convivencia', estudiantesAvgConvivencia, estudiantesBarStartY + (barHeight + 10) * 2);

  // Add legend for ESTUDIANTES - Moving it directly under the last bar
  const estudiantesLegendY = estudiantesBarStartY + (barHeight + 10) * 3;
  
  // Center the legend horizontally
  doc.fontSize(8)
     .fillColor('black');
  
  // S legend
  doc.rect(legendStartX, estudiantesLegendY, boxSize, boxSize)
     .fillColor('#4472C4')
     .fill();
  doc.fillColor('black')
     .text('Siempre/Casi siempre', legendStartX + textMargin, estudiantesLegendY + 2);

  // A legend - moved more to the right
  doc.rect(legendStartX + legendSpacing + moveAVecesRight, estudiantesLegendY, boxSize, boxSize)
     .fillColor('#FFC000')
     .fill();
  doc.fillColor('black')
     .text('A veces', legendStartX + legendSpacing + moveAVecesRight + textMargin, estudiantesLegendY + 2);

  // N legend - adjusted to maintain proper spacing after A legend
  doc.rect(legendStartX + (legendSpacing * 2) + moveAVecesRight, estudiantesLegendY, boxSize, boxSize)
     .fillColor('#FF0000')
     .fill();
  doc.fillColor('black')
     .text('Casi nunca/Nunca', legendStartX + (legendSpacing * 2) + moveAVecesRight + textMargin, estudiantesLegendY + 2);

  // Add ACUDIENTES section - Using the legend Y position as a starting point for proper spacing
  doc.moveDown(3);
  doc.y = estudiantesLegendY + 30;
  doc.rect(sectionStartX, doc.y, sectionWidth, sectionTitleHeight)
     .fillColor('#1E3A8A')
     .fill();
  doc.fillColor('white')
     .fontSize(12)
     .text('ACUDIENTES', sectionStartX, doc.y + 4, {
       width: sectionWidth,
       align: 'center'
     });

  // Calculate averages for ACUDIENTES
  const acudientesAvgComunicacion = calculateCategoryAverages(frequencyData, 'COMUNICACIÓN', 'acudientes');
  const acudientesAvgPracticas = calculateCategoryAverages(frequencyData, 'PRÁCTICAS PEDAGÓGICAS', 'acudientes');
  const acudientesAvgConvivencia = calculateCategoryAverages(frequencyData, 'CONVIVENCIA', 'acudientes');

  // Draw stacked bars for ACUDIENTES
  const acudientesBarStartY = doc.y + 20;
  drawStackedBar('Comunicación', acudientesAvgComunicacion, acudientesBarStartY);
  drawStackedBar('Prácticas pedagógicas', acudientesAvgPracticas, acudientesBarStartY + barHeight + 10);
  drawStackedBar('Convivencia', acudientesAvgConvivencia, acudientesBarStartY + (barHeight + 10) * 2);

  // Add legend for ACUDIENTES - Moving it directly under the last bar
  const acudientesLegendY = acudientesBarStartY + (barHeight + 10) * 3;
  
  // Center the legend horizontally
  doc.fontSize(8)
     .fillColor('black');
  
  // S legend
  doc.rect(legendStartX, acudientesLegendY, boxSize, boxSize)
     .fillColor('#4472C4')
     .fill();
  doc.fillColor('black')
     .text('Siempre/Casi siempre', legendStartX + textMargin, acudientesLegendY + 2);

  // A legend - moved more to the right
  doc.rect(legendStartX + legendSpacing + moveAVecesRight, acudientesLegendY, boxSize, boxSize)
     .fillColor('#FFC000')
     .fill();
  doc.fillColor('black')
     .text('A veces', legendStartX + legendSpacing + moveAVecesRight + textMargin, acudientesLegendY + 2);

  // N legend - adjusted to maintain proper spacing after A legend
  doc.rect(legendStartX + (legendSpacing * 2) + moveAVecesRight, acudientesLegendY, boxSize, boxSize)
     .fillColor('#FF0000')
     .fill();
  doc.fillColor('black')
     .text('Casi nunca/Nunca', legendStartX + (legendSpacing * 2) + moveAVecesRight + textMargin, acudientesLegendY + 2);
     
  // Add instruction box with instruction at the end
  doc.moveDown(4);
  const instructionBoxX = 40;
  const instructionBoxY = doc.y;
  const instructionBoxWidth = doc.page.width - (instructionBoxX * 2);
  const instructionBoxHeight = 40; // Height for 2 lines of text
  
  // Draw exclamation mark icon (red)
  doc.save();
  const iconX = instructionBoxX - 15;
  const iconY = instructionBoxY + (instructionBoxHeight / 2) - 18; // Adjusted for smaller box
  
  doc.font('Helvetica-Bold')
     .fontSize(36)
     .fillColor('#FF0000') // Red exclamation mark
     .text('!', iconX, iconY);
     
  // Draw box for text
  doc.rect(instructionBoxX, instructionBoxY, instructionBoxWidth, instructionBoxHeight)
     .lineWidth(1)
     .stroke();
  
  // Add instruction text in red, centered vertically by approximation
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#FF0000') // Red text
     .text('Lo ideal sería que, en los tres componentes, la percepción de cada uno de los actores fuera lo más positiva posible. Identifique en cuáles actores y componentes la percepción negativa es mayor.', 
           instructionBoxX + 10, 
           instructionBoxY + 12, // Approximately vertically centered (40px height / 2 = 20px, minus half text height ~8px)
           {
             width: instructionBoxWidth - 20,
             align: 'center',
             lineGap: 0 // Reduce line spacing
           });
  
  doc.restore();
}; 