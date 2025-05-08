import { CustomPDFKit, addHeader, PieChartData, drawPieChart as drawPieChartUtil, drawBarChart, BarChartData } from './pdfUtils';
import { pool } from '../db';
import PDFDocument from 'pdfkit';

// Helper function to get docentes count
async function getDocentesCount(school: string): Promise<number> {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM docentes_form_submissions
      WHERE institucion_educativa = $1;
    `;
    const result = await pool.query(query, [school]);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting docentes count:', error);
    return 0;
  }
}

// Helper function to get estudiantes count
async function getEstudiantesCount(school: string): Promise<number> {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM estudiantes_form_submissions
      WHERE institucion_educativa = $1
    `;
    const result = await pool.query(query, [school]);
    return parseInt(result.rows[0]?.count) || 0;
  } catch (error) {
    console.error('Error fetching estudiantes count:', error);
    return 0;
  }
}

// Helper function for acudientes count
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

// Helper function to get grades distribution for docentes
async function getGradesDistribution(school: string): Promise<PieChartData[]> {
  try {
    console.log('getGradesDistribution called with school:', school);
    
    // First, verify the school exists
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM docentes_form_submissions
      WHERE institucion_educativa = $1;
    `;
    
    const verifyResult = await pool.query(verifyQuery, [school]);
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
    const result = await pool.query(query, [school]);
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
      const percentage = ((row.count / total) * 100).toFixed(1);
      console.log(`Processing category ${row.category}: count=${row.count}, percentage=${percentage}%`);
      return {
        label: `${categoryConfig[row.category].label}`,
        value: row.count,
        color: categoryConfig[row.category].color
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

// Helper function to get schedule distribution for docentes
async function getScheduleDistribution(school: string): Promise<PieChartData[]> {
  try {
    // Updated query to handle jornada as an array
    const query = `
      WITH jornada_data AS (
        SELECT 
          unnest(jornada) as schedule
        FROM docentes_form_submissions
        WHERE institucion_educativa = $1
      )
      SELECT 
        schedule,
        COUNT(*) as count
      FROM jornada_data
      GROUP BY schedule
      ORDER BY schedule;
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

// Helper functions for estudiantes charts
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
    const gradeColors: Record<string, string> = {
      '5': '#4472C4',  // Blue
      '6': '#ED7D31',  // Orange
      '7': '#A5A5A5',  // Gray
      '8': '#FFC000',  // Yellow
      '9': '#5B9BD5',  // Light Blue
      '10': '#70AD47', // Green
      '11': '#7030A0', // Purple
      '12': '#C00000'  // Dark Red
    };

    // Map grade numbers to Spanish names
    const gradeNames: Record<string, string> = {
      '5': 'Quinto',
      '6': 'Sexto',
      '7': 'Séptimo',
      '8': 'Octavo',
      '9': 'Noveno',
      '10': 'Décimo',
      '11': 'Undécimo',
      '12': 'Duodécimo'
    };

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    console.log('Total count:', total);

    const chartData = result.rows.map(row => {
      const grade = row.category.replace('°', '').replace('º', '');
      return {
        label: gradeNames[grade] || grade,
        value: parseInt(row.count),
        color: gradeColors[grade] || '#000000'
      };
    });

    console.log('Final chart data:', chartData);
    return chartData;
  } catch (error) {
    console.error('Error in getGradesDistributionForEstudiantes:', error);
    return [
      { label: 'Quinto', value: 0, color: '#4472C4' },
      { label: 'Sexto', value: 0, color: '#ED7D31' },
      { label: 'Séptimo', value: 0, color: '#A5A5A5' },
      { label: 'Octavo', value: 0, color: '#FFC000' },
      { label: 'Noveno', value: 0, color: '#5B9BD5' },
      { label: 'Décimo', value: 0, color: '#70AD47' },
      { label: 'Undécimo', value: 0, color: '#7030A0' },
      { label: 'Duodécimo', value: 0, color: '#C00000' }
    ];
  }
}

// Helper function for estudiantes schedule distribution
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

