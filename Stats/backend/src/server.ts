import express from 'express';
import cors from 'cors';
import { pool } from './db';
import { FrequencyData, SectionConfig, GridItem, FrequencyResult } from './types';
import { QueryResult } from 'pg';
import PDFKit from 'pdfkit';
import path from 'path';
import { generatePDF } from './pdf-modules/pdfGenerator';
import { config } from './config';

const app = express();
const port = config.ports.backend;

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = Array.isArray(config.cors.origin) 
      ? config.cors.origin 
      : [config.cors.origin];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`Origin ${origin} not allowed by CORS`);
      callback(null, allowedOrigins[0]); // Allow the first origin as fallback
    }
  },
  credentials: true // Allow credentials (cookies, authorization headers)
}));
app.use(express.json());

// Test query to check table access and column names
pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'docentes_form_submissions\'')
  .then((result: QueryResult) => {
    console.log('Columns in docentes_form_submissions:', result.rows.map((row: { column_name: string }) => row.column_name));
  })
  .catch((err: Error) => {
    console.error('Error querying column names:', err);
  });

// Test query to check table access
pool.query('SELECT COUNT(*) FROM docentes_form_submissions')
  .then((result: QueryResult) => {
    console.log('Successfully queried docentes_form_submissions. Row count:', result.rows[0].count);
  })
  .catch((err: Error) => {
    console.error('Error querying docentes_form_submissions:', err);
  });

// Test query to check column names in rectores table
pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'rectores\' ORDER BY ordinal_position')
  .then((result: QueryResult) => {
    console.log('All columns in rectores table:');
    result.rows.forEach((row: { column_name: string }) => {
      console.log('-', row.column_name);
    });
  })
  .catch((err: Error) => {
    console.error('Error querying rectores column names:', err);
  });

const sections: Record<string, SectionConfig> = {
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
    // Log the exact query parameters
    console.log(`\nDEBUG - Query Parameters:`);
    console.log(`Table: ${tableName}`);
    console.log(`Question: "${question}"`);
    console.log(`Section: ${section}`);
    console.log(`Column: ${columnName}`);
    console.log(`School: ${school || 'All schools'}`);

    const { rows } = await pool.query(query, queryParams);
    
    // Log raw results
    console.log(`Raw Results:`, JSON.stringify(rows, null, 2));

    if (rows.length === 0) {
      console.log(`WARNING: No results found for question "${question}" in table ${tableName}${school ? ` for school ${school}` : ''}`);
      // Try a broader query to see what questions exist
      const checkQuery = `
        SELECT DISTINCT key, COUNT(DISTINCT value) as value_count
        FROM ${tableName},
          jsonb_each_text(${columnName}) as x(key, value)
        ${school ? `WHERE institucion_educativa = $1` : ''}
        GROUP BY key
        LIMIT 5;
      `;
      const { rows: checkRows } = await pool.query(checkQuery, school ? [school] : []);
      console.log(`Sample questions in ${tableName} with value counts:`, checkRows);
      return { S: -1, A: -1, N: -1 }; // Indicate no data available
    }

    let total = 0;
    const counts: Record<string, number> = { S: 0, A: 0, N: 0 };
    const unrecognizedRatings: Set<string> = new Set();

    rows.forEach((row: { rating: string; count: string }) => {
      const count = parseInt(row.count);
      const rating = row.rating.toLowerCase().trim();
      console.log(`Processing: Rating="${rating}", Count=${count}`);
      
      total += count;
      if (rating.includes('siempre')) {
        counts.S += count;
      } else if (rating.includes('veces')) {
        counts.A += count;
      } else if (rating.includes('nunca')) {
        counts.N += count;
      } else {
        unrecognizedRatings.add(rating);
        console.log(`WARNING: Unrecognized rating "${rating}"`);
      }
    });

    if (unrecognizedRatings.size > 0) {
      console.log(`WARNING: Found unrecognized ratings:`, Array.from(unrecognizedRatings));
    }

    // Log the totals
    console.log(`Totals - S: ${counts.S}, A: ${counts.A}, N: ${counts.N}, Total: ${total}`);

    if (total === 0) {
      console.log(`WARNING: No valid responses found for question "${question}"`);
      return { S: -1, A: -1, N: -1 }; // Indicate no valid data
    }

    const result = {
      S: Math.round((counts.S / total) * 100),
      A: Math.round((counts.A / total) * 100),
      N: Math.round((counts.N / total) * 100)
    };

    console.log(`Final percentages:`, result);
    return result;
  } catch (error) {
    console.error(`Error in calculateFrequencies:`, error);
    console.error(`Failed query parameters:`, { tableName, question, section, columnName, school });
    return { S: -1, A: -1, N: -1 }; // Indicate error condition
  }
}

