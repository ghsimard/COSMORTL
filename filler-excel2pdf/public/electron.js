const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const XLSX = require('xlsx');
const { PDFDocument } = require('pdf-lib');
const { parse, format } = require('date-fns');
const sanitize = require('sanitize-filename');

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// Check if we're running in Electron or web browser
const isElectron = typeof window !== 'undefined' && window.process && window.process.type;

// Function to convert Excel serial number to JavaScript Date
function excelSerialNumberToDate(serialNumber) {
  console.log('Converting Excel date:', serialNumber);
  // Excel's date system starts from December 30, 1899
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  // Subtract 1 from serial number to align with JavaScript's date system
  const date = new Date(excelEpoch.getTime() + ((serialNumber - 1) * millisecondsPerDay));
  console.log('Converted to date:', date);
  return date;
}

// Function to handle file selection in web environment
async function selectFileWeb(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const file = e.target.files[0];
      resolve(file);
    };
    input.click();
  });
}

// Function to handle directory selection in web environment
async function selectDirectoryWeb() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.directory = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      const directory = files[0].webkitRelativePath.split('/')[0];
      resolve({ filePaths: [directory] });
    };
    input.click();
  });
}

// Function to save file in web environment
async function saveFileWeb(data, filename) {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// IPC handler for getting PDF fields
ipcMain.handle('get-pdf-fields', async (event, { pdfPath }) => {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    return fields.map(field => field.getName());
  } catch (e) {
    return { success: false, message: `Error reading PDF fields: ${e.message}` };
  }
});

// IPC handler for getting Excel columns
ipcMain.handle('get-excel-columns', async (event, { excelPath }) => {
  try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Get the range of the sheet
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    // Read headers from the first row
    const headers = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      const cell = sheet[cellAddress];
      if (cell && cell.v) {
        headers.push(cell.v.toString());
      } else {
        // If no header, use column letter as fallback
        headers.push(XLSX.utils.encode_col(C));
      }
    }
    
    return headers;
  } catch (e) {
    return { success: false, message: `Error reading Excel columns: ${e.message}` };
  }
});

