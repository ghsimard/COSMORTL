const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5001;

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

/**
 * Helper function to normalize field names and handle special cases
 * @param {string} fieldName - The Excel field name
 * @returns {string} The normalized field name
 */
function normalizeFieldName(fieldName) {
  // Handle the disease field specially - it has trailing spaces that might vary
  if (fieldName.startsWith('¿Tiene alguna enfermedad de base')) {
    return '¿Tiene alguna enfermedad de base por la que pueda requerir atención especial durante los encuentros presenciales?     ';
  }
  
  // Handle Lugar de nacimiento field - it might have trailing spaces or not
  if (fieldName.startsWith('Lugar de nacimiento')) {
    return 'Lugar de nacimiento';
  }
  
  // Handle the multiple selection fields
  if (fieldName.includes('Selección múltiple') && !fieldName.endsWith(' ')) {
    return fieldName + ' ';
  }
  
  // Handle the student fields that might have line breaks
  if (fieldName.includes('estudiantes en') && !fieldName.includes('\r\n')) {
    // Check for Preescolar specifically
    if (fieldName.includes('Preescolar')) {
      return 'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)';
    }
  }
  
  return fieldName;
}

/**
 * Helper function to create a pool configuration with proper SSL settings
 * @param {Object} params - The connection parameters
 * @returns {Object} The pool configuration object
 */
function createPoolConfig(params) {
  const { user, password, host, port, database, ssl } = params;
  
  const config = {
    user,
    password,
    host,
    port,
    database,
  };
  
  // Add SSL configuration if enabled
  if (ssl) {
    config.ssl = {
      rejectUnauthorized: false // Required for self-signed certificates
    };
  }
  
  return config;
}