app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Stats API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/frequency-ratings', async (req, res) => {
  try {
    const school = req.query.school as string | undefined;
    console.log(`Fetching frequency ratings${school ? ` for school: ${school}` : ' for all schools'}`);
    
    // Check if tables exist
    const tables = ['docentes_form_submissions', 'estudiantes_form_submissions', 'acudientes_form_submissions'];
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
        console.log(`Table ${table} exists:`, result.rows[0].exists);
      } catch (error) {
        console.error(`Error checking if table ${table} exists:`, error);
      }
    }
    
    const results: FrequencyData[] = [];

    for (const [sectionKey, section] of Object.entries(sections)) {
      const sectionData: FrequencyData = {
        title: section.title,
        questions: []
      };

      for (const item of section.items) {
        const gridItem: GridItem = {
          displayText: item.displayText,
          questionMappings: item.questionMappings,
          results: {
            docentes: await calculateFrequencies('docentes_form_submissions', item.questionMappings.docentes, sectionKey, school),
            estudiantes: await calculateFrequencies('estudiantes_form_submissions', item.questionMappings.estudiantes, sectionKey, school),
            acudientes: await calculateFrequencies('acudientes_form_submissions', item.questionMappings.acudientes, sectionKey, school)
          }
        };
        sectionData.questions.push(gridItem);
      }

      results.push(sectionData);
    }

    console.log('Sending response with data:', results);
    res.json(results);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add new types for monitoring
interface SchoolMonitoringData {
  schoolName: string;
  rectorName: string;
  currentPosition: string;
  personalEmail: string;
  institutionalEmail: string;
  personalPhone: string;
  institutionalPhone: string;
  preferredContact: string;
  submissions: {
    docentes: number;
    estudiantes: number;
    acudientes: number;
  };
  meetingRequirements: boolean;
}

