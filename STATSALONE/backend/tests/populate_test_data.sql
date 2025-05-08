-- First, let's get the list of schools from rectores table
WITH schools AS (
  SELECT DISTINCT nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ as school_name 
  FROM rectores
)

-- Insert test data for docentes_form_submissions
INSERT INTO docentes_form_submissions (
  institucion_educativa,
  comunicacion,
  practicas_pedagogicas,
  convivencia
)
SELECT 
  s.school_name,
  '{
    "Tengo la disposición de dialogar con los acudientes sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas.": "Siempre",
    "Promuevo el apoyo de los acudientes al aprendizaje de los estudiantes, a través de actividades académicas y lúdicas para realizar en espacios fuera de la institución educativa.": "Siempre",
    "En el colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales.": "A veces"
  }'::jsonb as comunicacion,
  '{
    "Cuando preparo mis clases tengo en cuenta los intereses y necesidades de los estudiantes.": "Siempre",
    "Me articulo con profesores de otras áreas y niveles para llevar a cabo proyectos pedagógicos que mejoren los aprendizajes de los estudiantes.": "A veces"
  }'::jsonb as practicas_pedagogicas,
  '{
    "Los estudiantes me tratan con respeto a mí y a mis otros compañeros docentes, directivos y administrativos.": "Siempre",
    "En el colegio me siento escuchado/a y comprendido/a por otros docentes, los directivos, los estudiantes y los acudientes.": "A veces"
  }'::jsonb as convivencia
FROM schools s
CROSS JOIN generate_series(1, CASE 
  WHEN s.school_name LIKE '%Caracas%' THEN 15  -- Less than 25
  WHEN s.school_name LIKE '%Galán%' THEN 30    -- More than 25
  ELSE floor(random() * 20 + 20)::int          -- Random between 20-40
END) as seq;

-- Insert test data for estudiantes_form_submissions
INSERT INTO estudiantes_form_submissions (
  institucion_educativa,
  comunicacion,
  practicas_pedagogicas,
  convivencia
)
SELECT 
  s.school_name,
  '{
    "Mis profesores están dispuestos a hablar con mis acudientes sobre cómo me está yendo en el colegio, en momentos diferentes a la entrega de notas.": "Siempre",
    "Mis profesores me dejan actividades para hacer en casa, las cuales necesitan el apoyo de mis acudientes.": "A veces",
    "En mi colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales.": "Siempre"
  }'::jsonb as comunicacion,
  '{
    "Los profesores tienen en cuenta mis intereses y afinidades para escoger lo que vamos a hacer en clase.": "Siempre",
    "Los profesores trabajan juntos en proyectos para hacer actividades que nos ayudan a aprender más y mejor.": "A veces"
  }'::jsonb as practicas_pedagogicas,
  '{
    "Mis compañeros y yo tratamos con respeto a los profesores, directivos y administrativos del colegio.": "Siempre",
    "En el colegio me siento escuchado/a y comprendido/a por los profesores, los directivos, los estudiantes y otros acudientes.": "A veces"
  }'::jsonb as convivencia
FROM schools s
CROSS JOIN generate_series(1, CASE 
  WHEN s.school_name LIKE '%Limonar%' THEN 20  -- Less than 25
  WHEN s.school_name LIKE '%Caracas%' THEN 30  -- More than 25
  ELSE floor(random() * 20 + 20)::int          -- Random between 20-40
END) as seq;

-- Insert test data for acudientes_form_submissions
INSERT INTO acudientes_form_submissions (
  institucion_educativa,
  comunicacion,
  practicas_pedagogicas,
  convivencia
)
SELECT 
  s.school_name,
  '{
    "Los profesores tienen la disposición para hablar conmigo sobre los aprendizajes de los estudiantes en momentos adicionales a la entrega de notas.": "Siempre",
    "Los profesores promueven actividades para que apoye en su proceso de aprendizaje a los estudiantes que tengo a cargo.": "A veces",
    "En el colegio se promueve mi participación en la toma de decisiones sobre las metas institucionales.": "Siempre"
  }'::jsonb as comunicacion,
  '{
    "Los profesores tienen en cuenta los intereses y necesidades de los estudiantes para escoger los temas que se van a tratar en clase.": "Siempre",
    "El colegio organiza o participa en actividades como torneos, campeonatos, olimpiadas o ferias con otros colegios o instituciones.": "A veces"
  }'::jsonb as practicas_pedagogicas,
  '{
    "Los estudiantes tratan con respeto a los profesores, directivos y administrativos del colegio.": "Siempre",
    "En el colegio recibo apoyo para resolver los conflictos que se dan y generar aprendizajes a partir de estos.": "A veces"
  }'::jsonb as convivencia
FROM schools s
CROSS JOIN generate_series(1, CASE 
  WHEN s.school_name LIKE '%Fundadores%' THEN 10  -- Less than 25
  WHEN s.school_name LIKE '%Limonar%' THEN 30    -- More than 25
  ELSE floor(random() * 20 + 20)::int            -- Random between 20-40
END) as seq; 