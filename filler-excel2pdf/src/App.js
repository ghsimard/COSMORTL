import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import './App.css';

function App() {
  const [excelFile, setExcelFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState([]);
  const [pdfFields, setPdfFields] = useState([]);
  const [excelColumns, setExcelColumns] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [otherGenderMapping, setOtherGenderMapping] = useState({});

  // Auto-match fields when both PDF fields and Excel columns are available
  useEffect(() => {
    if (pdfFields.length > 0 && excelColumns.length > 0) {
      const initialMapping = {};
      const initialOtherGenderMapping = {};
      
      pdfFields.forEach(pdfField => {
        // Try to find an exact match first
        let match = excelColumns.find(col => col === pdfField);
        
        // If no exact match, try case-insensitive match
        if (!match) {
          match = excelColumns.find(col => 
            col.toLowerCase() === pdfField.toLowerCase()
          );
        }
        
        // If still no match, try partial match
        if (!match) {
          match = excelColumns.find(col => 
            col.toLowerCase().includes(pdfField.toLowerCase()) ||
            pdfField.toLowerCase().includes(col.toLowerCase())
          );
        }
        
        if (match) {
          initialMapping[pdfField] = match;
          
          // Special handling for Género field
          if (pdfField.toLowerCase().includes('género')) {
            // Look for the "Otro" field
            const otroField = excelColumns.find(col => 
              col.toLowerCase().includes('otro') && 
              col.toLowerCase().includes('cuál')
            );
            if (otroField) {
              initialOtherGenderMapping[pdfField] = otroField;
            }
          }
        }
      });
      
      setFieldMapping(initialMapping);
      setOtherGenderMapping(initialOtherGenderMapping);
    }
  }, [pdfFields, excelColumns]);

  const handleExcelChange = async (e) => {
    const file = e.target.files[0];
    setExcelFile(file);
    
    try {
      const columns = await ipcRenderer.invoke('get-excel-columns', {
        excelPath: file.path
      });
      setExcelColumns(columns);
    } catch (e) {
      setStatus(`Error reading Excel columns: ${e.message}`);
    }
  };

  const handlePdfChange = async (e) => {
    const file = e.target.files[0];
    setPdfFile(file);
    
    try {
      const fields = await ipcRenderer.invoke('get-pdf-fields', {
        pdfPath: file.path
      });
      setPdfFields(fields);
    } catch (e) {
      setStatus(`Error reading PDF fields: ${e.message}`);
    }
  };

  const handleMappingChange = (pdfField, excelColumn) => {
    setFieldMapping(prev => ({
      ...prev,
      [pdfField]: excelColumn
    }));
  };

  const handleOtherGenderMappingChange = (pdfField, excelColumn) => {
    setOtherGenderMapping(prev => ({
      ...prev,
      [pdfField]: excelColumn
    }));
  };

  const handleGenerate = async () => {
    if (!excelFile || !pdfFile) {
      setStatus('Please upload both Excel and PDF files.');
      return;
    }

    if (Object.keys(fieldMapping).length === 0) {
      setStatus('Please map at least one PDF field to an Excel column.');
      return;
    }

    setStatus('Processing...');
    setErrors([]);

    try {
      const result = await ipcRenderer.invoke('generate-pdfs', {
        excelPath: excelFile.path,
        pdfPath: pdfFile.path,
        fieldMapping,
        otherGenderMapping
      });

      setStatus(result.message);
      setErrors(result.errors || []);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div className="App">
      <h1>PDF Filler App</h1>
      <div>
        <label>
          Upload Excel File (.xlsx):
          <input type="file" accept=".xlsx" onChange={handleExcelChange} />
        </label>
      </div>
      <div>
        <label>
          Upload PDF Template (.pdf):
          <input type="file" accept=".pdf" onChange={handlePdfChange} />
        </label>
      </div>
      
      {pdfFields.length > 0 && excelColumns.length > 0 && (
        <div className="mapping-section">
          <h3>Map PDF Fields to Excel Columns</h3>
          <div className="mapping-grid">
            {pdfFields.map(pdfField => (
              <div key={pdfField} className="mapping-row">
                <label>{pdfField}</label>
                <select
                  value={fieldMapping[pdfField] || pdfField}
                  onChange={(e) => handleMappingChange(pdfField, e.target.value)}
                >
                  <option value={pdfField}>{pdfField}</option>
                  {excelColumns.map(column => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
                {pdfField.toLowerCase().includes('género') && (
                  <div className="other-gender-mapping">
                    <label>If "Otro" is selected, use this column:</label>
                    <select
                      value={otherGenderMapping[pdfField] || ''}
                      onChange={(e) => handleOtherGenderMappingChange(pdfField, e.target.value)}
                    >
                      <option value="">Select "Otro" Column</option>
                      {excelColumns.map(column => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleGenerate}>Generate PDFs</button>
      <div>
        <h3>Status</h3>
        <p>{status}</p>
        {errors.length > 0 && (
          <div>
            <h4>Errors</h4>
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;