// Add new endpoint for monitoring data
app.get('/api/monitoring', async (req, res) => {
  try {
    // Get all unique schools and rector contact information from rectores table
    const schoolsQuery = `
      SELECT DISTINCT 
        "nombre_de_la_institucion_educativa_en_la_actualmente_desempena_" as school_name,
        nombre_s_y_apellido_s_completo_s as rector_name,
        cargo_actual as current_position,
        correo_electronico_personal as personal_email,
        correo_electronico_institucional_el_que_usted_usa_en_su_rol_com as institutional_email,
        numero_de_celular_personal as personal_phone,
        telefono_de_contacto_de_la_ie as institutional_phone,
        prefiere_recibir_comunicaciones_en_el_correo as preferred_contact
      FROM rectores
    `;
    console.log('Executing schools query:', schoolsQuery);
    const schoolsResult = await pool.query(schoolsQuery);
    
    console.log('\n=== Raw Database Results ===');
    schoolsResult.rows.forEach((row, index) => {
      console.log(`\nSchool ${index + 1}:`, {
        school_name: row.school_name,
        cargo_actual: row.cargo_actual,
        current_position: row.current_position
      });
    });

    const monitoringData: SchoolMonitoringData[] = await Promise.all(
      schoolsResult.rows.map(async (school) => {
        console.log('\n=== Processing School ===');
        console.log('Raw school data:', {
          school_name: school.school_name,
          cargo_actual: school.cargo_actual,
          current_position: school.current_position
        });

        const docentesQuery = `
          SELECT COUNT(*) as count 
          FROM docentes_form_submissions 
          WHERE institucion_educativa = $1
        `;
        
        const counts = await Promise.all([
          pool.query(docentesQuery, [school.school_name]),
          pool.query(`
            SELECT COUNT(*) as count 
            FROM estudiantes_form_submissions 
            WHERE institucion_educativa = $1
          `, [school.school_name]),
          pool.query(`
            SELECT COUNT(*) as count 
            FROM acudientes_form_submissions 
            WHERE institucion_educativa = $1
          `, [school.school_name])
        ]);

        const submissions = {
          docentes: parseInt(counts[0].rows[0].count),
          estudiantes: parseInt(counts[1].rows[0].count),
          acudientes: parseInt(counts[2].rows[0].count)
        };

        const mappedData = {
          schoolName: school.school_name,
          rectorName: school.rector_name,
          currentPosition: school.cargo_actual || 'Rector',
          personalEmail: school.personal_email,
          institutionalEmail: school.institutional_email,
          personalPhone: school.personal_phone,
          institutionalPhone: school.institutional_phone,
          preferredContact: school.preferred_contact,
          submissions,
          meetingRequirements: 
            submissions.docentes >= 25 && 
            submissions.estudiantes >= 25 && 
            submissions.acudientes >= 25
        };

        console.log('Mapped data:', mappedData);
        return mappedData;
      })
    );

    res.json(monitoringData);
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        // @ts-ignore
        position: error.position,
        // @ts-ignore
        detail: error.detail,
        // @ts-ignore
        hint: error.hint
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add interfaces for chart data
interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface BarChartData {
  label: string;
  value: number;
  color: string;
}

// Extend PDFKit types
interface CustomPDFKit extends PDFKit.PDFDocument {
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): this;
}

app.get('/api/generate-pdf', async (req, res) => {
  try {
    const school = req.query.school as string | undefined;
    
    if (!school) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'School parameter is required'
      });
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=frequency-report-${encodeURIComponent(school)}.pdf`);
    
    // Generate PDF document using the new modular approach
    const doc = await generatePDF(school);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to get frequency data
async function getFrequencyData(school?: string): Promise<FrequencyData[]> {
  const results: FrequencyData[] = [];

  for (const [sectionKey, section] of Object.entries(sections)) {
    const sectionData: FrequencyData = {
      title: section.title,
      questions: []
    };

    for (const item of section.items) {
      const gridItem: GridItem = {
        displayText: item.displayText,
        questionMappings: item.questionMappings,
        results: {
          docentes: await calculateFrequencies('docentes_form_submissions', item.questionMappings.docentes, sectionKey, school),
          estudiantes: await calculateFrequencies('estudiantes_form_submissions', item.questionMappings.estudiantes, sectionKey, school),
          acudientes: await calculateFrequencies('acudientes_form_submissions', item.questionMappings.acudientes, sectionKey, school)
        }
      };
      sectionData.questions.push(gridItem);
    }

    results.push(sectionData);
  }

  return results;
}

// Add new helper function to get entidad_territorial
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

// Add new helper function to get docentes count
async function getDocentesCount(school: string): Promise<number> {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM docentes_form_submissions
      WHERE institucion_educativa = $1
    `;
    const result = await pool.query(query, [school]);
    return parseInt(result.rows[0]?.count) || 0;
  } catch (error) {
    console.error('Error fetching docentes count:', error);
    return 0;
  }
}

// Add helper function for acudientes count (add this near the other helper functions)
async function getAcudientesCount(school: string): Promise<number> {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM acudientes_form_submissions
      WHERE institucion_educativa = $1
    `;
    const result = await pool.query(query, [school]);
    return parseInt(result.rows[0]?.count) || 0;
  } catch (error) {
    console.error('Error fetching acudientes count:', error);
    return 0;
  }
}

// Function to draw a pie chart
function drawPieChart(
  doc: CustomPDFKit,
  data: PieChartData[],
  centerX: number,
  centerY: number,
  radius: number,
  title: string,
  isFirstChart: boolean = false,
  legendBelow: boolean = false,
  multiLineLegend: boolean = false
) {
  try {
    let currentAngle = 0;
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Draw title
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('black')  // Set color to black
       .text(title, centerX - radius, centerY - radius - 25, {
         width: radius * 2,
         align: 'center'
       });

    // Draw pie segments
    data.forEach(item => {
      const segmentAngle = (item.value / total) * 2 * Math.PI;
      
      // Draw segment
      doc.save()
         .moveTo(centerX, centerY)
         .arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle)
         .lineTo(centerX, centerY)
         .fillColor(item.color)
         .fill();
      
      doc.restore();
      currentAngle += segmentAngle;
    });

    // Add legend
    const legendBoxSize = 8;
    const legendTextPadding = 5;
    let legendX: number;
    let legendY: number;

    if (legendBelow) {
      // Place legend below the chart
      legendX = multiLineLegend ? 
        (centerX - radius - 30) :  // Original position for pie chart 3's legend
        (centerX - radius + 12);   // Reduced from +30 to +15 to move legend more left
      legendY = centerY + radius + 10;  // 10 points padding below chart
      
      if (multiLineLegend) {
        // Calculate items per row (3 rows for grades)
        const itemsPerRow = Math.ceil(data.length / 3);
        const rowSpacing = 15;  // Space between rows
        
        data.forEach((item, index) => {
          const row = Math.floor(index / itemsPerRow);
          const col = index % itemsPerRow;
          const currentX = legendX + (col * 60);  // Keep 60 points spacing between items
          const currentY = legendY + (row * rowSpacing);  // 15 points between rows

          // Color box
          doc.rect(currentX, currentY, legendBoxSize, legendBoxSize)
             .fillColor(item.color)
             .fill();

          // Label
          doc.fillColor('black')
             .fontSize(8)
             .font('Helvetica')
             .text(item.label,
               currentX + legendBoxSize + legendTextPadding,
               currentY,
               {
                 width: 45,
                 align: 'left'
               });
        });
      } else {
        // Two-line layout for schedule pie chart
        const itemsPerRow = Math.ceil(data.length / 2);  // Split items into 2 rows
        const rowSpacing = 15;  // Space between rows
        
        data.forEach((item, index) => {
          const row = Math.floor(index / itemsPerRow);
          const col = index % itemsPerRow;
          const currentX = legendX + (col * 60);  // Keep 60 points spacing between items
          const currentY = legendY + (row * rowSpacing);  // 15 points between rows

          // Color box
          doc.rect(currentX, currentY, legendBoxSize, legendBoxSize)
             .fillColor(item.color)
             .fill();

          // Label
          doc.fillColor('black')
             .fontSize(8)
             .font('Helvetica')
             .text(item.label,
               currentX + legendBoxSize + legendTextPadding,
               currentY,
               {
                 width: 45,
                 align: 'left'
               });
        });
      }
    } else {
      // Original right-side legend placement
      legendX = centerX + radius + 20;
      legendY = centerY - radius;
      
      data.forEach(item => {
        // Color box
        doc.rect(legendX, legendY, legendBoxSize, legendBoxSize)
           .fillColor(item.color)
           .fill();

        // Label
        doc.fillColor('black')
           .fontSize(8)
           .font('Helvetica')
           .text(item.label,
             legendX + legendBoxSize + legendTextPadding,
             legendY,
             {
               width: 80,
               align: 'left'
             });

        legendY += legendBoxSize + 10;
      });
    }
  } catch (error) {
    console.error('Error drawing pie chart:', error);
  }
}

// Function to draw a bar chart
function drawBarChart(
  doc: CustomPDFKit,
  data: BarChartData[],
  startX: number,
  startY: number,
  width: number,
  height: number,
  title: string,
  isHorizontal: boolean = true
) {
  try {
    // Adjust padding based on whether it's the feedback chart (which needs more label space)
    const isFeedbackChart = title.includes('retroalimentación');
    const padding = { 
      top: 35,  // Increased from 25 to 35 to add more space between title and chart
      right: 10, 
      bottom: 30, 
      left: isFeedbackChart ? 100 : 60
    };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...data.map(d => d.value));
    
    // Draw title with more space between it and the chart
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text(title, startX, startY + 5, {  // Keep startY + 5 to maintain position below line
         width: width,
         align: 'center'
       });

    if (isHorizontal) {
      // Draw horizontal bars with adjusted starting position
      const barHeight = Math.min(15, (chartHeight - (data.length - 1) * 5) / data.length);
      const barSpacing = barHeight + 5;

      data.forEach((item, index) => {
        const barWidth = (item.value / maxValue) * chartWidth;
        const barY = startY + padding.top + index * barSpacing;  // This will now start lower due to increased padding
        const barX = startX + padding.left;

        // Draw label with more space and no text wrapping for feedback chart
        doc.fontSize(8)
           .fillColor('black')
           .text(item.label, 
                startX + 5, 
                barY + (barHeight / 2) - 4,
                { 
                  width: padding.left - 10, 
                  align: 'right',
                  lineBreak: !isFeedbackChart  // Disable line breaks for feedback chart
                });

        // Draw bar
        doc.rect(barX, barY, barWidth, barHeight)
           .fillColor(item.color)
           .fill();

        // Draw value
        if (item.value > 0) {
          doc.fontSize(8)
             .fillColor('black')
             .text(item.value.toString(),
                  barX + barWidth + 5,
                  barY + (barHeight / 2) - 4);
        }
      });
    } else {
      // Vertical bars implementation remains unchanged
      const barWidth = (width - (data.length + 1) * 5) / data.length;
      
      data.forEach((item, index) => {
        const barHeight = (item.value / maxValue) * (height - 40);
        const barX = startX + 5 + index * (barWidth + 5);
        const barY = startY + (height - 40) - barHeight;

        doc.rect(barX, barY, barWidth, barHeight)
           .fillColor(item.color)
           .fill();

        doc.fontSize(8)
           .fillColor('black')
           .text(item.label, barX, startY + height - 35, {
             width: barWidth,
             align: 'center'
           });

        doc.fontSize(8)
           .text(item.value.toString(), barX, barY - 10, {
             width: barWidth,
             align: 'center'
           });
      });
    }
  } catch (error) {
    console.error('Error drawing bar chart:', error);
  }
}

// Add helper functions to get chart data
async function getGradesDistribution(school: string): Promise<PieChartData[]> {
  try {
    console.log('getGradesDistribution called with school:', school);
    
    // First, verify the school exists
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM docentes_form_submissions
      WHERE institucion_educativa = $1;
    `;
    
    const verifyResult = await pool.query(verifyQuery, [decodeURIComponent(school)]);
    console.log('School verification result:', verifyResult.rows[0]);
    
    if (verifyResult.rows[0].count === 0) {
      console.log('No data found for school:', school);
      throw new Error(`No data found for school: ${school}`);
    }

    const query = `
      WITH RECURSIVE 
      all_categories(category) AS (
        VALUES ('Preescolar'), ('Primaria'), ('Secundaria'), ('Media')
      ),
      grade_data AS (
        SELECT 
          d.institucion_educativa,
          TRIM(REGEXP_REPLACE(REGEXP_REPLACE(unnest(d.grados_asignados), '[°|º]', '', 'g'), '\\s+', '', 'g')) as clean_grade
        FROM docentes_form_submissions d
        WHERE d.institucion_educativa = $1
      ),
      grade_counts AS (
        SELECT
          CASE 
            WHEN clean_grade ILIKE ANY(ARRAY['preescolar', 'primerainfancia', 'primera infancia']) THEN 'Preescolar'
            WHEN clean_grade ~ '^[1-5]$' THEN 'Primaria'
            WHEN clean_grade ~ '^[6-9]$' THEN 'Secundaria'
            WHEN clean_grade ~ '^1[0-1]$' THEN 'Media'
            ELSE 'Otros'
          END as category,
          COUNT(*) as count
        FROM grade_data
        GROUP BY category
      )
      SELECT 
        ac.category,
        COALESCE(gc.count, 0)::integer as count
      FROM all_categories ac
      LEFT JOIN grade_counts gc ON ac.category = gc.category
      ORDER BY 
        CASE ac.category
          WHEN 'Preescolar' THEN 1
          WHEN 'Primaria' THEN 2
          WHEN 'Secundaria' THEN 3
          WHEN 'Media' THEN 4
          ELSE 5
        END;
    `;

    console.log('Executing grades distribution query...');
    const result = await pool.query(query, [decodeURIComponent(school)]);
    console.log('Raw grades distribution result:', result.rows);

    // Define colors for each category
    const categoryConfig: { [key: string]: { color: string, label: string } } = {
      'Preescolar': { color: '#FF9F40', label: 'Preescolar' },  // Warm Orange
      'Primaria': { color: '#4B89DC', label: 'Primaria' },      // Royal Blue
      'Secundaria': { color: '#37BC9B', label: 'Secundaria' },  // Mint Green
      'Media': { color: '#967ADC', label: 'Media' }             // Purple
    };

    const total = result.rows.reduce((sum, row) => sum + row.count, 0);
    console.log('Total count:', total);

    if (total === 0) {
      console.log('No grades data found for school:', school);
      return [
        { label: 'No hay datos', value: 1, color: '#CCCCCC' }
      ];
    }

    // Transform the data and calculate percentages
    const chartData = result.rows.map(row => {
      console.log(`Processing category ${row.category}: count=${row.count}`);
      
      // Normalize the grade format to handle both ° and º symbols
      const normalizedGrade = row.category.replace(/[°º]/g, 'º');
      console.log('Normalized grade:', normalizedGrade);
      
      const color = categoryConfig[normalizedGrade]?.color;
      console.log(`Color lookup for ${row.category}:`, {
        original: row.category,
        normalized: normalizedGrade,
        hasMapping: normalizedGrade in categoryConfig,
        color: color || '#000000'
      });
      
      return {
        label: categoryConfig[normalizedGrade].label,
        value: row.count,
        color: color || '#000000'
      };
    });

    console.log('Final chart data:', chartData);
    return chartData;
  } catch (error) {
    console.error('Error in getGradesDistribution:', error);
    // Return a single "Error" segment instead of empty data
    return [
      { label: 'Error al cargar datos', value: 1, color: '#FF0000' }
    ];
  }
}

