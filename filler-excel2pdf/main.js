const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');
const { PDFDocument } = require('pdf-lib');
const { parse, format } = require('date-fns');
const sanitize = require('sanitize-filename');

async function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadURL('http://localhost:3000');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Field mapping
const fieldMapping = {
  'Nombre(s) y Apellido(s) completo(s)': 'Nombre(s) y Apellido(s) completo(s)',
  'Número de cédula': 'Número de cédula',
  'Género': 'Género',
  'Lugar de nacimiento ': 'Lugar de nacimiento',
  'Fecha de nacimiento': 'Fecha de nacimiento',
  'Lengua materna': 'Lengua materna',
  'Número de celular personal': 'Número de celular personal',
  'Correo electrónico personal': 'Correo electrónico personal',
  'Correo electrónico institucional': 'Correo electrónico institucional',
  'Prefiere recibir comunicaciones en el correo': 'Prefiere recibir comunicaciones en el correo',
  '¿Tiene alguna enfermedad de base por la que pueda requerir atención especial durante los encuentros presenciales?': '¿Tiene alguna enfermedad de base por la que pueda requerir atención especial durante los encuentros presenciales?',
  'Si la respuesta a la pregunta anterior fue afirmativa, indique cuál enfermedad y que requerimientos puede tener': 'Si la respuesta a la pregunta anterior fue afirmativa, indique cuál enfermedad y que requerimientos puede tener',
  '¿Tiene alguna discapacidad?': '¿Tiene alguna discapacidad?',
  'Si su respuesta fue afirmativa ¿Cuál es?': 'Si su respuesta fue afirmativa ¿Cuál es?',
  'Tipo de formación': 'Tipo de formación',
  'Título de pregrado': 'Título de pregrado',
  'Título de especialización': 'Título de especialización',
  'Título de maestría': 'Título de maestría',
  'Título de doctorado': 'Título de doctorado',
  'Otros títulos, ¿cuáles?': 'Otros títulos, ¿cuáles?',
  'Nombre de la Institución Educativa en la actualmente desempeña su labor': 'Nombre de la Institución Educativa en la actualmente desempeña su labor',
  'Cargo actual': 'Cargo actual',
  'Tipo de vinculación actual': 'Tipo de vinculación actual',
  'Fecha de vinculación al servicio educativo estatal': 'Fecha de vinculación al servicio educativo estatal',
  'Fecha de nombramiento estatal en el cargo actual': 'Fecha de nombramiento estatal en el cargo actual',
  'Fecha de nombramiento del cargo actual en la IE': 'Fecha de nombramiento del cargo actual en la IE',
  'Estatuto al que pertenece': 'Estatuto al que pertenece',
  'Grado en el escalafón': 'Grado en el escalafón',
  'Código DANE de la IE (12 dígitos)': 'Código DANE de la IE (12 dígitos)',
  'Entidad Territorial': 'Entidad Territorial',
  'Comuna, corregimiento o localidad': 'Comuna, corregimiento o localidad',
  'Zona de la sede principal de la IE': 'Zona de la sede principal de la IE',
  'Dirección de la sede principal': 'Dirección de la sede principal',
  'Teléfono de contacto de la IE': 'Teléfono de contacto de la IE',
  'Sitio web': 'Sitio web',
  'Número total de sedes de la IE (incluida la sede principal)': 'Número total de sedes de la IE (incluida la sede principal)',
  'Número de sedes en zona rural': 'Número de sedes en zona rural',
  'Número de sedes en zona urbana': 'Número de sedes en zona urbana',
  'Jornadas de la IE (Selección múltiple)': 'Jornadas de la IE (Selección múltiple)',
  'Grupos étnicos en la IE (Selección múltiple)': 'Grupos étnicos en la IE (Selección múltiple)',
  'Proyectos transversales de la IE': 'Proyectos transversales de la IE',
  'Estudiantes o familias de la IE en condición de desplazamiento': 'Estudiantes o familias de la IE en condición de desplazamiento',
  'Niveles educativos que ofrece la IE (Selección múltiple)': 'Niveles educativos que ofrece la IE (Selección múltiple)',
  'Tipo de bachillerato que ofrece la IE': 'Tipo de bachillerato que ofrece la IE',
  'Modelo o enfoque pedagógico': 'Modelo o enfoque pedagógico',
  'Número de docentes': 'Número de docentes',
  'Número de coordinadoras/es': 'Número de coordinadoras/es',
  'Número de administrativos': 'Número de administrativos',
  'Número de orientadoras/es': 'Número de orientadoras/es',
  'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)': 'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)',
  'Número de estudiantes en Básica primaria': 'Número de estudiantes en Básica primaria',
  'Número de estudiantes en Básica secundaria': 'Número de estudiantes en Básica secundaria',
  'Número de estudiantes en Media': 'Número de estudiantes en Media',
  'Número de estudiantes en ciclo complementario': 'Número de estudiantes en ciclo complementario',
};