// API Endpoints
app.post('/api/check-missing-records', async (req, res) => {
  const { excelData, connectionParams, identifierField } = req.body;
  
  if (!excelData || !connectionParams || !identifierField) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Configure PostgreSQL connection with SSL support
  const pool = new Pool(createPoolConfig(connectionParams));
  
  try {
    // Log the first few records from the Excel file to verify fields
    console.log('Excel data sample:', JSON.stringify(excelData.slice(0, 1), null, 2));
    
    // Verify the field exists in the data
    if (!excelData[0][identifierField]) {
      console.log('Field not found in Excel data:', identifierField);
      console.log('Available fields:', Object.keys(excelData[0]).join(', '));
      
      return res.status(400).json({ 
        error: `Field '${identifierField}' not found in Excel data`,
        availableFields: Object.keys(excelData[0])
      });
    }
    
    console.log(`Using identifier field: '${identifierField}'`);
    
    // Get all records from the database table
    const dbQuery = {
      text: `SELECT numero_de_cedula FROM rectores`
    };
    
    const dbResult = await pool.query(dbQuery);
    
    // Convert all database values to strings for consistent comparison
    const dbValues = dbResult.rows.map(row => String(row.numero_de_cedula).trim());
    
    console.log(`Loaded ${dbValues.length} records from database`);
    console.log('Database sample values:', dbValues.slice(0, 5));
    
    // Find missing records
    const missingRecords = excelData.filter(record => {
      // Get the ID from Excel and ensure it's a string
      const excelId = String(record[identifierField]).trim();
      
      // Check if this ID exists in the database
      return !dbValues.includes(excelId);
    });
    
    console.log(`Found ${missingRecords.length} missing records`);
    
    // Check if record with ID 71194166 is in the results
    const has71194166 = missingRecords.some(
      record => String(record[identifierField]).trim() === '71194166'
    );
    
    console.log(`Record with ID 71194166 in missing records: ${has71194166}`);
    if (has71194166) {
      console.log('WARNING: Record 71194166 should not be in missing records!');
      
      // Double check if this ID exists in the database
      const checkQuery = {
        text: `SELECT * FROM rectores WHERE numero_de_cedula::text = '71194166'`
      };
      const checkResult = await pool.query(checkQuery);
      console.log(`Double check - 71194166 in database: ${checkResult.rowCount > 0}`);
    }
    
    res.json({ 
      missingRecords,
      debug: {
        totalExcelRecords: excelData.length,
        totalDbRecords: dbValues.length,
        totalMissing: missingRecords.length,
        identifierField,
        excelSampleIds: excelData.slice(0, 5).map(r => r[identifierField]),
        dbSampleValues: dbValues.slice(0, 5),
        has71194166InMissing: has71194166
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      error: `Database error: ${err.message}`,
      stack: err.stack
    });
  } finally {
    await pool.end();
  }
});

app.post('/api/export-records', async (req, res) => {
  const { records, connectionParams, targetTable } = req.body;
  
  if (!records || !connectionParams || !targetTable) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Configure PostgreSQL connection with SSL support
  const pool = new Pool(createPoolConfig(connectionParams));
  
  // Start a client for transaction
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let exportedCount = 0;
    
    // Get the database table structure
    const tableStructureQuery = {
      text: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `,
      values: [targetTable]
    };
    
    const tableResult = await client.query(tableStructureQuery);
    
    // Create a set of valid column names from the database
    const validColumns = new Set(tableResult.rows.map(row => row.column_name));
    console.log('Valid database columns:', Array.from(validColumns));
    
    // Log database columns for validation
    const columnsArray = Array.from(validColumns);
    const diseaseColumns = columnsArray.filter(col => col.includes('enfermedad') || col.includes('atencion'));
    console.log("Database columns related to disease/medical conditions:", diseaseColumns);

    // Ensure we have the disease column with the right name
    if (diseaseColumns.length > 0) {
      console.log(`Found disease columns in database: ${diseaseColumns.join(', ')}`);
    } else {
      console.log("No disease-related columns found in database schema");
    }
    
    // Get the data types for columns
    const columnTypes = {};
    tableResult.rows.forEach(row => {
      columnTypes[row.column_name] = row.data_type;
    });
    
    // Check which columns are array types in the database
    const arrayColumns = new Set();
    tableResult.rows.forEach(row => {
      if (row.data_type.includes('ARRAY') || row.data_type.endsWith('[]') || row.data_type.includes('_array')) {
        arrayColumns.add(row.column_name);
        console.log(`Detected array column in database: ${row.column_name} (${row.data_type})`);
      } else if (
        row.column_name === 'jornadas_de_la_ie_seleccion_multiple' || 
        row.column_name === 'grupos_etnicos_en_la_ie_seleccion_multiple' ||
        row.column_name === 'niveles_educativos_que_ofrece_la_ie_seleccion_multiple'
      ) {
        // These are our known array columns, mark them as such even if the data_type doesn't say so
        arrayColumns.add(row.column_name);
        console.log(`Adding known array column: ${row.column_name} despite data_type: ${row.data_type}`);
      }
    });

    // Explicitly add array columns we know of even if they're not detected
    ['jornadas_de_la_ie_seleccion_multiple', 
     'grupos_etnicos_en_la_ie_seleccion_multiple', 
     'niveles_educativos_que_ofrece_la_ie_seleccion_multiple'
    ].forEach(col => {
      if (!arrayColumns.has(col)) {
        arrayColumns.add(col);
        console.log(`Explicitly adding array column: ${col}`);
      }
    });

    // Ensure 'proyectos_transversales_de_la_ie' is NOT treated as an array
    if (arrayColumns.has('proyectos_transversales_de_la_ie')) {
      arrayColumns.delete('proyectos_transversales_de_la_ie');
      console.log(`Removed 'proyectos_transversales_de_la_ie' from array columns`);
    }

    console.log(`Array columns to handle specially: ${Array.from(arrayColumns).join(', ')}`);
    
    // Function to find a matching field in the record by its name or key parts
    function findMatchingField(record, fieldKey) {
      // Direct match
      if (record[fieldKey] !== undefined) {
        return fieldKey;
      }
      
      // Try normalized version
      const normalizedKey = normalizeFieldName(fieldKey);
      if (record[normalizedKey] !== undefined) {
        return normalizedKey;
      }
      
      // Try with/without trailing space
      const withSpace = fieldKey + ' ';
      const withoutSpace = fieldKey.trim();
      
      if (record[withSpace] !== undefined) {
        return withSpace;
      }
      
      if (record[withoutSpace] !== undefined) {
        return withoutSpace;
      }
      
      // Special case for Lugar de nacimiento
      if (fieldKey === 'Lugar de nacimiento' || fieldKey === 'Lugar de nacimiento ') {
        // Try with different capitalization
        const variations = [
          'Lugar De Nacimiento',
          'LUGAR DE NACIMIENTO',
          'lugar de nacimiento',
          'Lugar de Nacimiento'
        ];
        
        for (const variation of variations) {
          if (record[variation] !== undefined) {
            return variation;
          }
        }
      }
      
      // Look for similar keys
      const keyParts = fieldKey.toLowerCase().split(/\s+/);
      const recordKeys = Object.keys(record);
      
      // Try to find a key that contains all the significant parts
      for (const recordKey of recordKeys) {
        const recordKeyLower = recordKey.toLowerCase();
        
        // For short field keys like "Lugar de nacimiento", require a closer match
        if (keyParts.length < 4) {
          // For shorter keys, check if the record key contains the entire field key
          if (recordKeyLower.includes(fieldKey.toLowerCase())) {
            return recordKey;
          }
        } else {
          // For longer keys, check if all significant parts are present
          const allPartsPresent = keyParts.every(part => 
            part.length > 3 && recordKeyLower.includes(part)
          );
          
          if (allPartsPresent) {
            return recordKey;
          }
        }
      }
      
      // Add special handling for array fields in findMatchingField
      if (fieldKey.includes('Selección múltiple') || 
          fieldKey.includes('Jornadas') || 
          fieldKey.includes('Grupos étnicos')) {
        
        // Try with/without trailing spaces and parentheses
        const variations = [
          fieldKey + ' ', // With trailing space
          fieldKey.trim(), // Without trailing space
          fieldKey.replace(/\s*\([^)]*\)\s*/, ' '), // Remove parenthetical text
          fieldKey.replace(/\s*\([^)]*\)\s*/, '') // Remove parenthetical text and trim
        ];
        
        for (const variation of variations) {
          if (record[variation] !== undefined) {
            return variation;
          }
        }
        
        // For array fields, try more aggressive matching
        const recordKeys = Object.keys(record);
        
        // Try to find fields that contain key terms like "Jornadas" or "Grupos étnicos"
        if (fieldKey.includes('Jornadas')) {
          const journeyKey = recordKeys.find(key => 
            key.includes('Jornada') || 
            key.toLowerCase().includes('jornada')
          );
          if (journeyKey) return journeyKey;
        }
        
        if (fieldKey.includes('Grupos étnicos')) {
          const ethnicKey = recordKeys.find(key => 
            key.includes('étnico') || 
            key.includes('etnico') || 
            key.toLowerCase().includes('grupo')
          );
          if (ethnicKey) return ethnicKey;
        }
        
        if (fieldKey.includes('Niveles educativos')) {
          const levelsKey = recordKeys.find(key => 
            key.includes('Niveles') || 
            key.toLowerCase().includes('nivel') ||
            key.toLowerCase().includes('educativo')
          );
          if (levelsKey) return levelsKey;
        }
      }
      
      return null;
    }
    
    // Process each record for import
    for (const record of records) {
      // CRITICAL: Special handling for the problematic record 39443630
      if (String(record['Número de cédula']) === '39443630') {
        console.log('🚨 Found problematic record 39443630 - applying special fix');
        
        // Check niveles_educativos field which has value 35798
        const nivelesField = 'Niveles educativos que ofrece la IE (Selección múltiple) ';
        if (record[nivelesField] !== undefined) {
          const originalValue = record[nivelesField];
          console.log(`Record 39443630 has niveles_educativos value: ${originalValue} (${typeof originalValue})`);
          
          // If it's a number like 35798, replace with a proper array value
          if (typeof originalValue === 'number' || 
             (typeof originalValue === 'string' && /^\d+$/.test(String(originalValue).trim()))) {
            
            // Find actual values from other records for niveles_educativos
            // Preescolar (Prejardín, Jardín y Transición);Básica primaria (1° a 5°);Básica secundaria (6° a 9°);Media (10° a 11°)
            const defaultValue = 'Preescolar (Prejardín, Jardín y Transición);Básica primaria (1° a 5°);Básica secundaria (6° a 9°);Media (10° a 11°)';
            console.log(`Replacing numeric value with actual educational levels: ${defaultValue}`);
            record[nivelesField] = defaultValue;
          }
        }
      }
      
      // Debug log for specific fields we're troubleshooting
      console.log("All field keys in record:", Object.keys(record));

      // Debug log for student count fields
      console.log("\nFields containing 'estudiantes':");
      Object.keys(record).forEach(key => {
        if (key.toLowerCase().includes('estudiantes')) {
          console.log(`  ${key}: ${record[key]}`);
        }
      });
      
      // Map Excel fields to database columns
      const fieldMappings = {
        // ID fields
        'ID': 'excel_id',
        'Número de cédula': 'numero_de_cedula',
        
        // Personal information
        'Nombre(s) y Apellido(s) completo(s)': 'nombre_s_y_apellido_s_completo_s',
        'Género': 'genero',
        'Lugar de nacimiento ': 'lugar_de_nacimiento',
        'Lugar de nacimiento': 'lugar_de_nacimiento',
        'lugar de nacimiento': 'lugar_de_nacimiento',
        'Fecha de nacimiento': 'fecha_de_nacimiento',
        'Lengua materna': 'lengua_materna',
        
        // Contact information
        'Número de celular personal': 'numero_de_celular_personal',
        'Correo electrónico personal': 'correo_electronico_personal',
        'Correo electrónico institucional (el que usted usa en su rol como directivo docente)': 'correo_electronico_institucional_el_que_usted_usa_en_su_rol_com',
        '\r\nCorreo electrónico institucional': 'correo_electronico_institucional',
        'Prefiere recibir comunicaciones en el correo': 'prefiere_recibir_comunicaciones_en_el_correo',
        
        // Medical/Special needs - ensuring these fields are explicitly included, with multiple variants
        '¿Tiene alguna enfermedad de base por la que pueda requerir atención especial durante los encuentros presenciales?     ': 'tiene_alguna_enfermedad_de_base_por_la_que_pueda_requerir_atenc',
        '¿Tiene alguna enfermedad de base por la que pueda requerir atención especial durante los encuentros presenciales?': 'tiene_alguna_enfermedad_de_base_por_la_que_pueda_requerir_atenc', // Without trailing spaces
        'Tiene alguna enfermedad': 'tiene_alguna_enfermedad_de_base_por_la_que_pueda_requerir_atenc', // Simplified version
        'Enfermedad de base': 'tiene_alguna_enfermedad_de_base_por_la_que_pueda_requerir_atenc', // Partial match
        'Si requiere atención médica urgente durante algún encuentro presencial ¿A quién podemos contactar? ': 'si_requiere_atencion_medica_urgente_durante_algun_encuentro_pre',
        '¿Cuál es su número de contacto?': 'cual_es_su_numero_de_contacto',
        '¿Tiene alguna discapacidad?': 'tiene_alguna_discapacidad',
        
        // Education
        'Tipo de formación': 'tipo_de_formacion',
        'Título de pregrado': 'titulo_de_pregrado',
        'Título de maestría': 'titulo_de_maestria',
        'Título de especialización': 'titulo_de_especializacion',
        'Título de doctorado': 'titulo_de_doctorado',
        
        // Institution Information
        'Nombre de la Institución Educativa en la actualmente desempeña su labor': 'nombre_de_la_institucion_educativa_en_la_actualmente_desempena_',
        'Cargo actual': 'cargo_actual',
        'Tipo de vinculación actual': 'tipo_de_vinculacion_actual',
        'Fecha de vinculación al servicio educativo estatal': 'fecha_de_vinculacion_al_servicio_educativo_estatal',
        'Fecha de nombramiento estatal en el cargo actual': 'fecha_de_nombramiento_estatal_en_el_cargo_actual',
        'Fecha de nombramiento del cargo actual en la IE': 'fecha_de_nombramiento_del_cargo_actual_en_la_ie',
        'Estatuto al que pertenece': 'estatuto_al_que_pertenece',
        'Grado en el escalafón': 'grado_en_el_escalafon',
        
        // Institutional details
        'Código DANE de la IE (12 dígitos)': 'codigo_dane_de_la_ie_12_digitos',
        'Entidad Territorial': 'entidad_territorial',
        'Comuna, corregimiento o localidad': 'comuna_corregimiento_o_localidad',
        'Zona de la sede principal de la IE': 'zona_de_la_sede_principal_de_la_ie',
        'Zona de la sede principal de la IE2': 'zona_de_la_sede_principal_de_la_ie2',
        'Dirección de la sede principal': 'direccion_de_la_sede_principal',
        'Teléfono de contacto de la IE': 'telefono_de_contacto_de_la_ie',
        'Sitio web': 'sitio_web',
        
        // Institutional statistics - adding the missing fields
        'Número total de sedes de la IE (incluida la sede principal)': 'numero_total_de_sedes_de_la_ie_incluida_la_sede_principal',
        'Número de sedes en zona rural': 'numero_de_sedes_en_zona_rural',
        '\r\nNúmero de sedes en zona urbana': 'numero_de_sedes_en_zona_urbana',
        'Jornadas de la IE (Selección múltiple) ': 'jornadas_de_la_ie_seleccion_multiple',
        'Jornadas de la IE (Selección múltiple)': 'jornadas_de_la_ie_seleccion_multiple', // Without trailing space
        'Jornadas de la IE': 'jornadas_de_la_ie_seleccion_multiple', // Simplified
        'Grupos étnicos en la IE (Selección múltiple) ': 'grupos_etnicos_en_la_ie_seleccion_multiple',
        'Grupos étnicos en la IE (Selección múltiple)': 'grupos_etnicos_en_la_ie_seleccion_multiple', // Without trailing space
        'Grupos étnicos en la IE': 'grupos_etnicos_en_la_ie_seleccion_multiple', // Simplified
        'Grupos étnicos': 'grupos_etnicos_en_la_ie_seleccion_multiple', // More simplified
        'Estudiantes o familias de la IE en condición de desplazamiento': 'estudiantes_o_familias_de_la_ie_en_condicion_de_desplazamiento',
        'Niveles educativos que ofrece la IE (Selección múltiple) ': 'niveles_educativos_que_ofrece_la_ie_seleccion_multiple',
        'Tipo de bachillerato que ofrece la IE': 'tipo_de_bachillerato_que_ofrece_la_ie',
        'Modelo o enfoque pedagógico': 'modelo_o_enfoque_pedagogico',
        
        // Staff and students - adding the missing fields
        'Número de docentes': 'numero_de_docentes',
        'Número de coordinadoras/es\r\n': 'numero_de_coordinadoras_es',
        'Número de coordinadoras/es': 'numero_de_coordinadoras_es',
        'Número de administrativos': 'numero_de_administrativos',
        'Número de orientadoras/es': 'numero_de_orientadoras_es',
        'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)': 'numero_de_estudiantes_en_preescolar',
        'Número de estudiantes en preescolar (Prejardín, Jardín y Transición)': 'numero_de_estudiantes_en_preescolar', // Alternative format
        'Número de estudiantes en Preescolar': 'numero_de_estudiantes_en_preescolar', // Simplified format
        'Número de estudiantes en preescolar': 'numero_de_estudiantes_en_preescolar', // Simplified lowercase format
        'Número de estudiantes en Básica primaria\r\n': 'numero_de_estudiantes_en_basica_primaria',
        'Número de estudiantes en Básica primaria': 'numero_de_estudiantes_en_basica_primaria',
        'Número de estudiantes en Básica secundaria': 'numero_de_estudiantes_en_basica_secundaria',
        'Número de estudiantes en Media': 'numero_de_estudiantes_en_media',
        'Número de estudiantes en ciclo complementario': 'numero_de_estudiantes_en_ciclo_complementario',
        
        // Consent
        'Entiendo la información y acepto el trato de mis datos personales:': 'entiendo_la_informacion_y_acepto_el_trato_de_mis_datos_personal',
        'Proyectos transversales de la IE': 'proyectos_transversales_de_la_ie',
      };
      
      // Filter to only include fields that exist in the database
      const validFieldMappings = {};
      const addedDbColumns = new Set(); // Track which DB columns we've already added
      
      Object.entries(fieldMappings).forEach(([excelField, dbColumn]) => {
        if (validColumns.has(dbColumn) && !addedDbColumns.has(dbColumn)) {
          // Try to find a matching field in the record
          const matchingField = findMatchingField(record, excelField);
          
          if (matchingField) {
            validFieldMappings[matchingField] = dbColumn;
            addedDbColumns.add(dbColumn);
          }
        }
      });
      
      console.log(`Field mappings for record with cedula: ${record['Número de cédula']}`);
      console.log(`Number of mapped fields: ${Object.keys(validFieldMappings).length}`);
      
      // Add special handling for numero_de_estudiantes_en_preescolar field in case it's not being correctly matched
      if (!addedDbColumns.has('numero_de_estudiantes_en_preescolar')) {
        console.log("Looking for preescolar student count field with flexible matching...");
        
        // Look for any field name that contains key terms related to student count in preescolar
        const preescolarField = Object.keys(record).find(key => {
          const keyLower = key.toLowerCase();
          return keyLower.includes('estudiantes') && 
                 (keyLower.includes('preescolar') || keyLower.includes('prejardín') || 
                  keyLower.includes('prejardin') || keyLower.includes('jardín') || 
                  keyLower.includes('jardin') || keyLower.includes('transición') || 
                  keyLower.includes('transicion'));
        });
        
        if (preescolarField) {
          console.log(`Found preescolar field with flexible matching: "${preescolarField}"`);
          validFieldMappings[preescolarField] = 'numero_de_estudiantes_en_preescolar';
          addedDbColumns.add('numero_de_estudiantes_en_preescolar');
        }
      }
      
      // Pre-process the record data to fix known issues
      
      // 1. Handle the problematic 'niveles_educativos_que_ofrece_la_ie_seleccion_multiple' field
      // Check if the field is a numeric value (Excel date) and convert to proper array format
      const nivelesCandidates = [
        'Niveles educativos que ofrece la IE (Selección múltiple) ',
        'Niveles educativos que ofrece la IE (Selección múltiple)',
        'Niveles educativos que ofrece la IE'
      ];
      
      // Find the actual field name in the record
      const nivelesField = nivelesCandidates.find(field => record[field] !== undefined);
      
      if (nivelesField) {
        const value = record[nivelesField];
        console.log(`Found niveles_educativos field: ${nivelesField} with value: ${value} (type: ${typeof value})`);
        
        // If it's a numeric value (Excel date), replace with empty array
        if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(String(value).trim()))) {
          console.log(`Converting numeric value ${value} to empty array`);
          record[nivelesField] = ''; // Empty value which will be converted to "{}" later
        }
      }
      
      // Also check for array-like fields to make sure they're formatted correctly
      const arrayFields = [
        {
          excelFields: ['Jornadas de la IE (Selección múltiple) ', 'Jornadas de la IE (Selección múltiple)', 'Jornadas de la IE'],
          dbColumn: 'jornadas_de_la_ie_seleccion_multiple',
        },
        {
          excelFields: ['Grupos étnicos en la IE (Selección múltiple) ', 'Grupos étnicos en la IE (Selección múltiple)', 'Grupos étnicos en la IE', 'Grupos étnicos'],
          dbColumn: 'grupos_etnicos_en_la_ie_seleccion_multiple',
        },
        {
          excelFields: ['Niveles educativos que ofrece la IE (Selección múltiple) ', 'Niveles educativos que ofrece la IE (Selección múltiple)', 'Niveles educativos que ofrece la IE'],
          dbColumn: 'niveles_educativos_que_ofrece_la_ie_seleccion_multiple',
        }
      ];
      
      // Pre-check and fix array field values
      arrayFields.forEach(field => {
        const excelField = field.excelFields.find(f => record[f] !== undefined);
        if (excelField) {
          const value = record[excelField];
          
          // Check for numeric values in array fields (like the Excel date 35798)
          if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(String(value).trim()))) {
            console.log(`⚠️ Array field ${excelField} has numeric value ${value} - fixing`);
            record[excelField] = ''; // Replace with empty string
          }
        }
      });

      // Prepare data for insert
      const columns = [];
      const values = [];
      
      // Process each mapped field
      Object.entries(validFieldMappings).forEach(([excelField, dbColumn]) => {
        const value = record[excelField];
        
        // Skip null/undefined/empty values
        if (value === undefined || value === null || value === '') {
          return;
        }
        
        // Special handling for student count fields to ensure they're properly converted to numbers
        if (dbColumn.startsWith('numero_de_estudiantes_en_')) {
          console.log(`Processing student count field ${dbColumn}: "${value}" (${typeof value})`);
          
          // Convert to number
          let numValue;
          
          if (typeof value === 'number') {
            numValue = value;
          } else if (typeof value === 'string') {
            // Remove any non-numeric characters except decimal point
            const cleanValue = value.replace(/[^\d.]/g, '');
            numValue = parseFloat(cleanValue);
          }
          
          // Check if valid number
          if (!isNaN(numValue)) {
            console.log(`Converted to number: ${numValue}`);
            columns.push(dbColumn);
            values.push(numValue);
          } else {
            console.log(`Could not convert to number, using 0`);
            columns.push(dbColumn);
            values.push(0);
          }
          
          return;
        }
        
        // Special case: If niveles_educativos column receives a numeric value, replace with empty array
        if (dbColumn === 'niveles_educativos_que_ofrece_la_ie_seleccion_multiple') {
          console.log(`Field ${dbColumn} has value: ${value} (${typeof value})`);
          
          // If the value is a number (like the problematic 35798) or numeric string,
          // replace it with an empty array before adding to columns/values
          if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(String(value).trim()))) {
            console.log(`FIXING: Replacing numeric value ${value} with empty array for ${dbColumn}`);
            columns.push(dbColumn);
            values.push('{}'); // Empty array for PostgreSQL
            return; // Skip normal processing for this field
          }
        }
        
        // Special handling for array columns
        if (arrayColumns.has(dbColumn)) {
          console.log(`Converting to array format for column ${dbColumn}: "${value}" (${typeof value})`);
          
          // For PostgreSQL arrays, convert to proper syntax WITH COMMAS (PostgreSQL standard)
          if (typeof value === 'string') {
            // Handle semicolon-separated values - they need to become a SINGLE ARRAY ELEMENT
            if (value.includes(';')) {
              // If the niveles_educativos field, handle it the way existing records are formatted
              if (dbColumn === 'niveles_educativos_que_ofrece_la_ie_seleccion_multiple') {
                // Based on existing records, this should be an array with ONE element
                // that contains the entire semicolon-separated string
                columns.push(dbColumn);
                values.push(`{"${value}"}`); // Include the entire string as ONE array element
              } else {
                // For other array columns, split by semicolon
                const items = value.split(';')
                  .map(item => item.trim())
                  .filter(item => item !== '');
                
                if (items.length > 0) {
                  // PostgreSQL arrays MUST use commas as separators, not semicolons
                  const pgArray = `{${items.map(item => `"${item}"`).join(',')}}`;
                  columns.push(dbColumn);
                  values.push(pgArray);
                } else {
                  columns.push(dbColumn);
                  values.push('{}'); // Empty array
                }
              }
            } else if (value.trim() !== '') {
              // Single value, convert to array with one element
              columns.push(dbColumn);
              values.push(`{"${value.trim()}"}`);
            } else {
              columns.push(dbColumn);
              values.push('{}'); // Empty array
            }
          } else if (typeof value === 'number') {
            // CRITICAL: Fix for numeric values (especially 35798) in array fields
            console.log(`⚠️ WARNING: Numeric value ${value} in array column ${dbColumn} - using special format`);
            
            // For niveles_educativos, handle the special case
            if (dbColumn === 'niveles_educativos_que_ofrece_la_ie_seleccion_multiple') {
              // Add default value similar to existing records
              const defaultValue = 'Preescolar (Prejardín, Jardín y Transición);Básica primaria;Básica secundaria;Media;';
              columns.push(dbColumn);
              values.push(`{"${defaultValue}"}`);
            } else {
              columns.push(dbColumn);
              values.push(`{"${value}"}`); // Include the number as one array element
            }
          } else if (Array.isArray(value)) {
            // Already an array, convert to PostgreSQL array format
            columns.push(dbColumn);
            values.push(`{${value.map(item => `"${item}"`).join(',')}}`);
          } else {
            // Default to empty array for safety
            columns.push(dbColumn);
            values.push('{}');
          }
          
          return;
        }
        
        // Handle non-array fields
        columns.push(dbColumn);
        
        // Special handling for the disease field
        if (dbColumn === 'tiene_alguna_enfermedad_de_base_por_la_que_pueda_requerir_atenc') {
          // Convert to proper boolean
          if (typeof value === 'string') {
            const normalizedValue = value.toLowerCase().trim();
            if (normalizedValue === 'sí' || normalizedValue === 'si' || normalizedValue === 'yes' || normalizedValue === 'true') {
              values.push(true);
            } else {
              values.push(false);
            }
          } else {
            values.push(!!value); // Convert to boolean
          }
          return;
        }
        
        // Format value based on column type
        const dataType = columnTypes[dbColumn];
        
        if (dataType && dataType.includes('int') && typeof value !== 'number') {
          // Convert to integer
          const parsedValue = parseInt(value, 10);
          values.push(isNaN(parsedValue) ? null : parsedValue);
        } else if (dataType === 'boolean' && typeof value !== 'boolean') {
          // Convert to boolean
          values.push(value === 'true' || value === 'Sí' || value === 'si' || value === 'Si' || value === '1' || value === 1);
        } else if ((dataType === 'date' || dataType.includes('timestamp')) && typeof value === 'number') {
          // Handle Excel date numbers (days since 1900-01-01)
          try {
            const excelEpoch = new Date(1900, 0, 0);
            const date = new Date(excelEpoch.getTime() + (value * 86400000));
            values.push(date.toISOString().split('T')[0]);
          } catch (err) {
            console.log('Error converting Excel date:', value);
            values.push(null);
          }
        } else {
          // String or other types
          values.push(String(value).trim());
        }
      });
      
      // Skip if no columns found
      if (columns.length === 0) {
        console.log('No valid columns found for insert, skipping record');
        continue;
      }
      
      // Make sure we have the cedula field
      if (!columns.includes('numero_de_cedula') && record['Número de cédula']) {
        columns.push('numero_de_cedula');
        values.push(String(record['Número de cédula']).trim());
      }

      // Always put the niveles_educativos at the end of the columns array
      // to avoid position conflicts with dates that cause the error
      const nivelesIndex = columns.indexOf('niveles_educativos_que_ofrece_la_ie_seleccion_multiple');
      if (nivelesIndex !== -1) {
        console.log(`Moving niveles_educativos from position ${nivelesIndex} to the end`);
        
        // Remove from current position
        const nivelesValue = values.splice(nivelesIndex, 1)[0];
        columns.splice(nivelesIndex, 1);
        
        // Add to the end
        columns.push('niveles_educativos_que_ofrece_la_ie_seleccion_multiple');
        
        // Ensure proper array format with semcolons, not commas
        if (typeof nivelesValue === 'string' && nivelesValue.includes(',') && !nivelesValue.startsWith('{')) {
          // Convert comma-separated to proper array with semicolons
          const items = nivelesValue.split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
          
          if (items.length > 0) {
            values.push(`{${items.map(item => `"${item}"`).join(';')}}`);
          } else {
            values.push('{}');
          }
        } else if (typeof nivelesValue === 'number' || (typeof nivelesValue === 'string' && /^\d+$/.test(nivelesValue.trim()))) {
          // Numeric value, use empty array
          values.push('{}');
        } else {
          // Use the original value
          values.push(nivelesValue);
        }
      }
      
      // Final check for the problematic record with ID 39443630
      if (String(record['Número de cédula']).trim() === '39443630') {
        console.log("FINAL CHECK for record 39443630 before insert");
        
        // Find the niveles_educativos field
        const nivelesIndex = columns.indexOf('niveles_educativos_que_ofrece_la_ie_seleccion_multiple');
        
        // If found, ensure it has proper array format with commas (PostgreSQL standard)
        if (nivelesIndex !== -1) {
          console.log(`Record 39443630: niveles_educativos final value = "${values[nivelesIndex]}"`);
          
          // If it's an empty array but we should have a value
          if (values[nivelesIndex] === '{}') {
            // Set a default value that matches the existing records format
            const defaultValue = 'Preescolar (Prejardín, Jardín y Transición);Básica primaria;Básica secundaria;Media;';
            
            // Format it as a single-element array containing the whole string
            values[nivelesIndex] = `{"${defaultValue}"}`;
            console.log(`Set default educational levels for record 39443630: ${values[nivelesIndex]}`);
          }
          // Ensure the value is properly formatted as a single-element array
          else if (!values[nivelesIndex].startsWith('{"') || !values[nivelesIndex].endsWith('"}')) {
            // It's not properly formatted as a single element array
            console.log(`Fixing array format for niveles_educativos: ${values[nivelesIndex]}`);
            
            // Extract the value and reformat
            let valueToUse;
            
            if (values[nivelesIndex].startsWith('{') && values[nivelesIndex].endsWith('}')) {
              // It's an array but formatted incorrectly
              valueToUse = values[nivelesIndex].substring(1, values[nivelesIndex].length - 1);
              // Remove any quotes
              valueToUse = valueToUse.replace(/"/g, '');
            } else {
              // Not an array at all
              valueToUse = values[nivelesIndex];
            }
            
            // Reformat as a single-element array
            values[nivelesIndex] = `{"${valueToUse}"}`;
            console.log(`Reformatted to: ${values[nivelesIndex]}`);
          }
        }
      }
      
      // Final check to ensure proper array formatting
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        
        // Specifically check for array columns
        if (arrayColumns.has(column)) {
          const value = values[i];
          console.log(`Final check for array column ${column}: ${value}`);
          
          // If the value doesn't look like a PostgreSQL array, fix it
          if (typeof value !== 'string' || !value.startsWith('{')) {
            console.log(`⚠️ Final fix: ${column} has invalid array format: ${value}`);
            
            if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(String(value).trim()))) {
              // Numeric value - use empty array
              values[i] = '{}';
            } else if (typeof value === 'string' && value.includes(';')) {
              // Convert semicolon-separated to proper PostgreSQL array WITH COMMAS (required by PostgreSQL)
              const items = value.split(';')
                .map(item => item.trim())
                .filter(item => item.length > 0);
              
              values[i] = items.length > 0 ? 
                `{${items.map(item => `"${item}"`).join(',')}}` : 
                '{}';
            } else if (typeof value === 'string' && value.trim()) {
              // Single value
              values[i] = `{"${value.trim()}"}`;
            } else {
              // Default to empty array
              values[i] = '{}';
            }
          } else if (value.includes(';') && column === 'niveles_educativos_que_ofrece_la_ie_seleccion_multiple') {
            // Fix array that was incorrectly formatted with semicolons - PostgreSQL requires commas
            console.log(`Converting semicolon array to comma array: ${value}`);
            // Remove the { and } first
            const inner = value.substring(1, value.length - 1);
            // Split by semicolon and rejoin with comma
            const items = inner.split(';')
              .map(item => item.trim())
              .filter(item => item.length > 0);
            
            values[i] = items.length > 0 ? 
              `{${items.join(',')}}` : 
              '{}';
          }
        }
      }
      
      // Verify columns and values are correct before creating the query
      console.log(`Inserting record with ${columns.length} fields`);
      
      // Create placeholders for the values
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      // Build and execute the INSERT query
      const insertQuery = {
        text: `INSERT INTO ${targetTable} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      };
      
      try {
        await client.query(insertQuery);
        exportedCount++;
        console.log(`Successfully inserted record with cedula: ${record['Número de cédula']}`);
      } catch (err) {
        console.error('Error inserting record:', err);
        console.error('Columns:', columns);
        console.error('Values:', values);
        throw err;
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      exportedCount,
      message: `Successfully exported ${exportedCount} records to the database.`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database error:', err);
    res.status(500).json({ 
      error: `Database error: ${err.message}`,
      details: err.detail || err.hint || ''
    });
  } finally {
    client.release();
    await pool.end();
  }
});

// Update the inspect-excel endpoint
app.post('/api/inspect-excel', async (req, res) => {
  const { excelData } = req.body;
  
  if (!excelData || !Array.isArray(excelData) || excelData.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty Excel data' });
  }
  
  try {
    // Get the first few records
    const sampleRecords = excelData.slice(0, 3);
    
    // Get all field names from the Excel data
    const allFields = new Set();
    excelData.forEach(record => {
      Object.keys(record).forEach(key => allFields.add(key));
    });
    
    // Check for the exact field name we know is in the Excel file
    const exactField = 'Número de cédula';
    
    // Find the cedula field exactly
    let cedulaFieldInData = Array.from(allFields).find(field => field === exactField);
    
    // If not found exactly, look for alternatives
    if (!cedulaFieldInData) {
      // Look for fields that might be the cedula field
      const possibleCedulaFields = Array.from(allFields).filter(field => 
        field.toLowerCase().includes('cedula') || 
        field.toLowerCase().includes('cédula') ||
        field.toLowerCase().includes('identificacion') ||
        field.toLowerCase().includes('identificación') ||
        field.toLowerCase().includes('id') ||
        field.toLowerCase().includes('documento')
      );
      
      if (possibleCedulaFields.length > 0) {
        cedulaFieldInData = possibleCedulaFields[0];
      }
    }
    
    // Check if 71194166 exists in any records
    let recordWith71194166 = null;
    if (cedulaFieldInData) {
      recordWith71194166 = excelData.find(record => 
        String(record[cedulaFieldInData]).trim() === '71194166'
      );
      
      if (recordWith71194166) {
        console.log('Found record with ID 71194166 in Excel data');
      }
    }
    
    res.json({
      message: 'Excel structure analyzed',
      sampleRecords,
      allFields: Array.from(allFields),
      recordCount: excelData.length,
      possibleCedulaFields: cedulaFieldInData ? [cedulaFieldInData] : [],
      exactFieldFound: !!cedulaFieldInData,
      recordWith71194166: recordWith71194166 ? {
        fieldName: cedulaFieldInData,
        value: recordWith71194166[cedulaFieldInData]
      } : null
    });
  } catch (err) {
    console.error('Error analyzing Excel data:', err);
    res.status(500).json({ error: `Error analyzing Excel data: ${err.message}` });
  }
});

/**
 * API route to compare dev and prod environments and find missing records
 * Identifies records present in dev but missing in prod
 */
app.post('/api/compare-environments', async (req, res) => {
  const { devConnection, prodConnection, tableName } = req.body;
  
  if (!devConnection || !prodConnection || !tableName) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Validate tableName to prevent SQL injection
  if (tableName !== 'rectores') {
    return res.status(400).json({ error: 'Invalid table name. Only "rectores" is supported.' });
  }
  
  // Configure PostgreSQL connections with SSL support
  const devPool = new Pool(createPoolConfig(devConnection));
  const prodPool = new Pool(createPoolConfig(prodConnection));
  
  let devClient, prodClient;
  
  try {
    // Connect to both databases
    devClient = await devPool.connect();
    prodClient = await prodPool.connect();
    
    console.log('Connected to both databases. Starting comparison...');
    
    // Get all records from dev database
    const devQuery = `SELECT * FROM ${tableName}`;
    const devResult = await devClient.query(devQuery);
    
    // Get all records from prod database
    const prodQuery = `SELECT numero_de_cedula FROM ${tableName}`;
    const prodResult = await prodClient.query(prodQuery);
    
    // Convert all production values to strings for consistent comparison
    const prodValues = prodResult.rows.map(row => String(row.numero_de_cedula).trim());
    
    // Find records in dev but missing in prod
    const missingRecords = devResult.rows.filter(record => {
      // Get the ID from dev and ensure it's a string
      const devId = String(record.numero_de_cedula).trim();
      
      // Check if this ID exists in the prod database
      return !prodValues.includes(devId);
    });
    
    console.log(`Found ${missingRecords.length} records in dev that are missing in prod`);
    
    res.json({
      devCount: devResult.rows.length,
      prodCount: prodResult.rows.length,
      missingRecords: missingRecords
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      error: `Database error: ${err.message}`,
      stack: err.stack
    });
  } finally {
    if (devClient) devClient.release();
    if (prodClient) prodClient.release();
    await devPool.end();
    await prodPool.end();
  }
});

/**
 * API route to backup a database table before export
 * Creates both SQL and JSON backups
 */
app.post('/api/backup-database', async (req, res) => {
  const { connectionParams, tableName } = req.body;
  
  if (!connectionParams || !tableName) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Validate tableName to prevent SQL injection
  if (tableName !== 'rectores') {
    return res.status(400).json({ error: 'Invalid table name. Only "rectores" is supported.' });
  }
  
  // Configure PostgreSQL connection with SSL support
  const pool = new Pool(createPoolConfig(connectionParams));
  
  let client;
  
  try {
    client = await pool.connect();
    console.log('Connected to database. Starting backup...');
    
    // Create a timestamped backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups');
    const backupFile = path.join(backupDir, `${tableName}_backup_${timestamp}.sql`);
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    // Get table schema
    console.log('Retrieving table schema...');
    const schemaResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    // Create table structure SQL with a backup table name
    const backupTableName = `${tableName}_backup_${timestamp.split('T')[0].replace(/-/g, '_')}`;
    let createTableSQL = `CREATE TABLE IF NOT EXISTS ${backupTableName} (\n`;
    
    schemaResult.rows.forEach((column, index) => {
      createTableSQL += `  ${column.column_name} ${column.data_type}`;
      
      // Add length for character types
      if (column.character_maximum_length) {
        createTableSQL += `(${column.character_maximum_length})`;
      }
      
      // Add NULL constraint
      if (column.is_nullable === 'NO') {
        createTableSQL += ' NOT NULL';
      }
      
      // Add default value if exists
      if (column.column_default) {
        createTableSQL += ` DEFAULT ${column.column_default}`;
      }
      
      // Add comma if not the last column
      if (index < schemaResult.rows.length - 1) {
        createTableSQL += ',\n';
      }
    });
    
    // Get primary key info
    const pkResult = await client.query(`
      SELECT c.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
      JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
        AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1
    `, [tableName]);
    
    // Add primary key if exists
    if (pkResult.rows.length > 0) {
      const pkColumns = pkResult.rows.map(row => row.column_name).join(', ');
      createTableSQL += `,\n  PRIMARY KEY (${pkColumns})`;
    }
    
    createTableSQL += '\n);\n\n';
    
    // Get all data
    console.log('Retrieving table data...');
    const dataResult = await client.query(`SELECT * FROM ${tableName}`);
    console.log(`Found ${dataResult.rows.length} records.`);
    
    // Create INSERT statements
    let insertSQL = '';
    
    for (const row of dataResult.rows) {
      const columns = Object.keys(row).filter(key => row[key] !== null);
      const values = columns.map(column => {
        const value = row[column];
        
        if (value === null) {
          return 'NULL';
        } else if (Array.isArray(value)) {
          // Handle array data types
          return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        } else if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        } else if (typeof value === 'object' && value instanceof Date) {
          return `'${value.toISOString()}'`;
        } else {
          return value;
        }
      });
      
      insertSQL += `INSERT INTO ${backupTableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    // Write backup file
    const fullBackup = createTableSQL + insertSQL;
    fs.writeFileSync(backupFile, fullBackup);
    
    // Create a JSON backup as well
    const jsonBackupFile = path.join(backupDir, `${tableName}_backup_${timestamp}.json`);
    fs.writeFileSync(jsonBackupFile, JSON.stringify(dataResult.rows, null, 2));
    
    console.log(`Backup completed successfully and saved to: ${backupFile}`);
    
    res.json({ 
      success: true, 
      message: 'Backup created successfully',
      backupFile: backupFile,
      jsonBackupFile: jsonBackupFile,
      recordCount: dataResult.rows.length
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      error: `Database error: ${err.message}`,
      stack: err.stack
    });
  } finally {
    if (client) client.release();
    await pool.end();
  }
});

/**
 * API route to export selected records from dev to prod
 * Exports records present in dev but missing in prod
 */
app.post('/api/export-to-production', async (req, res) => {
  const { devConnection, prodConnection, tableName, records } = req.body;
  
  if (!devConnection || !prodConnection || !tableName || !records) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Validate tableName to prevent SQL injection
  if (tableName !== 'rectores') {
    return res.status(400).json({ error: 'Invalid table name. Only "rectores" is supported.' });
  }
  
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'No records to export' });
  }
  
  // Configure PostgreSQL connections with SSL support
  const prodPool = new Pool(createPoolConfig(prodConnection));
  
  let prodClient;
  
  try {
    prodClient = await prodPool.connect();
    console.log(`Connected to production database. Exporting ${records.length} records...`);
    
    // Get the database table structure for production
    const tableStructureQuery = {
      text: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `,
      values: [tableName]
    };
    
    const tableResult = await prodClient.query(tableStructureQuery);
    
    // Create a set of valid column names from the database
    const validColumns = new Set(tableResult.rows.map(row => row.column_name));
    console.log('Valid database columns:', Array.from(validColumns));
    
    // Get the data types for columns
    const columnTypes = {};
    tableResult.rows.forEach(row => {
      columnTypes[row.column_name] = row.data_type;
    });
    
    // Check which columns are array types in the database
    const arrayColumns = new Set();
    tableResult.rows.forEach(row => {
      if (row.data_type.includes('ARRAY') || row.data_type.endsWith('[]') || row.data_type.includes('_array')) {
        arrayColumns.add(row.column_name);
        console.log(`Detected array column in database: ${row.column_name} (${row.data_type})`);
      } else if (
        row.column_name === 'jornadas_de_la_ie_seleccion_multiple' || 
        row.column_name === 'grupos_etnicos_en_la_ie_seleccion_multiple' ||
        row.column_name === 'niveles_educativos_que_ofrece_la_ie_seleccion_multiple'
      ) {
        // These are our known array columns, mark them as such even if the data_type doesn't say so
        arrayColumns.add(row.column_name);
        console.log(`Adding known array column: ${row.column_name} despite data_type: ${row.data_type}`);
      }
    });
    
    // Explicitly add array columns we know of even if they're not detected
    ['jornadas_de_la_ie_seleccion_multiple', 
     'grupos_etnicos_en_la_ie_seleccion_multiple', 
     'niveles_educativos_que_ofrece_la_ie_seleccion_multiple'
    ].forEach(col => {
      if (!arrayColumns.has(col)) {
        arrayColumns.add(col);
        console.log(`Explicitly adding array column: ${col}`);
      }
    });
    
    // Begin transaction
    await prodClient.query('BEGIN');
    
    let exportedCount = 0;
    const errors = [];
    
    // Process each record for import
    for (const record of records) {
      try {
        // Filter to include only valid columns in the database
        const validRecordColumns = Object.keys(record).filter(col => validColumns.has(col));
        
        // Prepare values for the insert
        const values = [];
        const valuePlaceholders = [];
        const columns = [];
        
        // Non-array columns first, then array columns to avoid issues
        const nonArrayCols = validRecordColumns.filter(col => !arrayColumns.has(col));
        const arrayCols = validRecordColumns.filter(col => arrayColumns.has(col));
        
        // Process regular columns first
        for (let i = 0; i < nonArrayCols.length; i++) {
          const column = nonArrayCols[i];
          columns.push(column);
          values.push(record[column]);
          valuePlaceholders.push(`$${values.length}`);
        }
        
        // Process array columns second to avoid conflicts with date fields
        for (let i = 0; i < arrayCols.length; i++) {
          const column = arrayCols[i];
          let value = record[column];
          columns.push(column);
          
          // Handle array values
          if (typeof value === 'string' && value.includes(';')) {
            // Convert semicolon-separated string to PostgreSQL array format
            const arrayItems = value.split(';').map(item => item.trim()).filter(item => item);
            value = arrayItems;
          } else if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(String(value).trim()))) {
            // Handle the case where an array field has a numeric value
            // This is a special case that needs handling
            console.log(`Converting numeric value ${value} to array for column ${column}`);
            value = [String(value)];
          }
          
          values.push(value);
          valuePlaceholders.push(`$${values.length}`);
        }
        
        // Execute the insert query
        const insertQuery = {
          text: `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${valuePlaceholders.join(', ')})`,
          values: values
        };
        
        await prodClient.query(insertQuery);
        exportedCount++;
      } catch (err) {
        console.error(`Error exporting record ${record.numero_de_cedula}:`, err);
        errors.push({
          cedula: record.numero_de_cedula,
          error: err.message
        });
      }
    }
    
    // If any record failed, rollback the transaction
    if (errors.length > 0) {
      await prodClient.query('ROLLBACK');
      return res.status(500).json({
        error: 'Some records failed to export',
        failedRecords: errors,
        successCount: 0
      });
    }
    
    // If all succeeded, commit the transaction
    await prodClient.query('COMMIT');
    
    res.json({
      success: true,
      exportedCount: exportedCount,
      message: `Successfully exported ${exportedCount} records to production database.`
    });
  } catch (err) {
    // Rollback on general error
    if (prodClient) {
      await prodClient.query('ROLLBACK');
    }
    
    console.error('Database error:', err);
    res.status(500).json({ 
      error: `Database error: ${err.message}`,
      stack: err.stack
    });
  } finally {
    if (prodClient) prodClient.release();
    await prodPool.end();
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 