async function getScheduleDistribution(school: string): Promise<PieChartData[]> {
  try {
    const query = `
      SELECT 
        jornada as schedule,
        COUNT(*) as count
      FROM docentes_form_submissions
      WHERE institucion_educativa = $1
      GROUP BY jornada
      ORDER BY jornada;
    `;
    
    const result = await pool.query(query, [school]);
    console.log('Raw schedule data:', JSON.stringify(result.rows, null, 2));
    
    // Map schedules to proper labels and colors with completely distinct colors
    const scheduleMapping: Record<string, { label: string; color: string }> = {
      'MANANA': { label: 'Mañana', color: '#D55E00' },    // Dark Orange
      'MAÑANA': { label: 'Mañana', color: '#D55E00' },    // Dark Orange (alternative spelling)
      'Manana': { label: 'Mañana', color: '#D55E00' },    // Dark Orange (alternative case)
      'Mañana': { label: 'Mañana', color: '#D55E00' },    // Dark Orange (alternative case)
      'TARDE': { label: 'Tarde', color: '#0072B2' },      // Strong Blue
      'Tarde': { label: 'Tarde', color: '#0072B2' },      // Strong Blue (alternative case)
      'NOCHE': { label: 'Noche', color: '#548235' },      // Forest Green
      'Noche': { label: 'Noche', color: '#548235' },      // Forest Green (alternative case)
      'UNICA': { label: 'Única', color: '#7030A0' },      // Purple
      'ÚNICA': { label: 'Única', color: '#7030A0' },      // Purple (alternative spelling)
      'Unica': { label: 'Única', color: '#7030A0' },      // Purple (alternative case)
      'Única': { label: 'Única', color: '#7030A0' }       // Purple (alternative case)
    };

    const chartData = result.rows.map(row => {
      // Debug log to see exact value from database
      console.log('Processing schedule value:', {
        raw: row.schedule,
        mapped: scheduleMapping[row.schedule],
        exists: row.schedule in scheduleMapping
      });
      
      return {
        label: scheduleMapping[row.schedule]?.label || row.schedule,  // Simple label without percentage
        value: parseInt(row.count),
        color: scheduleMapping[row.schedule]?.color || '#000000'
      };
    });

    // If no data was found, return default data
    if (chartData.length === 0) {
      return [
        { label: 'Mañana', value: 0, color: '#D55E00' },
        { label: 'Tarde', value: 0, color: '#0072B2' },
        { label: 'Noche', value: 0, color: '#548235' },
        { label: 'Única', value: 0, color: '#7030A0' }
      ];
    }

    // Calculate total for percentage (only used for pie segments)
    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    console.log('Final schedule chart data:', JSON.stringify(chartData, null, 2));
    return chartData;
  } catch (error) {
    console.error('Error fetching schedule distribution:', error);
    // Return default data if query fails
    return [
      { label: 'Mañana', value: 0, color: '#D55E00' },
      { label: 'Tarde', value: 0, color: '#0072B2' },
      { label: 'Noche', value: 0, color: '#548235' },
      { label: 'Única', value: 0, color: '#7030A0' }
    ];
  }
}

