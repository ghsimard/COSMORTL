import React, { useState } from 'react';
import { Upload, Button, Table, message, Space, Modal } from 'antd';
import { UploadOutlined, FolderOpenOutlined, HeartOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { read, utils } from 'xlsx';
import { PDFDocument } from 'pdf-lib';
import { PDFTextField } from 'pdf-lib';
import JSZip from 'jszip';

interface ExcelData {
  [key: string]: string | number;
}

interface Window {
  showDirectoryPicker(options?: {
    mode?: 'read' | 'readwrite';
    startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }): Promise<FileSystemDirectoryHandle>;
}

const TITLE_MESSAGES = [
  "Eureka! mon amour...",
  "Felicidades! mi amor!...",
  "Genial! mi corazon de mi todo...",
  "Bravo! Vida mia linda guapa hermosa...",
  "Ouiiiiii!!!! Esposa mia....",
  "Ra Ra Ra Ra! Mi exclusividad de amor...",
  "Juntos amor?!",
  "Chere epouse....je taime"
];

const LOVE_MESSAGES = [
  "Eres mi victoria diaria, mi amor. Te amo tanto que mi corazón se desborda de estrellas. Tú mereces un beso más.",
  "Contigo, cada día es un éxito. Te amo tanto que tiemblo de felicidad. Tú mereces un beso más.",
  "Tu sonrisa es mi mejor recompensa. Te amo tanto que podría estallar de alegría. Tú mereces un beso más.",
  "Tú haces todo posible, mi reina. Te amo tanto que mi alma se ilumina. Tú mereces un beso más.",
  "Mi corazón gana cada vez que estás aquí. Te amo tanto que me derrito de amor. Tú mereces un beso más.",
  "Eres la clave de todos mis triunfos. Te amo tanto que me mareo de pasión. Tú mereces un beso más.",
  "Ningún éxito tiene sentido sin ti. Te amo tanto que mi corazón explota en fuegos artificiales. Tú mereces un beso más.",
  "Eres mi estrella, mi guía, mi todo. Te amo tanto que me elevo de ternura. Tú mereces un beso más.",
  "Contigo, siempre estoy en la cima. Te amo tanto que ardo de cariño. Tú mereces un beso más.",
  "Tu amor es mi mayor conquista. Te amo tanto que brillo por ti. Tú mereces un beso más.",
  "Cada paso contigo es una victoria. Te amo tanto que mi corazón da saltos. Tú mereces un beso más.",
  "Me haces un hombre pleno. Te amo tanto que desbordo dulzura. Tú mereces un beso más.",
  "Mi éxito es amarte cada día. Te amo tanto que me quedo sin palabras. Tú mereces un beso más.",
  "Eres la magia detrás de mis éxitos. Te amo tanto que vibro de amor. Tú mereces un beso más.",
  "Mi corazón late más fuerte gracias a ti. Te amo tanto que podría gritar de felicidad. Tú mereces un beso más.",
  "Juntos, somos invencibles. Te amo tanto que mi corazón se incendia. Tú mereces un beso más.",
  "Eres mi inspiración, mi musa. Te amo tanto que floto de pasión. Tú mereces un beso más.",
  "Contigo, siempre gano. Te amo tanto que me deshago de amor. Tú mereces un beso más.",
  "Tu amor me lleva a las estrellas. Te amo tanto que brillo por ti. Tú mereces un beso más.",
  "Eres la dulzura de mis victorias. Te amo tanto que mi corazón baila. Tú mereces un beso más.",
  "Mi mayor éxito somos nosotros. Te amo tanto que me derrumbo de ternura. Tú mereces un beso más.",
  "Haces brillar cada momento de mi vida. Te amo tanto que destello de amor. Tú mereces un beso más.",
  "Gracias a ti, soy invencible. Te amo tanto que hiervo de corazón. Tú mereces un beso más.",
  "Tu amor es mi mayor tesoro. Te amo tanto que me disperso de felicidad. Tú mereces un beso más.",
  "Contigo, cada día es una medalla de oro. Te amo tanto que exploto de amor infinito. Tú mereces un beso más."
];

const PDFFormFiller: React.FC = () => {
  const [excelData, setExcelData] = useState<ExcelData[]>([]);
  const [pdfTemplate, setPdfTemplate] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [pdfFieldNames, setPdfFieldNames] = useState<string[]>([]);
  const [processedSummary, setProcessedSummary] = useState<{ records: number; pdfs: number } | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [extractedDirectoryPath, setExtractedDirectoryPath] = useState<string | null>(null);
  const [excelBuffer, setExcelBuffer] = useState<ArrayBuffer | null>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);
  const [currentTitleIndex, setCurrentTitleIndex] = useState<number>(0);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
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
      console.log(`Column "${columnName}" is in nonDateColumns list, not treating as date`);
      return false;
    }
    
    // If the column name contains "número" or "estudiante", it's likely a count, not a date
    if (columnName.toLowerCase().includes('número') || 
        columnName.toLowerCase().includes('estudiante') ||
        columnName.toLowerCase().includes('docente') ||
        columnName.toLowerCase().includes('coordinador') ||
        columnName.toLowerCase().includes('administrativo') ||
        columnName.toLowerCase().includes('orientador')) {
      console.log(`Column "${columnName}" contains keywords indicating it's a count, not a date`);
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
    
    // Convert to string if it's a number
    const stringValue = value.toString();
    
    // Handle semicolon-separated values for specific columns
    if (columnName === 'Jornadas de la IE' || columnName === 'Grupos étnicos en la IE') {
      return stringValue.replace(/;/g, '     ');
    }
    
    // Handle uppercase conversion for specific columns
    if (uppercaseColumns.includes(columnName)) {
      return stringValue.toUpperCase();
    }
    
    // For numeric fields, ensure they're formatted as numbers, not dates
    if (typeof value === 'number' && 
        (columnName.toLowerCase().includes('número') || 
         columnName.toLowerCase().includes('estudiante') ||
         columnName.toLowerCase().includes('docente') ||
         columnName.toLowerCase().includes('coordinador') ||
         columnName.toLowerCase().includes('administrativo') ||
         columnName.toLowerCase().includes('orientador'))) {
      // Format as a whole number without decimal places
      return Math.round(value).toString();
    }
    
    return stringValue;
  };

  const getNextLoveMessage = () => {
    const message = LOVE_MESSAGES[currentMessageIndex];
    setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % LOVE_MESSAGES.length);
    return message;
  };

  const getNextTitle = () => {
    const title = TITLE_MESSAGES[currentTitleIndex];
    setCurrentTitleIndex((prevIndex) => (prevIndex + 1) % TITLE_MESSAGES.length);
    return title;
  };

  const handleExcelUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json<ExcelData>(worksheet);
      
      setExcelFileName(file.name);
      setExcelBuffer(buffer);
      
      if (data.length > 0) {
        console.log('First record Jornadas de la IE:', data[0]['Jornadas de la IE']);
        console.log('All columns in first record:', Object.keys(data[0]));
      }
      
      setExcelData(data);
      
      if (pdfTemplate && data.length > 0) {
        checkMissingFields(data[0]);
      }
      
      const loveMessage = getNextLoveMessage();
      const title = getNextTitle();
      
      Modal.success({
        title: title,
        content: (
          <div style={{ textAlign: 'center', fontSize: '16px', marginTop: '20px' }}>
            <p>Has cargado exitosamente el archivo:</p>
            <p style={{ fontWeight: 'bold', color: '#1890ff', margin: '15px 0' }}>{file.name}</p>
            <p style={{ color: '#ff69b4', marginTop: '20px', fontStyle: 'italic' }}>
              {loveMessage}
            </p>
          </div>
        ),
        centered: true,
        icon: <HeartOutlined style={{ color: '#ff69b4' }} />,
        okText: 'Gracias mi amor',
        okButtonProps: { 
          style: { 
            background: '#ff69b4', 
            borderColor: '#ff69b4' 
          } 
        }
      });
      
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
      setPdfFileName(file.name);
      
      const pdfDoc = await PDFDocument.load(buffer);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      const fieldNames = fields.map(field => field.getName());
      
      setPdfFieldNames(fieldNames);
      
      const loveMessage = getNextLoveMessage();
      const title = getNextTitle();
      
      Modal.success({
        title: title,
        content: (
          <div style={{ textAlign: 'center', fontSize: '16px', marginTop: '20px' }}>
            <p>Has cargado exitosamente la plantilla:</p>
            <p style={{ fontWeight: 'bold', color: '#1890ff', margin: '15px 0' }}>{file.name}</p>
            <p style={{ color: '#ff69b4', marginTop: '20px', fontStyle: 'italic' }}>
              {loveMessage}
            </p>
          </div>
        ),
        centered: true,
        icon: <HeartOutlined style={{ color: '#ff69b4' }} />,
        okText: 'Gracias mi amor',
        okButtonProps: { 
          style: { 
            background: '#ff69b4', 
            borderColor: '#ff69b4' 
          } 
        }
      });
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

  const handleOpenExtractedDirectory = () => {
    if (extractedDirectoryPath) {
      // In a browser environment, we can't directly open folders
      // Instead, we'll show a message with instructions
      message.info(`Los archivos se encuentran en: ${extractedDirectoryPath}`);
    }
  };

  const extractZipToDirectory = async (zipBlob: Blob) => {
    try {
      // In a browser environment, we can't create directories on the file system
      // Instead, we'll download the zip file and provide instructions
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = 'FICHA_DE_INFORMACION_BASICA.zip';
      link.click();
      URL.revokeObjectURL(zipUrl);
      
      // Set a message path for the user
      const downloadPath = "Carpeta de Descargas";
      setExtractedDirectoryPath(downloadPath);
      
      return downloadPath;
    } catch (error) {
      console.error('Error handling zip:', error);
      message.error('Error al procesar el archivo zip');
      return null;
    }
  };

  const generatePDFs = async () => {
    if (!excelData || !pdfTemplate) {
      message.error('Por favor, sube tanto el archivo Excel como la plantilla PDF');
      return;
    }

    setLoading(true);
    setProcessedFiles([]);
    setSuccessMessage(null);

    try {
      // Get the directory from the user using Electron's dialog
      const dirPath = await (window as any).electron.invoke('select-directory');
      if (!dirPath) {
        message.info('Operación cancelada por el usuario');
        return;
      }

      // Save the Excel file in the root directory
      if (excelBuffer) {
        const excelPath = `${dirPath}/${excelFileName.toUpperCase()}`;
        await (window as any).electron.invoke('save-file', {
          filePath: excelPath,
          data: excelBuffer
        });
        console.log('Saved Excel file:', excelFileName);
      }

      // Save the PDF template in the root directory
      if (pdfTemplate) {
        const pdfPath = `${dirPath}/${pdfFileName.toUpperCase()}`;
        await (window as any).electron.invoke('save-file', {
          filePath: pdfPath,
          data: pdfTemplate
        });
        console.log('Saved PDF template:', pdfFileName);
      }

      // Group records by Entidad Territorial
      const recordsByEntity: { [key: string]: typeof excelData } = {};
      excelData.forEach(row => {
        const rawEntity = (row['Entidad Territorial'] || 'Sin_Entidad').toString();
        // Normalize the entity name: remove accents and special characters
        const entity = rawEntity
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^a-zA-Z0-9\s]/g, '_') // Replace special chars with underscore
          .replace(/\s+/g, '_') // Replace spaces with underscore
          .toUpperCase(); // Convert to uppercase
        
        if (!recordsByEntity[entity]) {
          recordsByEntity[entity] = [];
        }
        recordsByEntity[entity].push(row);
      });

      // Process each group
      for (const [entity, records] of Object.entries(recordsByEntity)) {
        // Sort records by name
        const sortedRecords = [...records].sort((a, b) => {
          const nameA = (a['Nombre(s) y Apellido(s) completo(s)'] || '').toString().toUpperCase();
          const nameB = (b['Nombre(s) y Apellido(s) completo(s)'] || '').toString().toUpperCase();
          return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
        });

        // Create directory for this entity (already normalized)
        const entityDirPath = `${dirPath}/${entity}`;
        await (window as any).electron.invoke('create-directory', entityDirPath);

        // Process sorted records for this entity with sequence numbers
        for (let i = 0; i < sortedRecords.length; i++) {
          const row = sortedRecords[i];
          const pdfDoc = await PDFDocument.load(pdfTemplate);
          const form = pdfDoc.getForm();

          // Fill form fields based on Excel data
          Object.entries(row).forEach(([key, value]) => {
            try {
              const field = form.getTextField(key);
              if (field) {
                // Convert "Nombre(s) y Apellido(s) completo(s)" to uppercase
                if (key === 'Nombre(s) y Apellido(s) completo(s)' && value) {
                  field.setText(value.toString().toUpperCase());
                } 
                // Format date fields
                else if ([
                  'Fecha de nacimiento',
                  'Fecha de vinculación al servicio educativo estatal',
                  'Fecha de nombramiento estatal en el cargo actual',
                  'Fecha de nombramiento del cargo actual en la IE'
                ].includes(key) && value) {
                  let dateStr = '';
                  if (typeof value === 'number') {
                    // Handle Excel date number
                    // Add 1 day to compensate for Excel's date system and timezone
                    const date = new Date(((value - 25569) * 86400 + 86400) * 1000);
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    dateStr = `${day}/${month}/${year}`;
                  } else {
                    // Handle string date
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      const day = date.getDate().toString().padStart(2, '0');
                      const month = (date.getMonth() + 1).toString().padStart(2, '0');
                      const year = date.getFullYear();
                      dateStr = `${day}/${month}/${year}`;
                    } else {
                      // If can't parse as date, use original value
                      dateStr = value.toString();
                    }
                  }
                  field.setText(dateStr);
                }
                // Special handling for "Niveles educativos que ofrece la IE (Selección múltiple)"
                else if (key === 'Niveles educativos que ofrece la IE (Selección múltiple)' && value) {
                  const valueStr = value.toString();
                  // Replace "Preescolar (Prejardín, Jardín y Transición)" with "Preescolar"
                  let modifiedValue = valueStr.replace(
                    /Preescolar \(Prejardín, Jardín y Transición\)/g, 
                    'Preescolar'
                  );
                  // Replace semicolons with 5 spaces
                  modifiedValue = modifiedValue.replace(/;/g, '     ');
                  field.setText(modifiedValue);
                }
                // Special handling for "Jornadas de la IE"
                else if (key === 'Jornadas de la IE' && value) {
                  const valueStr = value.toString();
                  // Replace semicolons with 5 spaces
                  const modifiedValue = valueStr.replace(/;/g, '     ');
                  field.setText(modifiedValue);
                }
                // Special handling for "Grupos étnicos en la IE"
                else if (key === 'Grupos étnicos en la IE' && value) {
                  const valueStr = value.toString();
                  // Replace semicolons with 5 spaces
                  const modifiedValue = valueStr.replace(/;/g, '     ');
                  field.setText(modifiedValue);
                }
                else {
                  field.setText(value?.toString() || '');
                }
              }
            } catch (error) {
              console.warn(`Field ${key} not found in PDF form`);
            }
          });

          // Save the filled PDF
          const filledPdfBytes = await pdfDoc.save();
          
          // Get the name from "Nombre(s) y Apellido(s) completo(s)" column
          const nameValue = row['Nombre(s) y Apellido(s) completo(s)'];
          const sequenceNum = (i + 1).toString();
          const fileName = nameValue 
            ? `${sequenceNum}_${nameValue.toString()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove accents but keep base letters
                .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters but keep spaces
                .replace(/\s+/g, '_') // Replace spaces with underscores
                .toUpperCase()}.PDF` 
            : `${sequenceNum}_FILLED_${i + 1}.PDF`;
          
          const filePath = `${entityDirPath}/${fileName}`;
          
          await (window as any).electron.invoke('save-file', {
            filePath,
            data: filledPdfBytes
          });
          
          setProcessedFiles(prev => [...prev, fileName]);
        }
      }

      setSuccessMessage(`¡Proceso completado! Se han generado ${excelData.length} PDFs en el directorio: ${dirPath}`);
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % LOVE_MESSAGES.length);
    } catch (error) {
      console.error('Error generating PDFs:', error);
      message.error('Error al generar los PDFs. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '32px',
        borderBottom: '2px solid #E91E63',
        paddingBottom: '20px'
      }}>
        <h1 style={{
          color: '#E91E63',
          fontSize: '24px',
          marginBottom: '8px',
          fontWeight: 'bold'
        }}>
          PROGRAMA RECTORES LÍDERES TRANSFORMADORES - RLT<br />
          PROGRAMA COORDINADORES LÍDERES TRASFORMADORES - CLT
        </h1>
        <div style={{
          width: '100%',
          height: '2px',
          background: '#E91E63',
          margin: '16px auto'
        }}></div>
        <h2 style={{
          color: '#666',
          fontSize: '20px',
          marginTop: '16px'
        }}>
          LLENADOR DE FICHA DE INFORMACION BASICA
        </h2>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Space>
            <Upload
              accept=".xlsx,.xls"
              beforeUpload={handleExcelUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>Subir Excel</Button>
            </Upload>

            <Upload
              accept=".pdf"
              beforeUpload={handlePDFUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>Subir Plantilla PDF</Button>
            </Upload>

            <Button
              type="primary"
              onClick={generatePDFs}
              loading={loading}
              disabled={!excelData.length || !pdfTemplate}
            >
              Generar PDFs
            </Button>
          </Space>
        </div>

        {/* Status messages for uploaded files */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '16px',
          gap: '24px' 
        }}>
          {excelFileName && (
            <div style={{ 
              padding: '8px 16px',
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>Excel cargado: <strong>{excelFileName}</strong></span>
            </div>
          )}
          {pdfFileName && (
            <div style={{ 
              padding: '8px 16px',
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>PDF cargado: <strong>{pdfFileName}</strong></span>
            </div>
          )}
        </div>

        {loading && (
          <div style={{ 
            marginTop: 16, 
            padding: 24, 
            backgroundColor: '#e6f7ff', 
            border: '1px solid #91d5ff', 
            borderRadius: 4,
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1890ff'
          }}>
            <p>Madame Maribel Betancur (Simard), te amo tanto que voy a morir mil veces!!!</p>
            <p>Procesando tus archivos con amor... 💕</p>
          </div>
        )}

        {missingFields.length > 0 && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4 }}>
            <h4>Campos Faltantes en el PDF</h4>
            <p>Las siguientes columnas del Excel no se encuentran en el formulario PDF:</p>
            <ul>
              {missingFields.map(field => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <p>Estos campos no se completarán en los PDFs generados.</p>
          </div>
        )}

        {processedSummary && (
          <div style={{ 
            marginTop: 16, 
            padding: 16, 
            backgroundColor: '#fff0f6', 
            border: '1px solid #ffadd2', 
            borderRadius: 4,
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: 8, color: '#eb2f96' }}>¡Procesamiento Completado!</h3>
            <div style={{ fontSize: '16px' }}>
              <p>✅ Se procesaron exitosamente <strong>{processedSummary.records}</strong> registros de Excel</p>
              <p>📄 Se generaron <strong>{processedSummary.pdfs}</strong> archivos PDF</p>
              <p>📦 Todos los archivos han sido guardados en la carpeta: <strong>{extractedDirectoryPath}</strong></p>
              <div style={{ 
                marginTop: 16, 
                padding: 12, 
                backgroundColor: '#fff', 
                borderRadius: 4,
                color: '#ff69b4',
                fontStyle: 'italic'
              }}>
                <HeartOutlined style={{ fontSize: '20px', marginRight: 8, color: '#ff69b4' }} />
                {LOVE_MESSAGES[currentMessageIndex]}
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div style={{ 
            marginTop: 16, 
            padding: 16, 
            backgroundColor: '#fff0f6', 
            border: '1px solid #ffadd2', 
            borderRadius: 4,
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: 8, color: '#eb2f96' }}>¡Proceso Completado!</h3>
            <div style={{ fontSize: '16px' }}>
              {successMessage}
              <div style={{ 
                marginTop: 16, 
                padding: 12, 
                backgroundColor: '#fff', 
                borderRadius: 4,
                color: '#ff69b4',
                fontStyle: 'italic'
              }}>
                <HeartOutlined style={{ fontSize: '20px', marginRight: 8, color: '#ff69b4' }} />
                {LOVE_MESSAGES[currentMessageIndex]}
              </div>
            </div>
          </div>
        )}
      </Space>
    </div>
  );
};

export default PDFFormFiller; 