// Helper function for grados_estudiantes distribution (for acudientes)
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
      HAVING COUNT(*) > 0  -- Only include grades with data
      ORDER BY 
        CASE grade
          WHEN 'Preescolar' THEN 0
          WHEN 'Primera infancia' THEN 0
          ELSE CAST(REGEXP_REPLACE(grade, '[^0-9]', '', 'g') AS INTEGER)
        END;
    `;

    const result = await pool.query(query, [school]);

    // Define colors for each grade
    const gradeColors: { [key: string]: string } = {
      'Preescolar': '#FF9F40',      // Warm Orange
      'Primera infancia': '#FF9F40', // Same as Preescolar
      '1': '#4472C4',               // Blue
      '1°': '#4472C4',              // Blue (with degree symbol)
      '2': '#ED7D31',               // Orange
      '2°': '#ED7D31',              // Orange (with degree symbol)
      '3': '#A5A5A5',               // Gray
      '3°': '#A5A5A5',              // Gray (with degree symbol)
      '4': '#FFC000',               // Yellow
      '4°': '#FFC000',              // Yellow (with degree symbol)
      '5': '#5B9BD5',               // Light Blue
      '5°': '#5B9BD5',              // Light Blue (with degree symbol)
      '6': '#70AD47',               // Green
      '6°': '#70AD47',              // Green (with degree symbol)
      '7': '#264478',               // Dark Blue
      '7°': '#264478',              // Dark Blue (with degree symbol)
      '8': '#9E480E',               // Dark Orange
      '8°': '#9E480E',              // Dark Orange (with degree symbol)
      '9': '#636363',               // Dark Gray
      '9°': '#636363',              // Dark Gray (with degree symbol)
      '10': '#997300',              // Dark Yellow
      '10°': '#997300',             // Dark Yellow (with degree symbol)
      '11': '#2F5597',              // Dark Blue
      '11°': '#2F5597',             // Dark Blue (with degree symbol)
      '12': '#385723',              // Dark Green
      '12°': '#385723'              // Dark Green (with degree symbol)
    };

    // Transform the data
    const chartData = result.rows.map(row => {
      const grade = row.category;
      const label = grade === 'Preescolar' || grade === 'Primera infancia' ? grade : `Grado ${grade}`;
      const color = gradeColors[grade] || '#CCCCCC';  // Use default gray only if grade not found
      console.log(`Processing grade ${grade}: color=${color}`);  // Debug log
      return {
        label: label,
        value: parseInt(row.count),
        color: color
      };
    });

    // Return empty array if no results
    if (chartData.length === 0) {
      return [];
    }

    console.log('Final chart data:', chartData);  // Debug log
    return chartData;
  } catch (error) {
    console.error('Error in getGradosEstudiantesDistribution:', error);
    return [];
  }
}

// Add new function to get years distribution
async function getYearsDistribution(school: string): Promise<BarChartData[]> {
  try {
    console.log('Fetching years distribution for school:', school);
    
    const query = `
      SELECT 
        anos_como_docente as year_range,
        COUNT(*) as count
      FROM docentes_form_submissions
      WHERE institucion_educativa = $1
      GROUP BY anos_como_docente
      ORDER BY 
        CASE anos_como_docente
          WHEN 'Menos de 1' THEN 1
          WHEN '1' THEN 2
          WHEN '2' THEN 3
          WHEN '3' THEN 4
          WHEN '4' THEN 5
          WHEN '5' THEN 6
          WHEN 'Más de 5' THEN 7
          ELSE 8
        END;
    `;

    // Log the raw query
    console.log('Executing query:', query.replace(/\s+/g, ' '));
    console.log('With school parameter:', school);

    const result = await pool.query(query, [school]);
    console.log('Years distribution raw data:', result.rows);

    // Define the mapping from database values to display labels
    const labelMapping: Record<string, string> = {
      'Menos de 1': 'Menos de 1',
      '1': '1 año',
      '2': '2 años',
      '3': '3 años',
      '4': '4 años',
      '5': '5 años',
      'Más de 5': '6 o mas'
    };

    type YearRange = 'Menos de 1' | '1' | '2' | '3' | '4' | '5' | 'Más de 5';
    type DisplayLabel = 'Menos de 1' | '1 año' | '2 años' | '3 años' | '4 años' | '5 años' | '6 o mas';
    
    const colors: Record<YearRange, string> = {
      'Menos de 1': '#4472C4',  // Blue
      '1': '#ED7D31',          // Orange
      '2': '#A5A5A5',          // Gray
      '3': '#FFC000',          // Yellow
      '4': '#5B9BD5',          // Light Blue
      '5': '#70AD47',          // Green
      'Más de 5': '#7030A0'    // Purple
    };

    // Transform the data with display labels
    const chartData = result.rows.map(row => {
      console.log('Processing row:', row);
      const dbValue = row.year_range as YearRange;
      return {
        label: labelMapping[dbValue] || dbValue,
        value: parseInt(row.count),
        color: colors[dbValue] || '#000000'
      };
    });

    console.log('Final chart data:', chartData);

    // If no data, return default structure with display labels
    if (chartData.length === 0) {
      console.log('No data found, returning default structure');
      return [
        { label: 'Menos de 1', value: 0, color: '#4472C4' },
        { label: '1 año', value: 0, color: '#ED7D31' },
        { label: '2 años', value: 0, color: '#A5A5A5' },
        { label: '3 años', value: 0, color: '#FFC000' },
        { label: '4 años', value: 0, color: '#5B9BD5' },
        { label: '5 años', value: 0, color: '#70AD47' },
        { label: '6 o mas', value: 0, color: '#7030A0' }
      ];
    }

    // Ensure all categories are present with display labels
    const dbCategories: YearRange[] = ['Menos de 1', '1', '2', '3', '4', '5', 'Más de 5'];
    const existingCategories = new Set(chartData.map(d => d.label));
    
    // Add missing categories with value 0
    dbCategories.forEach(dbValue => {
      const displayLabel = labelMapping[dbValue];
      if (!existingCategories.has(displayLabel)) {
        chartData.push({
          label: displayLabel,
          value: 0,
          color: colors[dbValue]
        });
      }
    });

    // Sort the data using database values
    chartData.sort((a, b) => {
      const order: Record<DisplayLabel, number> = {
        'Menos de 1': 1,
        '1 año': 2,
        '2 años': 3,
        '3 años': 4,
        '4 años': 5,
        '5 años': 6,
        '6 o mas': 7
      };
      return order[a.label as DisplayLabel] - order[b.label as DisplayLabel];
    });

    return chartData;
  } catch (error) {
    console.error('Error fetching years distribution:', error);
    return [
      { label: 'Menos de 1', value: 0, color: '#4472C4' },
      { label: '1 año', value: 0, color: '#ED7D31' },
      { label: '2 años', value: 0, color: '#A5A5A5' },
      { label: '3 años', value: 0, color: '#FFC000' },
      { label: '4 años', value: 0, color: '#5B9BD5' },
      { label: '5 años', value: 0, color: '#70AD47' },
      { label: '6 o mas', value: 0, color: '#7030A0' }
    ];
  }
}

// Get feedback distribution from database
async function getFeedbackDistribution(school: string): Promise<BarChartData[]> {
  try {
    console.log('Fetching feedback distribution for school:', school);
    
    // First, let's check what data we have and its format
    const checkQuery = `
      SELECT 
        institucion_educativa,
        retroalimentacion_de,
        array_length(retroalimentacion_de, 1) as array_length
      FROM docentes_form_submissions
      WHERE institucion_educativa = $1;
    `;
    const checkResult = await pool.query(checkQuery, [school]);
    console.log('Raw data check:', checkResult.rows);

    // Now get the distribution with proper array handling
    const query = `
      WITH feedback_data AS (
        SELECT 
          CASE 
            WHEN retroalimentacion_de IS NULL OR retroalimentacion_de = '{}' THEN ARRAY['Ninguno']
            ELSE retroalimentacion_de
          END as feedback
        FROM docentes_form_submissions
        WHERE institucion_educativa = $1
      ),
      unnested_data AS (
        SELECT unnest(feedback) as source
        FROM feedback_data
      )
      SELECT 
        source,
        COUNT(*) as count
      FROM unnested_data
      GROUP BY source
      ORDER BY source;
    `;

    console.log('Executing distribution query:', query);
    const { rows } = await pool.query(query, [school]);
    console.log('Distribution query results:', rows);
    
    // Define mapping from database values to display labels
    const labelMapping: Record<string, string> = {
      'Rector/a': 'Rector',
      'Coordinador/a': 'Coordinator',
      'Otros/as docentes': 'Otros docentes',
      'Acudientes': 'Acudientes',
      'Estudiantes': 'Estudiantes',
      'Otros': 'Otros',
      'Ninguno': 'Ninguno'
    };

    // Initialize with default structure and 0 values
    const feedbackData: BarChartData[] = [
      { label: 'Ninguno', value: 0, color: '#A5A5A5' },      // Gray
      { label: 'Rector', value: 0, color: '#4472C4' },       // Blue
      { label: 'Coordinator', value: 0, color: '#FFC000' },  // Yellow
      { label: 'Otros docentes', value: 0, color: '#70AD47' }, // Green
      { label: 'Acudientes', value: 0, color: '#ED7D31' },   // Orange
      { label: 'Estudiantes', value: 0, color: '#5B9BD5' },  // Light Blue
      { label: 'Otros', value: 0, color: '#7030A0' }         // Purple
    ];

    // Update values from database
    rows.forEach(row => {
      const mappedLabel = labelMapping[row.source] || row.source;
      console.log('Processing row:', { 
        original: row.source, 
        mapped: mappedLabel,
        count: row.count,
        type: typeof row.count
      });
      const item = feedbackData.find(d => d.label === mappedLabel);
      if (item) {
        item.value = parseInt(row.count);
        console.log('Updated item:', item);
      } else {
        console.log('No matching label found for:', mappedLabel);
      }
    });

    console.log('Final feedback data:', feedbackData);
    return feedbackData;
  } catch (error) {
    console.error('Error fetching feedback distribution:', error);
    return [
      { label: 'Ninguno', value: 0, color: '#A5A5A5' },      // Gray
      { label: 'Rector', value: 0, color: '#4472C4' },       // Blue
      { label: 'Coordinator', value: 0, color: '#FFC000' },  // Yellow
      { label: 'Otros docentes', value: 0, color: '#70AD47' }, // Green
      { label: 'Acudientes', value: 0, color: '#ED7D31' },   // Orange
      { label: 'Estudiantes', value: 0, color: '#5B9BD5' },  // Light Blue
      { label: 'Otros', value: 0, color: '#7030A0' }         // Purple
    ];
  }
}

// Helper function to get years distribution for estudiantes
async function getYearsDistributionForEstudiantes(school: string): Promise<BarChartData[]> {
  try {
    console.log('Fetching years distribution for estudiantes, school:', school);
    
    const query = `
      SELECT 
        anos_estudiando as year_range,
        COUNT(*) as count
      FROM estudiantes_form_submissions
      WHERE institucion_educativa = $1
      GROUP BY anos_estudiando
      ORDER BY 
        CASE anos_estudiando
          WHEN 'Menos de 1' THEN 1
          WHEN '1' THEN 2
          WHEN '2' THEN 3
          WHEN '3' THEN 4
          WHEN '4' THEN 5
          WHEN '5' THEN 6
          WHEN 'Más de 5' THEN 7
          ELSE 8
        END;
    `;

    console.log('Executing query:', query.replace(/\s+/g, ' '));
    const result = await pool.query(query, [school]);
    console.log('Years distribution raw data:', result.rows);

    // Define the mapping from database values to display labels
    const labelMapping: Record<string, string> = {
      'Menos de 1': 'Menos de 1',
      '1': '1 año',
      '2': '2 años',
      '3': '3 años',
      '4': '4 años',
      '5': '5 años',
      'Más de 5': '6 o mas'
    };

    type YearRange = 'Menos de 1' | '1' | '2' | '3' | '4' | '5' | 'Más de 5';
    type DisplayLabel = 'Menos de 1' | '1 año' | '2 años' | '3 años' | '4 años' | '5 años' | '6 o mas';
    
    const colors: Record<YearRange, string> = {
      'Menos de 1': '#4472C4',  // Blue
      '1': '#ED7D31',          // Orange
      '2': '#A5A5A5',          // Gray
      '3': '#FFC000',          // Yellow
      '4': '#5B9BD5',          // Light Blue
      '5': '#70AD47',          // Green
      'Más de 5': '#7030A0'    // Purple
    };

    // Transform the data with display labels
    const chartData = result.rows.map(row => {
      console.log('Processing row:', row);
      const dbValue = row.year_range as YearRange;
      return {
        label: labelMapping[dbValue] || dbValue,
        value: parseInt(row.count),
        color: colors[dbValue] || '#000000'
      };
    });

    // If no data, return default structure with display labels
    if (chartData.length === 0) {
      console.log('No data found, returning default structure');
      return [
        { label: 'Menos de 1', value: 0, color: '#4472C4' },
        { label: '1 año', value: 0, color: '#ED7D31' },
        { label: '2 años', value: 0, color: '#A5A5A5' },
        { label: '3 años', value: 0, color: '#FFC000' },
        { label: '4 años', value: 0, color: '#5B9BD5' },
        { label: '5 años', value: 0, color: '#70AD47' },
        { label: '6 o mas', value: 0, color: '#7030A0' }
      ];
    }

    // Ensure all categories are present with display labels
    const dbCategories: YearRange[] = ['Menos de 1', '1', '2', '3', '4', '5', 'Más de 5'];
    const existingCategories = new Set(chartData.map(d => d.label));
    
    // Add missing categories with value 0
    dbCategories.forEach(dbValue => {
      const displayLabel = labelMapping[dbValue];
      if (!existingCategories.has(displayLabel)) {
        chartData.push({
          label: displayLabel,
          value: 0,
          color: colors[dbValue]
        });
      }
    });

    // Sort the data using database values
    chartData.sort((a, b) => {
      const order: Record<DisplayLabel, number> = {
        'Menos de 1': 1,
        '1 año': 2,
        '2 años': 3,
        '3 años': 4,
        '4 años': 5,
        '5 años': 6,
        '6 o mas': 7
      };
      return order[a.label as DisplayLabel] - order[b.label as DisplayLabel];
    });

    return chartData;
  } catch (error) {
    console.error('Error fetching years distribution for estudiantes:', error);
    return [
      { label: 'Menos de 1', value: 0, color: '#4472C4' },
      { label: '1 año', value: 0, color: '#ED7D31' },
      { label: '2 años', value: 0, color: '#A5A5A5' },
      { label: '3 años', value: 0, color: '#FFC000' },
      { label: '4 años', value: 0, color: '#5B9BD5' },
      { label: '5 años', value: 0, color: '#70AD47' },
      { label: '6 o mas', value: 0, color: '#7030A0' }
    ];
  }
}

// Main function to generate the Encuestados page
export const generateEncuestadosPage = async (doc: CustomPDFKit, school: string): Promise<void> => {
  // Add a new page with header
  doc.addPage();
  addHeader(doc);

  const startX = 75;
  const pageContentWidth = doc.page.width - (startX * 2);  // Renamed from textWidth to pageContentWidth
  const startY = doc.y + 15;
  const labelWidth = 200;  // Width for right-aligned labels
  const valueX = startX + labelWidth + 10;  // Fixed starting position for values

  // Reset cursor position
  doc.x = startX;
  doc.y = startY;

  // Add ENCUESTADOS title
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('ENCUESTADOS', startX, doc.y, {
       align: 'left'
     })
     .moveDown(0.5);

  // Add DOCENTES title with background
  const docentesY = doc.y;
  const titleHeight = 20;  // Height for title background
  
  // Draw background rectangle
  doc.save()
     .fillColor('#1E3A8A')  // Dark blue background
     .rect(startX, docentesY, doc.page.width - (startX * 2), titleHeight)
     .fill()
     .restore();

  const docentesCount = await getDocentesCount(school);
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('white')  // White text for contrast
     .text('DOCENTES:', startX, docentesY + 4, {
       width: labelWidth,
       align: 'right'
     });
  
  // Add docentes count at fixed position
  doc.font('Helvetica')
     .fillColor('white')  // White text for the count
     .text(`${docentesCount} encuestados`, valueX, docentesY + 4)
     .moveDown(0.0);

  // Add charts section
  const pageHeight = doc.page.height;
  const chartMargin = 30;
  const chartWidth = (doc.page.width - chartMargin * 4) / 2.5; // Adjusted width to accommodate legend
  const chartHeight = 150;
  const startChartY = doc.y + 10;

  // Draw first pie chart (Grades)
  const gradesData = await getGradesDistribution(school || '');
  drawPieChartUtil(
    doc, 
    gradesData, 
    startX + chartWidth/4,  // Moved more to the left (changed from chartWidth/2.5)
    startChartY + chartHeight/2, 
    chartWidth/4, 
    '¿En qué grados tiene clases?', 
    true,    // First chart
    false,   // Place legend on the right (not below)
    false    // Don't use multi-line legend
  );

  // Adjust separator position accordingly
  const separatorX = startX + chartWidth * 1.1; // Adjusted separator position (changed from 1.2)
  const separatorStartY = startChartY + 10;
  const separatorEndY = startChartY + chartHeight - 10;
  doc.save()
     .moveTo(separatorX, separatorStartY)
     .lineTo(separatorX, separatorEndY)
     .strokeColor('#CCCCCC')
     .lineWidth(1)
     .dash(5, { space: 5 })
     .stroke()
     .restore();

  // Draw second pie chart (Schedule) - adjusted position
  const scheduleData = await getScheduleDistribution(school || '');
  drawPieChartUtil(
    doc,
    scheduleData,
    separatorX + chartWidth/3,  // Adjusted position to make room for right legend
    startChartY + chartHeight/2,
    chartWidth/4,
    '¿En qué jornada tiene clases?',
    false,   // Not first chart
    false,   // Place legend on the right (not below)
    false    // Don't use multi-line legend
  );

  // Calculate positions for separators
  const horizontalSeparatorY = startChartY + chartHeight - 10;  // Changed from +20 to -10 to move higher
  const verticalSeparatorX = startX + chartWidth * 1.3 + chartMargin;  // Position for vertical separator

  // Draw horizontal separator line between pie charts and bar charts
  doc.save()
     .moveTo(startX, horizontalSeparatorY)
     .lineTo(verticalSeparatorX, horizontalSeparatorY)  // Extend to vertical separator
     .strokeColor('#CCCCCC')  // Light gray color
     .lineWidth(1)
     .dash(5, { space: 5 })   // Dashed line
     .stroke()
     .restore();

  // Update the years bar chart to use real data
  const yearsData = await getYearsDistribution(school);
  console.log('Years distribution data:', {
    data: yearsData,
    chartPosition: {
      x: startX,
      y: horizontalSeparatorY + 5, // Changed from startChartY + chartHeight + 10 to be just below the separator
      width: chartWidth,
      height: chartHeight
    }
  });
  
  // Ensure we have proper positioning
  const yearsChartX = startX;
  const yearsChartY = horizontalSeparatorY + 5; // Changed to be just below the separator
  const yearsChartWidth = chartWidth;
  const yearsChartHeight = chartHeight;

  // Draw the chart with adjusted padding
  drawBarChart(
    doc,
    yearsData,
    yearsChartX,
    yearsChartY,
    yearsChartWidth,
    yearsChartHeight,
    '¿Cuántos años lleva en la IE?',
    true // isHorizontal
  );

  // Draw second bar chart (Feedback)
  console.log('About to draw feedback chart');
  const feedbackData = await getFeedbackDistribution(school);
  console.log('Drawing feedback chart with data:', feedbackData);

  // Draw the chart with adjusted padding
  drawBarChart(
    doc,
    feedbackData,
    startX + chartWidth + chartMargin,
    horizontalSeparatorY + 5,  // Position it just below the horizontal separator
    chartWidth,
    chartHeight,
    'Usted recibe retroalimentación de',
    true // isHorizontal
  );

  const barChartsEndY = horizontalSeparatorY + chartHeight + 10;

  // Add ESTUDIANTES title with background
  const estudiantesY = barChartsEndY - 10;  // Changed from +10 to -10 to move up closer to charts
  
  // Draw background rectangle
  doc.save()
     .fillColor('#1E3A8A')  // Dark blue background
     .rect(startX, estudiantesY, doc.page.width - (startX * 2), titleHeight)
     .fill()
     .restore();

  const estudiantesCount = await getEstudiantesCount(school);
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('white')  // White text for contrast
     .text('ESTUDIANTES:', startX, estudiantesY + 4, {
       width: labelWidth,
       align: 'right'
     });

  // Add estudiantes count at fixed position
  doc.font('Helvetica')
     .fillColor('white')  // White text for the count
     .text(`${estudiantesCount} encuestados`, valueX, estudiantesY + 4)
     .moveDown(0.3);

  // Add charts section for ESTUDIANTES with minimal spacing
  const estudiantesChartY = doc.y + 2;  // Reduced from +5 to +2

  // Draw first pie chart (Grades) for estudiantes
  const estudiantesGradesData = await getGradesDistributionForEstudiantes(school);
  drawPieChartUtil(
    doc,
    estudiantesGradesData,
    startX + chartWidth/3,
    estudiantesChartY + chartHeight/2,
    chartWidth/4,
    '¿En qué grado te encuentras?',
    true,
    true,  // Place legend below
    true   // Use multi-line legend
  );

  // Draw vertical separator line closer to pie chart 3
  const estudiantesSeparatorX = startX + chartWidth/3 + chartWidth/2;  // Moved closer to pie 3
  const estudiantesSeparatorStartY = estudiantesChartY + 25;
  const estudiantesSeparatorEndY = estudiantesChartY + chartHeight - 25;
  doc.save()
     .moveTo(estudiantesSeparatorX, estudiantesSeparatorStartY)
     .lineTo(estudiantesSeparatorX, estudiantesSeparatorEndY)
     .strokeColor('#CCCCCC')
     .lineWidth(1)
     .dash(5, { space: 5 })
     .stroke()
     .restore();

  // Draw second pie chart (Schedule) for estudiantes, moved closer to separator
  const estudiantesScheduleData = await getScheduleDistributionForEstudiantes(school);
  drawPieChartUtil(
    doc,
    estudiantesScheduleData,
    startX + chartWidth * 1.0 + chartMargin,  // Reduced from 1.2 to 1.0 to move it more left
    estudiantesChartY + chartHeight/2,
    chartWidth/4,
    '¿En qué jornada tiene clases?',
    false,
    true,  // Place legend below
    false  // Use single-line legend
  );

  // Draw right vertical separator line
  const rightSeparatorX = startX + chartWidth * 1.3 + chartMargin;  // Reduced from 1.4 to 1.2 to move line closer to left pie chart
  const rightSeparatorStartY = estudiantesChartY + 25;
  const rightSeparatorEndY = estudiantesChartY + chartHeight - 25;
  doc.save()
     .moveTo(rightSeparatorX, rightSeparatorStartY)
     .lineTo(rightSeparatorX, rightSeparatorEndY)
     .strokeColor('#CCCCCC')
     .lineWidth(1)
     .dash(5, { space: 5 })
     .stroke()
     .restore();

  // Draw years bar chart on the right side
  const yearsDataRight = await getYearsDistributionForEstudiantes(school);
  drawBarChart(
    doc,
    yearsDataRight,
    verticalSeparatorX + 20,  // Keep 20 points padding from separator
    estudiantesChartY,   // Changed from -8 to +15 to move chart lower
    chartWidth/1.5,
    chartHeight,
    '¿Cuántos años lleva en la IE?',
    true // isHorizontal
  );

  // Draw vertical separator line
  doc.save()
     .moveTo(verticalSeparatorX, estudiantesChartY + 25)
     .lineTo(verticalSeparatorX, estudiantesChartY + chartHeight - 25)
     .strokeColor('#CCCCCC')
     .lineWidth(1)
     .dash(5, { space: 5 })
     .stroke()
     .restore();

  // Calculate position for horizontal separator line after legends
  // Account for multi-line legend height (3 rows * 15 points spacing) plus pad
  const legendHeight = 3 * 15 + 5;  // Reduced padding from 20 to 5 points
  const estudiantesChartsEndY = estudiantesChartY + chartHeight + legendHeight;
  
  // Add ACUDIENTES title with background
  const acudientesY = estudiantesChartsEndY - 15;  // Changed from +10 to -15 to move up closer to charts
  
  // Draw background rectangle
  doc.save()
     .fillColor('#1E3A8A')  // Dark blue background
     .rect(startX, acudientesY, doc.page.width - (startX * 2), titleHeight)
     .fill()
     .restore();

  // Add ACUDIENTES title and count
  const acudientesCount = await getAcudientesCount(school);
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('white')  // White text for contrast
     .text('ACUDIENTES:', startX, acudientesY + 4, {
       width: labelWidth,
       align: 'right'
     });

  // Add acudientes count at fixed position
  doc.font('Helvetica')
     .fillColor('white')  // White text for the count
     .text(`${acudientesCount} encuestados`, valueX, acudientesY + 4)
     .moveDown(1);

  // Draw stacked bar chart for grados_estudiantes
  const stackedBarY = acudientesY + 50;  // Increased back to 50 points padding
  const stackedBarHeight = 20;  // Reduced from 25 to 20
  const stackedBarData = await getGradosEstudiantesDistribution(school);
  const totalStudents = stackedBarData.reduce((sum, item) => sum + item.value, 0);
  
  // Draw title for stacked bar
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor('black')  // Set color to black
     .text('¿En qué grado se encuentran los estudiantes que representa?', startX, stackedBarY - 20, {
       width: doc.page.width - (startX * 2),  // Full page width minus margins
       align: 'left'
     });

  // Draw the stacked bar
  let currentX = startX;
  const fullWidth = doc.page.width - (startX * 2);  // Full page width minus margins
  stackedBarData.forEach((item, index) => {
    const barWidth = (item.value / totalStudents) * fullWidth;
    
    // Draw bar segment
    doc.rect(currentX, stackedBarY, barWidth, stackedBarHeight)
       .fillColor(item.color)
       .fill();

    // Add percentage label if segment is wide enough
    const percentage = Math.round((item.value / totalStudents) * 100);
    if (percentage > 5) {  // Only show label if segment is > 5%
      const percentageTextWidth = doc.widthOfString(`${percentage}%`);  // Get width of text
      const textX = currentX + (barWidth - percentageTextWidth)/2;  // Center text in segment
      const textY = stackedBarY + (stackedBarHeight/2); // Center text in segment
      
      doc.fillColor('white')
         .fontSize(8)
         .text(`${percentage}%`,
           textX,
           textY,
           { 
             lineBreak: false,
             baseline: 'middle',
             characterSpacing: 0
           });
    }

    currentX += barWidth;
  });

  // Draw legend below stacked bar
  const legendY = stackedBarY + stackedBarHeight + 10;
  const legendItemWidth = 45;  // Reduced width to fit all items in one line
  const legendSpacing = 5;     // Added small spacing between items
  
  // Instead of centering legend in one line, split it into two rows
  const legendItemsPerRow = Math.ceil(stackedBarData.length / 2); // Split items evenly into two rows
  const firstRowWidth = legendItemsPerRow * (legendItemWidth + legendSpacing) - legendSpacing;
  const secondRowWidth = (stackedBarData.length - legendItemsPerRow) * (legendItemWidth + legendSpacing) - legendSpacing;
  
  const firstRowStartX = (doc.page.width - firstRowWidth) / 2;
  const secondRowStartX = (doc.page.width - secondRowWidth) / 2;
  
  stackedBarData.forEach((item, index) => {
    const isSecondRow = index >= legendItemsPerRow;
    const rowStartX = isSecondRow ? secondRowStartX : firstRowStartX;
    const rowIndex = isSecondRow ? index - legendItemsPerRow : index;
    const rowY = isSecondRow ? legendY + 15 : legendY;
    
    const legendItemX = rowStartX + (rowIndex * (legendItemWidth + legendSpacing));

    // Draw color box
    doc.rect(legendItemX, rowY, 8, 8)
       .fillColor(item.color)
       .fill();

    // Draw label with smaller font
    doc.fillColor('black')
       .fontSize(6)  // Reduced font size further
       .text(item.label,
         legendItemX + 12,
         rowY,
         { width: legendItemWidth - 12 });
  });

  // Calculate content width for the note section
  const contentWidth = doc.page.width - (startX * 2);  // Full page width minus margins

  // Add note text below legend with exclamation mark - adjust position for two-row legend
  const noteY = legendY + 45;  // Increased from 30 to 45 to accommodate two rows
  
  // Draw exclamation mark
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor('#FF0000')  // Red color
     .text('!', startX + 12, noteY);

  // Add instruction box with solid border
  const notePadding = 10;
  const iconWidth = 30;
  const textStartX = startX + iconWidth;
  const noteTextWidth = contentWidth - iconWidth;  // Renamed from textWidth to noteTextWidth

  // Draw border around text (solid line)
  doc.lineWidth(0.5)
     .rect(textStartX, noteY, noteTextWidth, 30)  // Use noteTextWidth here
     .stroke();

  // Add note text
  doc.fontSize(10)
     .font('Helvetica-Bold')  // Made bold
     .fillColor('#FF0000')  // Red color
     .text('Analice la composición de los distintos grupos encuestados y tenga encuenta que esta muestra no representa la totalidad de su IE.',
       textStartX + notePadding, noteY + 8, {
         width: noteTextWidth - (notePadding * 2),  // Use noteTextWidth here
         align: 'center'
       });
};

function drawPieChart(
  doc: CustomPDFKit,
  data: PieChartData[],
  centerX: number,
  centerY: number,
  radius: number,
  title: string,
  showLegend: boolean = false,
  placeLegendBelow: boolean = false,
  multiLineLegend: boolean = false
) {
  try {
    console.log('Drawing pie chart:', { title, data, centerX, centerY, radius });
    
    // Skip if no data or error data
    if (!data || data.length === 0) {
      console.log('No data provided for pie chart:', title);
      return;
    }

    // Check if we have error data
    if (data.length === 1 && (data[0].label === 'Error al cargar datos' || data[0].label === 'No hay datos')) {
      // Draw error message
      doc.fontSize(10)
         .fillColor('#666666')
         .text(data[0].label, centerX - radius, centerY - 10, {
           width: radius * 2,
           align: 'center'
         });
      return;
    }

    // Calculate total for percentages
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      console.log('Total value is 0 for pie chart:', title);
      doc.fontSize(10)
         .fillColor('#666666')
         .text('No hay datos disponibles', centerX - radius, centerY - 10, {
           width: radius * 2,
           align: 'center'
         });
      return;
    }

    // Draw title
    doc.fontSize(10)
       .fillColor('black')
       .text(title, centerX - radius, centerY - radius - 20, {
         width: radius * 2,
         align: 'center'
       });

    let startAngle = 0;
    data.forEach((segment, index) => {
      // Calculate angles
      const segmentAngle = (segment.value / total) * 2 * Math.PI;
      const endAngle = startAngle + segmentAngle;

      // Draw pie segment using bezier curves
      doc.save();
      doc.moveTo(centerX, centerY);
      
      // Draw arc using multiple bezier curves
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const angle = startAngle + (segmentAngle * i) / steps;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        if (i === 0) {
          doc.lineTo(x, y);
        } else {
          doc.lineTo(x, y);
        }
      }
      
      doc.lineTo(centerX, centerY)
         .closePath()
         .fillColor(segment.color)
         .fill()
         .restore();

      // Draw percentage in the segment if it's large enough
      const percentage = Math.round((segment.value / total) * 100);
      if (percentage > 5) {  // Only show percentage if segment is > 5%
        const midAngle = startAngle + segmentAngle / 2;
        const labelRadius = radius * 0.7;  // Position label at 70% of radius
        const labelX = centerX + labelRadius * Math.cos(midAngle);
        const labelY = centerY + labelRadius * Math.sin(midAngle);
        
        doc.save()
           .fillColor('white')
           .fontSize(8)
           .text(`${percentage}%`,
             labelX - 10,  // Center the percentage text
             labelY - 4,   // Adjust for text height
             {
               width: 20,
               align: 'center'
             })
           .restore();
      }

      // Always draw legend on the right side
      const legendX = centerX + radius * 1.2;  // Position legend to the right of the chart
      const legendY = centerY - radius + (index * 20);  // Distribute legend items vertically

      // Draw color box
      doc.rect(legendX, legendY, 10, 10)
         .fillColor(segment.color)
         .fill();

      // Draw label
      doc.fillColor('black')
         .fontSize(8)
         .text(segment.label, 
           legendX + 15, 
           legendY + 2,
           {
             width: 100,  // Give enough width for the label
             lineBreak: true
           });

      startAngle = endAngle;
    });

    console.log('Successfully drew pie chart:', title);
  } catch (error) {
    console.error('Error drawing pie chart:', title, error);
    // Draw error message on the PDF
    doc.fontSize(10)
       .fillColor('#FF0000')
       .text('Error al dibujar el gráfico', centerX - radius, centerY - 10, {
         width: radius * 2,
         align: 'center'
       });
  }
} 