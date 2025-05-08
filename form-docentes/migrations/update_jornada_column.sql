-- Update jornada column in docentes_form_submissions table
-- First, create a temporary column for the conversion
ALTER TABLE docentes_form_submissions 
ADD COLUMN jornada_array text[];

-- Convert existing single values to arrays
UPDATE docentes_form_submissions 
SET jornada_array = ARRAY[jornada];

-- Drop the old column and rename the new one
ALTER TABLE docentes_form_submissions 
DROP COLUMN jornada;

ALTER TABLE docentes_form_submissions 
RENAME COLUMN jornada_array TO jornada;

-- Set the NOT NULL constraint
ALTER TABLE docentes_form_submissions 
ALTER COLUMN jornada SET NOT NULL; 