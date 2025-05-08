const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'COSMO_RLT',
  user: 'postgres',
  password: ''
});

async function populateTestData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get schools
    const schoolsResult = await client.query(`
      SELECT DISTINCT nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ as school_name 
      FROM rectores
    `);
    
    const schools = schoolsResult.rows;
    console.log(`Found ${schools.length} schools to populate data for`);

    // Insert test data for each school
    for (const school of schools) {
      // Docentes submissions
      await client.query(`
        INSERT INTO docentes_form_submissions (
          institucion_educativa,
          anos_como_docente,
          grados_asignados,
          jornada,
          retroalimentacion_de,
          comunicacion,
          practicas_pedagogicas,
          convivencia
        ) SELECT 
          $1,
          floor(random() * 20 + 1)::int,  -- Random years between 1-20
          ARRAY['6', '7', '8']::text[],   -- Example grades
          'Mañana',                       -- Fixed jornada
          ARRAY['Coordinador']::text[],   -- Fixed retroalimentacion as array
          '{
            "Tengo la disposición de dialogar con los acudientes sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas.": "Siempre",
            "Promuevo el apoyo de los acudientes al aprendizaje de los estudiantes, a través de actividades académicas y lúdicas para realizar en espacios fuera de la institución educativa.": "Siempre",
            "En el colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales.": "A veces"
          }'::jsonb,
          '{
            "Cuando preparo mis clases tengo en cuenta los intereses y necesidades de los estudiantes.": "Siempre",
            "Me articulo con profesores de otras áreas y niveles para llevar a cabo proyectos pedagógicos que mejoren los aprendizajes de los estudiantes.": "A veces"
          }'::jsonb,
          '{
            "Los estudiantes me tratan con respeto a mí y a mis otros compañeros docentes, directivos y administrativos.": "Siempre",
            "En el colegio me siento escuchado/a y comprendido/a por otros docentes, los directivos, los estudiantes y los acudientes.": "A veces"
          }'::jsonb
        FROM generate_series(1, 30)`,
        [school.school_name]
      );

      // Estudiantes submissions
      await client.query(`
        INSERT INTO estudiantes_form_submissions (
          institucion_educativa,
          anos_estudiando,
          grado_actual,
          jornada,
          comunicacion,
          practicas_pedagogicas,
          convivencia
        ) SELECT 
          $1,
          floor(random() * 11 + 1)::int,  -- Random years between 1-11
          '8',                            -- Fixed grade
          'Mañana',                       -- Fixed jornada
          '{
            "Mis profesores están dispuestos a hablar con mis acudientes sobre cómo me está yendo en el colegio, en momentos diferentes a la entrega de notas.": "Siempre",
            "Mis profesores me dejan actividades para hacer en casa, las cuales necesitan el apoyo de mis acudientes.": "A veces",
            "En mi colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales.": "Siempre"
          }'::jsonb,
          '{
            "Los profesores tienen en cuenta mis intereses y afinidades para escoger lo que vamos a hacer en clase.": "Siempre",
            "Los profesores trabajan juntos en proyectos para hacer actividades que nos ayudan a aprender más y mejor.": "A veces"
          }'::jsonb,
          '{
            "Mis compañeros y yo tratamos con respeto a los profesores, directivos y administrativos del colegio.": "Siempre",
            "En el colegio me siento escuchado/a y comprendido/a por los profesores, los directivos, los estudiantes y otros acudientes.": "A veces"
          }'::jsonb
        FROM generate_series(1, 30)`,
        [school.school_name]
      );

      // Acudientes submissions
      await client.query(`
        INSERT INTO acudientes_form_submissions (
          institucion_educativa,
          grados_estudiantes,
          comunicacion,
          practicas_pedagogicas,
          convivencia
        ) SELECT 
          $1,
          ARRAY['6', '8']::text[],        -- Example grades of students
          '{
            "Los profesores tienen la disposición para hablar conmigo sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas.": "Siempre",
            "Los profesores promueven actividades para que apoye en su proceso de aprendizaje a los estudiantes que tengo a cargo.": "A veces",
            "En el colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales.": "Siempre"
          }'::jsonb,
          '{
            "Los profesores tienen en cuenta los intereses y necesidades de los estudiantes para escoger los temas que se van a tratar en clase.": "Siempre",
            "El colegio organiza o participa en actividades como torneos, campeonatos, olimpiadas o ferias con otros colegios o instituciones.": "A veces"
          }'::jsonb,
          '{
            "Los estudiantes tratan con respeto a los profesores, directivos y administrativos del colegio.": "Siempre",
            "En el colegio recibo apoyo para resolver los conflictos que se dan y generar aprendizajes a partir de estos.": "A veces"
          }'::jsonb
        FROM generate_series(1, 30)`,
        [school.school_name]
      );
    }

    await client.query('COMMIT');
    console.log('Successfully added test data');

    // Query counts to verify
    const tables = ['docentes_form_submissions', 'estudiantes_form_submissions', 'acudientes_form_submissions'];
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table} count:`, result.rows[0].count);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding test data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

populateTestData(); 