// IPC handler for generating PDFs
ipcMain.handle('generate-pdfs', async (event, { excelPath, pdfPath, fieldMapping, otherGenderMapping }) => {
  try {
    // Validate fieldMapping
    if (!fieldMapping || typeof fieldMapping !== 'object') {
      return { 
        success: false, 
        message: 'Field mapping is required and must be an object',
        errors: ['No field mapping provided']
      };
    }

    // Read Excel file
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Group data by Entidad Territorial
    const groupedData = {};
    data.forEach(row => {
      const entidad = row['Entidad Territorial'] || 'Unknown';
      if (!groupedData[entidad]) {
        groupedData[entidad] = [];
      }
      groupedData[entidad].push(row);
    });

    // Sort each group by Nombre(s) y Apellido(s) completo(s)
    for (const entidad in groupedData) {
      groupedData[entidad].sort((a, b) => {
        const nameA = (a['Nombre(s) y Apellido(s) completo(s)'] || '').toLowerCase();
        const nameB = (b['Nombre(s) y Apellido(s) completo(s)'] || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    // Load PDF template
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

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

    // Process each Entidad Territorial group
    for (const [entidad, rows] of Object.entries(groupedData)) {
      try {
        // Create folder for Entidad Territorial
        const folderName = sanitize(
          entidad
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
        );
        const folderPath = path.join(baseOutputPath, folderName);
        await fs.mkdir(folderPath, { recursive: true });

        // Process each row in the group
        for (let i = 0; i < rows.length; i++) {
          try {
            const row = rows[i];
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const form = pdfDoc.getForm();

            // Populate PDF fields using the user-provided mapping
            for (const [pdfField, excelColumn] of Object.entries(fieldMapping)) {
              try {
                const field = form.getTextField(pdfField);
                let value = row[excelColumn];
                
                if (value === undefined || value === null) {
                  continue;
                }

                value = value.toString();

                // Handle special cases for specific fields
                if (pdfField === 'Género' && value === 'Otro' && otherGenderMapping[pdfField]) {
                  const otherValue = row[otherGenderMapping[pdfField]];
                  if (otherValue) {
                    value = otherValue;
                  }
                }

                // Format dates for fields containing "Fecha"
                if (pdfField.toLowerCase().includes('fecha')) {
                  try {
                    // Convert Excel serial number to date
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      // Excel dates are days since December 30, 1899
                      // 25569 is the number of days between Dec 30, 1899 and Jan 1, 1970 (JS epoch)
                      // Add one day to compensate for timezone differences
                      const jsDate = new Date((numValue - 25568) * 86400 * 1000);
                      
                      // Format as dd/MM/yyyy
                      const day = String(jsDate.getDate()).padStart(2, '0');
                      const month = String(jsDate.getMonth() + 1).padStart(2, '0');
                      const year = jsDate.getFullYear();
                      
                      value = `${day}/${month}/${year}`;
                    }
                  } catch (e) {
                    console.error(`Error formatting date for field ${pdfField}:`, e);
                  }
                }

                // Handle fields where Excel column header contains "Selección múltiple"
                if (excelColumn && excelColumn.toLowerCase().includes('selección múltiple')) {
                  value = value.replace(/;/g, '   ');
                }

                field.setText(value);
              } catch (e) {
                errors.push(`Row ${i + 2}: Error setting field ${pdfField}: ${e.message}`);
              }
            }

            // Generate filename with sequential number starting from 001
            let filename = row['Nombre(s) y Apellido(s) completo(s)'] || `Record_${i + 1}`;
            filename = sanitize(
              filename
                .replace(/\s+/g, '_')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
            );
            const sequentialNumber = String(i + 1).padStart(3, '0');
            const outputFilePath = path.join(folderPath, `${sequentialNumber}_${filename}.pdf`);

            // Save PDF
            const pdfBytesOut = await pdfDoc.save();
            await fs.writeFile(outputFilePath, pdfBytesOut);
            successCount++;
          } catch (e) {
            errors.push(`Row ${i + 2}: Error processing - ${e.message}`);
          }
        }
      } catch (e) {
        errors.push(`Error processing Entidad Territorial ${entidad}: ${e.message}`);
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

// Web-compatible version of the generate-pdfs function
async function generatePDFsWeb(excelFile, pdfFile, fieldMapping, otherGenderMapping) {
  try {
    // Validate fieldMapping
    if (!fieldMapping || typeof fieldMapping !== 'object') {
      return { 
        success: false, 
        message: 'Field mapping is required and must be an object',
        errors: ['No field mapping provided']
      };
    }

    // Read Excel file
    const excelData = await excelFile.arrayBuffer();
    const workbook = XLSX.read(excelData);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Group data by Entidad Territorial
    const groupedData = {};
    data.forEach(row => {
      const entidad = row['Entidad Territorial'] || 'Unknown';
      if (!groupedData[entidad]) {
        groupedData[entidad] = [];
      }
      groupedData[entidad].push(row);
    });

    // Sort each group by Nombre(s) y Apellido(s) completo(s)
    for (const entidad in groupedData) {
      groupedData[entidad].sort((a, b) => {
        const nameA = (a['Nombre(s) y Apellido(s) completo(s)'] || '').toLowerCase();
        const nameB = (b['Nombre(s) y Apellido(s) completo(s)'] || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    // Load PDF template
    const pdfData = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfData);
    const form = pdfDoc.getForm();

    let successCount = 0;
    const errors = [];

    // Process each Entidad Territorial group
    for (const [entidad, rows] of Object.entries(groupedData)) {
      try {
        // Process each row in the group
        for (let i = 0; i < rows.length; i++) {
          try {
            const row = rows[i];
            const pdfDoc = await PDFDocument.load(pdfData);
            const form = pdfDoc.getForm();

            // Populate PDF fields using the user-provided mapping
            for (const [pdfField, excelColumn] of Object.entries(fieldMapping)) {
              try {
                const field = form.getTextField(pdfField);
                let value = row[excelColumn];
                
                if (value === undefined || value === null) {
                  continue;
                }

                value = value.toString();

                // Handle special cases for specific fields
                if (pdfField === 'Género' && value === 'Otro' && otherGenderMapping[pdfField]) {
                  const otherValue = row[otherGenderMapping[pdfField]];
                  if (otherValue) {
                    value = otherValue;
                  }
                }

                // Format dates for fields containing "Fecha"
                if (pdfField.toLowerCase().includes('fecha')) {
                  try {
                    // Convert Excel serial number to date
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      // Excel dates are days since December 30, 1899
                      // 25569 is the number of days between Dec 30, 1899 and Jan 1, 1970 (JS epoch)
                      // Add one day to compensate for timezone differences
                      const jsDate = new Date((numValue - 25568) * 86400 * 1000);
                      
                      // Format as dd/MM/yyyy
                      const day = String(jsDate.getDate()).padStart(2, '0');
                      const month = String(jsDate.getMonth() + 1).padStart(2, '0');
                      const year = jsDate.getFullYear();
                      
                      value = `${day}/${month}/${year}`;
                    }
                  } catch (e) {
                    console.error(`Error formatting date for field ${pdfField}:`, e);
                  }
                }

                // Handle fields where Excel column header contains "Selección múltiple"
                if (excelColumn && excelColumn.toLowerCase().includes('selección múltiple')) {
                  value = value.replace(/;/g, '   ');
                }

                field.setText(value);
              } catch (e) {
                errors.push(`Row ${i + 2}: Error setting field ${pdfField}: ${e.message}`);
              }
            }

            // Generate filename with sequential number starting from 001
            let filename = row['Nombre(s) y Apellido(s) completo(s)'] || `Record_${i + 1}`;
            filename = sanitize(
              filename
                .replace(/\s+/g, '_')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
            );
            const sequentialNumber = String(i + 1).padStart(3, '0');
            const outputFilename = `${entidad}/${sequentialNumber}_${filename}.pdf`;

            // Save PDF
            const pdfBytesOut = await pdfDoc.save();
            await saveFileWeb(pdfBytesOut, outputFilename);
            successCount++;
          } catch (e) {
            errors.push(`Row ${i + 2}: Error processing - ${e.message}`);
          }
        }
      } catch (e) {
        errors.push(`Error processing Entidad Territorial ${entidad}: ${e.message}`);
      }
    }

    return {
      success: true,
      message: `Generated ${successCount} PDFs. ${errors.length} errors.`,
      errors,
    };
  } catch (e) {
    return { success: false, message: `Error: ${e.message}`, errors: [] };
  }
}

// Export functions for web use
if (!isElectron) {
  window.PDFGenerator = {
    selectFile: selectFileWeb,
    selectDirectory: selectDirectoryWeb,
    generatePDFs: generatePDFsWeb
  };
}

// Electron-specific code
if (isElectron) {
  function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // Load the index.html from a url if in development
    // or the local file if in production
    mainWindow.loadURL(
      isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../build/index.html')}`
    );

    // Open the DevTools in development mode.
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  }

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  app.whenReady().then(createWindow);

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
} 