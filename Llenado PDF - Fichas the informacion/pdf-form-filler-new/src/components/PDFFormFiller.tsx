import React, { useState } from 'react';
import { Upload, Button, Table, message, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { read, utils } from 'xlsx';
import { PDFDocument } from 'pdf-lib';
import { PDFTextField } from 'pdf-lib';

interface ExcelData {
  [key: string]: string | number;
}

const PDFFormFiller: React.FC = () => {
  const [excelData, setExcelData] = useState<ExcelData[]>([]);
  const [pdfTemplate, setPdfTemplate] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [pdfFieldNames, setPdfFieldNames] = useState<string[]>([]);
  
  // List of columns that should not be treated as dates
  const nonDateColumns = [
    'Estatuto al que pertenece',
    'Comuna, corregimiento o localidad',
    'Número total de sedes de la IE (incluida la sede principal)',
    'Número de sedes en zona urbana',
    'Número de sedes en zona rural',
    'Número de docentes',
    'Número de coordinadoras/es',
    'Número de administrativos',
    'Número de orientadoras/es',
    'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)',
    'Número de estudiantes en Básica primaria',
    'Número de estudiantes en Básica secundaria',
    'Número de estudiantes en Media',
    'Número de estudiantes en ciclo complementario',
    'Grado en el escalafón',
    'Jornadas de la IE',
    'Grupos étnicos en la IE',
    // Add other column names that should not be treated as dates
  ];

  // List of columns that should be converted to uppercase
  const uppercaseColumns = [
    'Nombre(s) y Apellido(s) completo(s)',
    // Add other column names that should be converted to uppercase
  ];

  // Function to format Excel date number to dd/mm/yyyy
  const formatExcelDate = (excelDate: number): string => {
    // Excel dates are number of days since January 1, 1900
    // JavaScript dates are milliseconds since January 1, 1970
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const excelEpoch = new Date(1900, 0, 1).getTime();
    const jsDate = new Date(excelEpoch + (excelDate - 1) * millisecondsPerDay);
    
    // Format as dd/mm/yyyy
    const day = String(jsDate.getDate()).padStart(2, '0');
    const month = String(jsDate.getMonth() + 1).padStart(2, '0');
    const year = jsDate.getFullYear();
    
    return `${day}/${month}/${year}`;
  };

  // Function to check if a value is an Excel date
  const isExcelDate = (value: any, columnName: string): boolean => {
    // Skip columns that should not be treated as dates
    if (nonDateColumns.includes(columnName)) {
      return false;
    }
    
    // Skip numeric fields that should never be treated as dates
    if (columnName === 'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)' ||
        columnName === 'Número de estudiantes en Básica primaria' ||
        columnName === 'Número de estudiantes en Básica secundaria' ||
        columnName === 'Número de estudiantes en Media' ||
        columnName === 'Número de estudiantes en ciclo complementario' ||
        columnName === 'Número de docentes' ||
        columnName === 'Número de coordinadoras/es' ||
        columnName === 'Número de administrativos' ||
        columnName === 'Número de orientadoras/es' ||
        columnName === 'Número total de sedes de la IE (incluida la sede principal)' ||
        columnName === 'Número de sedes en zona urbana' ||
        columnName === 'Número de sedes en zona rural' ||
        columnName.toLowerCase().includes('número') ||  // Skip any column with "número" in the name
        columnName.toLowerCase().includes('numero')) {  // Skip any column with "numero" in the name
      return false;
    }
    
    // Excel dates are typically large numbers between 1 and 2958465 (Dec 31, 9999)
    // But we need to be more precise to avoid false positives
    if (typeof value !== 'number') {
      return false;
    }
    
    // Check if the value is in a reasonable range for dates
    // Excel dates start from 1 (Jan 1, 1900)
    if (value < 1 || value > 2958465) {
      return false;
    }
    
    // Additional check: try to convert to a date and see if it's reasonable
    try {
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      const excelEpoch = new Date(1900, 0, 1).getTime();
      const jsDate = new Date(excelEpoch + (value - 1) * millisecondsPerDay);
      
      // Check if the resulting date is reasonable (between 1900 and 2100)
      const year = jsDate.getFullYear();
      return year >= 1900 && year <= 2100;
    } catch (error) {
      return false;
    }
  };

  // Function to format a value based on its column
  const formatValue = (value: string | number, columnName: string): string => {
    if (value === undefined || value === null) return '';
    
    // Handle numeric fields - ensure they are treated as numbers
    if (columnName === 'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)' ||
        columnName === 'Número de estudiantes en Básica primaria' ||
        columnName === 'Número de estudiantes en Básica secundaria' ||
        columnName === 'Número de estudiantes en Media' ||
        columnName === 'Número de estudiantes en ciclo complementario' ||
        columnName === 'Número de docentes' ||
        columnName === 'Número de coordinadoras/es' ||
        columnName === 'Número de administrativos' ||
        columnName === 'Número de orientadoras/es' ||
        columnName === 'Número total de sedes de la IE (incluida la sede principal)' ||
        columnName === 'Número de sedes en zona urbana' ||
        columnName === 'Número de sedes en zona rural') {
      // Convert to number and back to string to ensure proper formatting
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) return '';
      // Format as integer without decimal places
      return Math.round(numValue).toString();
    }
    
    // Convert to string if it's a number
    const stringValue = value.toString();
    
    // Handle semicolon-separated values for specific columns
    if (columnName === 'Jornadas de la IE' || columnName === 'Grupos étnicos en la IE') {
      return stringValue.replace(/;/g, '     ');
    }
    
    // Handle "Niveles educativos que ofrece la IE (Selección múltiple)" column
    if (columnName === 'Niveles educativos que ofrece la IE (Selección múltiple)') {
      // First replace "Preescolar (Prejardín, Jardín y Transición)" with "Preescolar"
      let formattedValue = stringValue.replace(/Preescolar \(Prejardín, Jardín y Transición\)/g, 'Preescolar');
      // Then replace semicolons with 5 spaces
      return formattedValue.replace(/;/g, '     ');
    }
    
    // Handle uppercase conversion for specific columns
    if (uppercaseColumns.includes(columnName)) {
      return stringValue.toUpperCase();
    }
    
    return stringValue;
  };

  const handleExcelUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json<ExcelData>(worksheet);
      
      // Debug logging for Excel data
      console.log('Excel Data Sample:');
      if (data.length > 0) {
        console.log('First record columns:', Object.keys(data[0]));
        
        // Check for preescolar column with different possible names
        const preescolarColumnNames = [
          'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)',
          'Número de estudiantes en Preescolar',
          'Estudiantes en Preescolar',
          'Preescolar',
          'Estudiantes Preescolar'
        ];
        
        console.log('Checking for preescolar column with these possible names:', preescolarColumnNames);
        
        for (const columnName of preescolarColumnNames) {
          if (data[0][columnName] !== undefined) {
            console.log(`Found preescolar column: "${columnName}" with value:`, data[0][columnName]);
            console.log(`Value type: ${typeof data[0][columnName]}`);
          } else {
            console.log(`Preescolar column "${columnName}" not found in Excel data`);
          }
        }
        
        // Log all column names to help identify the correct one
        console.log('All column names in Excel:');
        Object.keys(data[0]).forEach(key => {
          console.log(`- ${key}: ${data[0][key]} (type: ${typeof data[0][key]})`);
        });
        
        // Check for any column that might be related to preescolar
        console.log('Checking for any column that might be related to preescolar:');
        Object.keys(data[0]).forEach(key => {
          if (key.toLowerCase().includes('preescolar') || 
              key.toLowerCase().includes('estudiante') || 
              key.toLowerCase().includes('pre')) {
            console.log(`- Potential preescolar column: "${key}" with value: ${data[0][key]} (type: ${typeof data[0][key]})`);
          }
        });
      }
      
      setExcelData(data);
      
      // If PDF is already loaded, check for missing fields
      if (pdfTemplate && data.length > 0) {
        checkMissingFields(data[0]);
      }
      
      message.success('Excel file loaded successfully');
    } catch (error) {
      message.error('Error reading Excel file');
      console.error(error);
    }
    return false;
  };

  const handlePDFUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      setPdfTemplate(buffer);
      
      // Extract field names from the PDF
      const pdfDoc = await PDFDocument.load(buffer);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      const fieldNames = fields.map(field => field.getName());
      
      // Debug logging for PDF fields
      console.log('PDF Fields:');
      console.log('All PDF field names:', fieldNames);
      
      // Check for preescolar fields
      const preescolarFields = fieldNames.filter(f => 
        f.toLowerCase().includes('preescolar') || 
        (f.toLowerCase().includes('estudiante') && f.toLowerCase().includes('pre'))
      );
      console.log('Potential preescolar fields in PDF:', preescolarFields);
      
      setPdfFieldNames(fieldNames);
      
      message.success('PDF template loaded successfully');
    } catch (error) {
      message.error('Error reading PDF template');
      console.error(error);
    }
    return false;
  };

  // Function to check which Excel columns are missing in the PDF
  const checkMissingFields = (row: ExcelData) => {
    if (!pdfTemplate || !pdfFieldNames.length) return;
    
    const excelColumns = Object.keys(row);
    const missing = excelColumns.filter(column => {
      // Check if the column name exists in the PDF fields
      const exactMatch = pdfFieldNames.includes(column);
      
      // If no exact match, check for partial matches
      if (!exactMatch) {
        // For "Jornadas de la IE (Selección múltiple)", check for any field with "jornada" in the name
        if (column === 'Jornadas de la IE (Selección múltiple)') {
          return !pdfFieldNames.some(field => field.toLowerCase().includes('jornada'));
        }
        
        // For "Grupos étnicos en la IE", check for any field with "grupo" or "etnico" in the name
        if (column === 'Grupos étnicos en la IE') {
          return !pdfFieldNames.some(field => 
            field.toLowerCase().includes('grupo') || 
            field.toLowerCase().includes('etnico')
          );
        }
        
        // For "Número de estudiantes en Preescolar", check for any field with "estudiante" and "preescolar" in the name
        if (column === 'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)') {
          return !pdfFieldNames.some(field => 
            field.toLowerCase().includes('estudiante') && 
            field.toLowerCase().includes('preescolar')
          );
        }
      }
      
      return !exactMatch;
    });
    
    setMissingFields(missing);
    
    if (missing.length > 0) {
      message.warning(`Some Excel columns are missing in the PDF: ${missing.join(', ')}`);
    }
  };

  const generatePDFs = async () => {
    if (!pdfTemplate || excelData.length === 0) {
      message.error('Please upload both Excel file and PDF template');
      return;
    }

    setLoading(true);
    try {
      for (const row of excelData) {
        const pdfDoc = await PDFDocument.load(pdfTemplate);
        const form = pdfDoc.getForm();
        
        // Debug logging for preescolar field
        console.log('Processing row for preescolar:');
        
        // Try different possible column names for preescolar
        const preescolarColumnNames = [
          'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)',
          'Número de estudiantes en Preescolar',
          'Estudiantes en Preescolar',
          'Preescolar',
          'Estudiantes Preescolar'
        ];
        
        let preescolarValue = null;
        let preescolarColumnName = '';
        
        // Find the correct column name
        for (const columnName of preescolarColumnNames) {
          if (row[columnName] !== undefined) {
            preescolarValue = row[columnName];
            preescolarColumnName = columnName;
            console.log(`Found preescolar value in column "${columnName}":`, preescolarValue);
            console.log(`Preescolar value type: ${typeof preescolarValue}`);
            break;
          }
        }
        
        // If not found with standard names, try to find any column with preescolar in the name
        if (!preescolarValue) {
          for (const key of Object.keys(row)) {
            if (key.toLowerCase().includes('preescolar') || 
                (key.toLowerCase().includes('estudiante') && key.toLowerCase().includes('pre'))) {
              preescolarValue = row[key];
              preescolarColumnName = key;
              console.log(`Found preescolar value in column "${key}":`, preescolarValue);
              console.log(`Preescolar value type: ${typeof preescolarValue}`);
              break;
            }
          }
        }
        
        // Fill form fields based on Excel data
        Object.entries(row).forEach(([key, value]) => {
          try {
            if (key === 'Número de estudiantes en Preescolar (Prejardín, Jardín y Transición)' || 
                key === 'Número de estudiantes en Preescolar') {
              console.log(`Processing preescolar field "${key}" with value:`, value);
              console.log(`Value type: ${typeof value}`);
              console.log(`Is Excel date? ${isExcelDate(value, key)}`);
              console.log(`Formatted value: ${formatValue(value, key)}`);
            }
            
            const field = form.getTextField(key);
            if (field) {
              // Check if the value is an Excel date and format it
              if (isExcelDate(value, key)) {
                const formattedDate = formatExcelDate(value as number);
                console.log(`Formatted as date: ${formattedDate}`);
                field.setText(formattedDate);
              } else {
                const formattedValue = formatValue(value, key);
                console.log(`Formatted value: ${formattedValue}`);
                field.setText(formattedValue);
              }
            }
          } catch (error) {
            console.warn(`Field ${key} not found in PDF`);
          }
        });

        // Special handling for "Zona de la sede principal de la IE" and "Zona de la sede principal de la IE2"
        try {
          const zonaField = form.getTextField('Zona de la sede principal de la IE');
          const zona2Field = form.getTextField('Zona de la sede principal de la IE2');
          
          if (zonaField && zona2Field) {
            const zonaValue = row['Zona de la sede principal de la IE'];
            const zona2Value = row['Zona de la sede principal de la IE2'];
            
            if (zonaValue === zona2Value) {
              // If both values are the same, only set one field
              zonaField.setText(formatValue(zonaValue, 'Zona de la sede principal de la IE'));
              zona2Field.setText(''); // Leave the second field empty
            } else {
              // If values are different, set both fields
              zonaField.setText(formatValue(zonaValue, 'Zona de la sede principal de la IE'));
              zona2Field.setText(formatValue(zona2Value, 'Zona de la sede principal de la IE2'));
            }
          }
        } catch (error) {
          console.warn('Error handling zona fields:', error);
        }

        // Enhanced handling for "Jornadas de la IE (Selección múltiple)"
        try {
          // Get the jornadas value from Excel data
          const jornadasValue = row['Jornadas de la IE (Selección múltiple)'];
          console.log('Original jornadas value:', jornadasValue);
          
          if (!jornadasValue) {
            console.warn('Jornadas value is missing in Excel data');
          } else {
            // Format the jornadas value
            const formattedJornadasValue = formatValue(jornadasValue, 'Jornadas de la IE (Selección múltiple)');
            console.log('Formatted jornadas value:', formattedJornadasValue);
            
            // Try different possible field names
            const possibleFieldNames = [
              'Jornadas de la IE (Selección múltiple)',
              'Jornadas de la IE',
              'Jornadas',
              'Jornada',
              'Jornada de la IE',
              'Jornada IE',
              'Jornada IE (Selección múltiple)'
            ];
            
            let jornadasField = null;
            let jornadasFieldName = '';
            
            // Try to find the field with one of the possible names
            for (const fieldName of possibleFieldNames) {
              try {
                const field = form.getTextField(fieldName);
                if (field) {
                  jornadasField = field;
                  jornadasFieldName = fieldName;
                  console.log(`Found jornadas field with name: ${fieldName}`);
                  break;
                }
              } catch (e) {
                // Field not found with this name, continue to next
              }
            }
            
            if (jornadasField) {
              try {
                console.log(`Setting jornadas field "${jornadasFieldName}" with value: ${formattedJornadasValue}`);
                jornadasField.setText(formattedJornadasValue);
              } catch (error) {
                console.error(`Error setting jornadas field "${jornadasFieldName}":`, error);
              }
            } else {
              console.warn('Jornadas field not found in PDF with any of the possible names');
              
              // As a fallback, try to find any field that might be related to jornadas
              const allFields = form.getFields();
              for (const field of allFields) {
                const fieldName = field.getName();
                if (fieldName.toLowerCase().includes('jornada')) {
                  console.log(`Found potential jornadas field: ${fieldName}`);
                  try {
                    console.log(`Setting potential jornadas field "${fieldName}" with value: ${formattedJornadasValue}`);
                    // Check if the field is a text field before setting text
                    if (field instanceof PDFTextField) {
                      field.setText(formattedJornadasValue);
                    }
                  } catch (error) {
                    console.error(`Error setting potential jornadas field "${fieldName}":`, error);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn('Error handling jornadas field:', error);
        }

        // Special handling for "Grupos étnicos en la IE"
        try {
          const gruposValue = row['Grupos étnicos en la IE'];
          if (gruposValue) {
            const formattedGruposValue = formatValue(gruposValue, 'Grupos étnicos en la IE');
            
            // Try to find any field related to grupos étnicos
            const allFields = form.getFields();
            for (const field of allFields) {
              const fieldName = field.getName();
              if (fieldName.toLowerCase().includes('grupo') || fieldName.toLowerCase().includes('etnico')) {
                console.log(`Found potential grupos étnicos field: ${fieldName}`);
                try {
                  if (field instanceof PDFTextField) {
                    field.setText(formattedGruposValue);
                  }
                } catch (error) {
                  console.error(`Error setting grupos étnicos field "${fieldName}":`, error);
                }
              }
            }
          }
        } catch (error) {
          console.warn('Error handling grupos étnicos field:', error);
        }

        // Save the filled PDF
        const filledPdfBytes = await pdfDoc.save();
        const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Get the name from "Nombre(s) y Apellido(s) completo(s)" column
        const nameValue = row['Nombre(s) y Apellido(s) completo(s)'];
        const fileName = nameValue ? `${formatValue(nameValue, 'Nombre(s) y Apellido(s) completo(s)')}.pdf` : `filled_form_${Object.values(row)[0]}.pdf`;
        
        // Download the PDF
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
      message.success('PDFs generated successfully');
    } catch (error) {
      message.error('Error generating PDFs');
      console.error(error);
    }
    setLoading(false);
  };

  const columns = excelData.length > 0
    ? Object.keys(excelData[0]).map(key => ({
        title: key,
        dataIndex: key,
        key: key,
        render: (value: any) => {
          if (isExcelDate(value, key)) {
            return formatExcelDate(value);
          }
          return formatValue(value, key);
        }
      }))
    : [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space>
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={handleExcelUpload}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>Upload Excel</Button>
          </Upload>

          <Upload
            accept=".pdf"
            beforeUpload={handlePDFUpload}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>Upload PDF Template</Button>
          </Upload>

          <Button
            type="primary"
            onClick={generatePDFs}
            loading={loading}
            disabled={!pdfTemplate || excelData.length === 0}
          >
            Generate PDFs
          </Button>
        </Space>

        {missingFields.length > 0 && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4 }}>
            <h4>Missing Fields in PDF</h4>
            <p>The following Excel columns are missing in the PDF form:</p>
            <ul>
              {missingFields.map(field => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <p>These fields will not be filled in the generated PDFs.</p>
          </div>
        )}

        {pdfFieldNames.length > 0 && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
            <h4>PDF Form Fields</h4>
            <p>The following fields are available in the PDF form:</p>
            <ul style={{ maxHeight: 200, overflowY: 'auto' }}>
              {pdfFieldNames.map(field => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}

        {excelData.length > 0 && (
          <Table
            dataSource={excelData}
            columns={columns}
            scroll={{ x: true }}
            size="small"
          />
        )}
      </Space>
    </div>
  );
};

export default PDFFormFiller; 