// Date fields
const dateFields = [
  'Fecha de nacimiento',
  'Fecha de vinculación al servicio educativo estatal',
  'Fecha de nombramiento estatal en el cargo actual',
  'Fecha de nombramiento del cargo actual en la IE',
];

// Multiple-choice fields
const multiChoiceFields = [
  'Jornadas de la IE (Selección múltiple)',
  'Grupos étnicos en la IE (Selección múltiple)',
  'Niveles educativos que ofrece la IE (Selección múltiple)',
];

ipcMain.handle('generate-pdfs', async (event, { excelPath, pdfPath }) => {
  try {
    // Read Excel file
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Prompt for output directory
    const outputDir = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (outputDir.canceled) {
      return { success: false, message: 'Output directory selection canceled' };
    }

    const baseOutputPath = outputDir.filePaths[0];
    let successCount = 0;
    const errors = [];

    // Group data by Entidad Territorial
    const groupedData = {};
    data.forEach((row, index) => {
      const entidad = row['Entidad Territorial'] || 'Unknown';
      if (!groupedData[entidad]) {
        groupedData[entidad] = [];
      }
      groupedData[entidad].push({ ...row, originalIndex: index + 2 });
    });

    // Load PDF template
    const pdfBytes = await fs.readFile(pdfPath);

    // Process each Entidad Territorial
    for (const [entidad, rows] of Object.entries(groupedData)) {
      try {
        // Sanitize folder name
        const folderName = sanitize(
          entidad
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
        );
        const folderPath = path.join(baseOutputPath, folderName);
        await fs.mkdir(folderPath, { recursive: true });

        // Sort rows by Nombre(s) y Apellido(s) completo(s)
        rows.sort((a, b) => {
          const nameA = (a['Nombre(s) y Apellido(s) completo(s)'] || '').toLowerCase();
          const nameB = (b['Nombre(s) y Apellido(s) completo(s)'] || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        // Process each row
        for (let i = 0; i < rows.length; i++) {
          try {
            const row = rows[i];
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const form = pdfDoc.getForm();

            // Género logic
            let generoValue = row['Género'] || '';
            if (generoValue === 'Otro') {
              generoValue = row['Si su respuesta fue Otro ¿Cuál es?'] || '';
            }

            // Lengua materna logic
            let lenguaMaternaValue = row['Lengua materna'] || '';
            if (lenguaMaternaValue === 'Otra') {
              lenguaMaternaValue = row['Si su respuesta fue Otra ¿Cuál es?'] || '';
            }

            // Populate PDF fields
            for (const [excelCol, pdfField] of Object.entries(fieldMapping)) {
              if (row[excelCol] !== undefined && row[excelCol] !== null) {
                let value = row[excelCol].toString();

                // Date fields
                if (dateFields.includes(excelCol)) {
                  try {
                    let parsedDate;
                    if (typeof value === 'number') {
                      parsedDate = new Date((value - 25569) * 86400 * 1000);
                    } else {
                      parsedDate = parse(value, 'M/d/yyyy', new Date());
                    }
                    value = format(parsedDate, 'dd/MM/yyyy');
                  } catch (e) {
                    errors.push(`Row ${row.originalIndex}: Invalid date format for ${excelCol}: ${value}`);
                    continue;
                  }
                }

                // Multiple-choice fields
                if (multiChoiceFields.includes(excelCol)) {
                  value = value.replace(/;/g, '     ');
                }

                // Género and Lengua materna
                if (excelCol === 'Género') {
                  value = generoValue;
                } else if (excelCol === 'Lengua materna') {
                  value = lenguaMaternaValue;
                }

                // Set PDF field
                try {
                  const field = form.getTextField(pdfField);
                  field.setText(value);
                } catch (e) {
                  errors.push(`Row ${row.originalIndex}: PDF field ${pdfField} not found`);
                }
              }
            }

            // Generate filename
            let filename = row['Nombre(s) y Apellido(s) completo(s)'] || `Record_${row.originalIndex}`;
            filename = sanitize(
              filename
                .replace(/\s+/g, '_')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
            );
            const numberedPrefix = String(i + 1).padStart(4, '0');
            const outputFilePath = path.join(folderPath, `${numberedPrefix}_${filename}.pdf`);

            // Save PDF
            const pdfBytesOut = await pdfDoc.save();
            await fs.writeFile(outputFilePath, pdfBytesOut);
            successCount++;
          } catch (e) {
            errors.push(`Row ${rows[i].originalIndex}: Error processing - ${e.message}`);
          }
        }
      } catch (e) {
        errors.push(`Entidad Territorial ${entidad}: Error creating folder or processing - ${e.message}`);
      }
    }

    return {
      success: true,
      message: `Generated ${successCount} PDFs in ${baseOutputPath}. ${errors.length} errors.`,
      errors,
    };
  } catch (e) {
    return { success: false, message: `Error: ${e.message}`, errors: [] };
  }
});