// Add a test endpoint to see the grades distribution data
app.get('/api/test-grades', async (req, res) => {
  try {
    const school = req.query.school as string;
    if (!school) {
      console.log('Missing school parameter');
      return res.status(400).json({ error: 'School parameter is required' });
    }
    
    // Log all available schools first
    const schoolsQuery = `
      SELECT DISTINCT institucion_educativa 
      FROM docentes_form_submissions;
    `;
    
    const schoolsResult = await pool.query(schoolsQuery);
    console.log('Available schools:', schoolsResult.rows.map(row => row.institucion_educativa));
    
    // Decode the school name and normalize it
    const decodedSchool = decodeURIComponent(school).normalize('NFC');
    console.log('Processing request for school:', {
      original: school,
      decoded: decodedSchool,
      length: decodedSchool.length,
      codePoints: Array.from(decodedSchool).map(char => char.codePointAt(0)?.toString(16))
    });
    
    // First get raw data to debug
    const rawQuery = `
      SELECT grados_asignados, institucion_educativa 
      FROM docentes_form_submissions 
      WHERE institucion_educativa = $1
      LIMIT 5;
    `;
    
    const rawResult = await pool.query(rawQuery, [decodedSchool]);
    console.log('Raw query results:', JSON.stringify(rawResult.rows, null, 2));
    
    if (rawResult.rows.length === 0) {
      console.log('No data found for school:', decodedSchool);
      return res.status(404).json({ 
        error: 'No data found for this school',
        debug: {
          availableSchools: schoolsResult.rows.map(row => row.institucion_educativa),
          requestedSchool: decodedSchool
        }
      });
    }
    
    const data = await getGradesDistribution(decodedSchool);
    res.json({
      school: decodedSchool,
      data,
      debug: {
        rawData: rawResult.rows,
        availableSchools: schoolsResult.rows.map(row => row.institucion_educativa)
      }
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 

// Add helper function for grados_estudiantes distribution
async function getGradosEstudiantesDistribution(school: string): Promise<PieChartData[]> {
  try {
    const query = `
      WITH grade_data AS (
        SELECT 
          unnest(grados_estudiantes) as grade
        FROM acudientes_form_submissions
        WHERE institucion_educativa = $1
      )
      SELECT 
        grade as category,
        COUNT(*) as count
      FROM grade_data
      GROUP BY grade
      ORDER BY 
        CASE grade
          WHEN 'Preescolar' THEN 0
          WHEN 'Primera infancia' THEN 0
          ELSE CAST(REGEXP_REPLACE(grade, '[^0-9]', '', 'g') AS INTEGER)
        END;
    `;

    const result = await pool.query(query, [school]);

    // Define colors for each grade
    const gradeColors: Record<string, string> = {
      'Preescolar': '#FF9F40',      // Warm Orange
      'Primera infancia': '#FF9F40', // Same as Preescolar
      '1': '#4472C4',               // Blue
      '2': '#ED7D31',               // Orange
      '3': '#A5A5A5',               // Gray
      '4': '#FFC000',               // Yellow
      '5': '#5B9BD5',               // Light Blue
      '6': '#70AD47',               // Green
      '7': '#264478',               // Dark Blue
      '8': '#9E480E',               // Dark Orange
      '9': '#636363',               // Dark Gray
      '10': '#997300',              // Dark Yellow
      '11': '#2F5597',              // Dark Blue
      '12': '#385723'               // Dark Green
    };

    // Transform the data
    const chartData = result.rows.map(row => {
      const grade = row.category;
      const label = grade === 'Preescolar' || grade === 'Primera infancia' ? grade : `Grado ${grade}`;
      return {
        label: label,
        value: parseInt(row.count),
        color: gradeColors[grade] || '#CCCCCC'
      };
    });

    // Return default data if no results
    if (chartData.length === 0) {
      return [
        { label: 'Preescolar', value: 0, color: '#FF9F40' },
        { label: 'Grado 1', value: 0, color: '#4472C4' },
        { label: 'Grado 2', value: 0, color: '#ED7D31' },
        { label: 'Grado 3', value: 0, color: '#A5A5A5' },
        { label: 'Grado 4', value: 0, color: '#FFC000' },
        { label: 'Grado 5', value: 0, color: '#5B9BD5' },
        { label: 'Grado 6', value: 0, color: '#70AD47' },
        { label: 'Grado 7', value: 0, color: '#264478' },
        { label: 'Grado 8', value: 0, color: '#9E480E' },
        { label: 'Grado 9', value: 0, color: '#636363' },
        { label: 'Grado 10', value: 0, color: '#997300' },
        { label: 'Grado 11', value: 0, color: '#2F5597' },
        { label: 'Grado 12', value: 0, color: '#385723' }
      ];
    }

    return chartData;
  } catch (error) {
    console.error('Error in getGradosEstudiantesDistribution:', error);
    return [
      { label: 'Preescolar', value: 0, color: '#FF9F40' },
      { label: 'Grado 1', value: 0, color: '#4472C4' },
      { label: 'Grado 2', value: 0, color: '#ED7D31' },
      { label: 'Grado 3', value: 0, color: '#A5A5A5' },
      { label: 'Grado 4', value: 0, color: '#FFC000' },
      { label: 'Grado 5', value: 0, color: '#5B9BD5' },
      { label: 'Grado 6', value: 0, color: '#70AD47' },
      { label: 'Grado 7', value: 0, color: '#264478' },
      { label: 'Grado 8', value: 0, color: '#9E480E' },
      { label: 'Grado 9', value: 0, color: '#636363' },
      { label: 'Grado 10', value: 0, color: '#997300' },
      { label: 'Grado 11', value: 0, color: '#2F5597' },
      { label: 'Grado 12', value: 0, color: '#385723' }
    ];
  }
} 

// Add helper functions for estudiantes charts
async function getGradesDistributionForEstudiantes(school: string): Promise<PieChartData[]> {
  try {
    const query = `
      SELECT 
        grado_actual as category,
        COUNT(*) as count
      FROM estudiantes_form_submissions
      WHERE institucion_educativa = $1
      GROUP BY grado_actual
      ORDER BY CAST(REPLACE(REPLACE(grado_actual, '°', ''), 'º', '') AS INTEGER);
    `;
    console.log('Executing grades distribution query for estudiantes:', query);
    const result = await pool.query(query, [school]);
    console.log('Raw grades distribution result:', result.rows);
    // Define colors for each grade
    const gradeColors: { [key: string]: string } = {
      '5': '#4472C4', // Blue
      '6': '#ED7D31', // Orange
      '7': '#A5A5A5', // Gray
      '8': '#FFC000', // Yellow
      '9': '#5B9BD5', // Light Blue
      '10': '#70AD47', // Green
      '11': '#7030A0', // Purple
      '12': '#C00000' // Dark Red
    };

    // Map grade numbers to Spanish names
    const gradeNames: { [key: string]: string } = {
      '5': 'Quinto',
      '6': 'Sexto',
      '7': 'Séptimo',
      '8': 'Octavo',
      '9': 'Noveno',
      '10': 'Décimo',
      '11': 'Undécimo',
      '12': 'Duodécimo'
    };

    const total = result.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0);
    console.log('Total count:', total);
    const chartData = result.rows.map((row: any) => {
      const grade = row.category.replace('°', '').replace('º', '');
      return {
        label: gradeNames[grade] || grade,
        value: parseInt(row.count),
        color: gradeColors[grade] || '#000000'
      };
    });
    console.log('Final chart data:', chartData);
    return chartData;
  }
  catch (error) {
    console.error('Error in getGradesDistributionForEstudiantes:', error);
    return [];
  }
}

async function getScheduleDistributionForEstudiantes(school: string): Promise<PieChartData[]> {
  try {
    const query = `
      SELECT 
        jornada as schedule,
        COUNT(*) as count
      FROM estudiantes_form_submissions
      WHERE institucion_educativa = $1
      GROUP BY jornada
      ORDER BY jornada;
    `;
    
    const result = await pool.query(query, [school]);
    
    const scheduleMapping: Record<string, { label: string; color: string }> = {
      'MANANA': { label: 'Mañana', color: '#D55E00' },
      'MAÑANA': { label: 'Mañana', color: '#D55E00' },
      'Manana': { label: 'Mañana', color: '#D55E00' },
      'Mañana': { label: 'Mañana', color: '#D55E00' },
      'TARDE': { label: 'Tarde', color: '#0072B2' },
      'Tarde': { label: 'Tarde', color: '#0072B2' },
      'NOCHE': { label: 'Noche', color: '#548235' },
      'Noche': { label: 'Noche', color: '#548235' },
      'UNICA': { label: 'Única', color: '#7030A0' },
      'ÚNICA': { label: 'Única', color: '#7030A0' },
      'Unica': { label: 'Única', color: '#7030A0' },
      'Única': { label: 'Única', color: '#7030A0' }
    };

    const chartData = result.rows.map(row => {
      return {
        label: scheduleMapping[row.schedule]?.label || row.schedule,
        value: parseInt(row.count),
        color: scheduleMapping[row.schedule]?.color || '#000000'
      };
    });

    if (chartData.length === 0) {
      return [
        { label: 'Mañana', value: 0, color: '#D55E00' },
        { label: 'Tarde', value: 0, color: '#0072B2' },
        { label: 'Noche', value: 0, color: '#548235' },
        { label: 'Única', value: 0, color: '#7030A0' }
      ];
    }

    return chartData;
  } catch (error) {
    console.error('Error fetching schedule distribution for estudiantes:', error);
    return [
      { label: 'Mañana', value: 0, color: '#D55E00' },
      { label: 'Tarde', value: 0, color: '#0072B2' },
      { label: 'Noche', value: 0, color: '#548235' },
      { label: 'Única', value: 0, color: '#7030A0' }
    ];
  }
} 

// Add a new endpoint to generate PDFs for all schools
app.get('/api/generate-all-pdfs', async (req, res) => {
  try {
    // Get the list of all schools
    const schoolsQuery = `
      SELECT DISTINCT 
        "nombre_de_la_institucion_educativa_en_la_actualmente_desempena_" as school_name
      FROM rectores
      ORDER BY school_name
    `;
    
    const schoolsResult = await pool.query(schoolsQuery);
    const schools = schoolsResult.rows.map(row => row.school_name);
    
    console.log(`Generating PDFs for ${schools.length} schools`);
    
    // Create a zip file to contain all PDFs
    const archiver = require('archiver');
    
    // Set response headers for a zip file
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=all-frequency-reports.zip');
    
    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Highest compression level
    });
    
    // Pipe the archive to the response
    archive.pipe(res);
    
    // Generate a PDF for each school and add it to the archive
    for (const school of schools) {
      try {
        console.log(`Generating PDF for school: ${school}`);
        const doc = await generatePDF(school);
        
        // Convert PDF to a buffer
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        
        // When PDF generation is complete, add it to the archive
        await new Promise<void>((resolve, reject) => {
          doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            const safeSchoolName = school.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            
            // Add the PDF to the archive
            archive.append(pdfBuffer, { name: `frequency-report-${safeSchoolName}.pdf` });
            console.log(`Added ${school} PDF to archive`);
            resolve();
          });
          
          doc.on('error', (err) => {
            console.error(`Error generating PDF for school ${school}:`, err);
            reject(err);
          });
          
          // Finalize the PDF
          doc.end();
        });
      } catch (schoolError) {
        console.error(`Error processing school ${school}:`, schoolError);
        // Continue with other schools even if one fails
      }
    }
    
    // Finalize the archive
    await archive.finalize();
    console.log('All PDFs generated and archived successfully');
    
  } catch (error) {
    console.error('Error generating all PDFs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 

// Add debug endpoint for grados_asignados
app.get('/api/debug-grades', async (req, res) => {
  try {
    const school = req.query.school as string;
    if (!school) {
      return res.status(400).json({ error: 'School parameter is required' });
    }

    const query = `
      SELECT grados_asignados
      FROM docentes_form_submissions
      WHERE institucion_educativa = $1;
    `;

    const result = await pool.query(query, [school]);
    console.log('Raw grados_asignados data:', JSON.stringify(result.rows, null, 2));

    res.json({
      school,
      rawData: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 

// Add endpoint for estudiantes grades
app.get('/api/estudiantes-grades', async (req, res) => {
  try {
    const school = req.query.school as string;
    if (!school) {
      console.log('Missing school parameter');
      return res.status(400).json({ error: 'School parameter is required' });
    }
    
    console.log('Getting grades distribution for school:', school);
    const data = await getGradesDistributionForEstudiantes(decodeURIComponent(school));
    console.log('Grades distribution data:', JSON.stringify(data, null, 2));
    
    res.json({
      school: decodeURIComponent(school),
      data,
      debug: {
        school: decodeURIComponent(school),
        rawData: data
      }
    });
  } catch (error) {
    console.error('Error in estudiantes-grades endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 