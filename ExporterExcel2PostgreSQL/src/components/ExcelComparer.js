import React, { useState, useEffect } from 'react';
import { Table, Button, Alert, Spinner, Form } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import axios from 'axios';

// Create a base URL for API calls
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Empty for production, will use same domain
  : 'http://localhost:5001'; // Explicit for development

const ExcelComparer = ({ excelFile, connectionParams, setIsLoading, setError, setSuccess }) => {
  const [excelData, setExcelData] = useState([]);
  const [missingRecords, setMissingRecords] = useState([]);
  const [isChecking, setIsChecking] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [excelStructure, setExcelStructure] = useState(null);
  const [selectedCedulaField, setSelectedCedulaField] = useState('numero_de_cedula');
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  
  useEffect(() => {
    const readExcelFile = async () => {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          setExcelData(jsonData);
          
          // First, inspect the Excel structure
          await inspectExcelStructure(jsonData);
        };
        reader.readAsArrayBuffer(excelFile);
      } catch (err) {
        setLocalError(`Error reading Excel file: ${err.message}`);
        setIsLoading(false);
        setIsChecking(false);
        setError(`Error reading Excel file: ${err.message}`);
      }
    };
    
    readExcelFile();
  }, [excelFile]);
  
  const inspectExcelStructure = async (data) => {
    try {
      console.log('Inspecting Excel structure...');
      
      const response = await axios.post(`${API_BASE_URL}/api/inspect-excel`, {
        excelData: data
      });
      
      console.log('Excel structure:', response.data);
      setExcelStructure(response.data);
      
      // We now know the exact field name from our Excel inspection script
      // The correct field name is 'Número de cédula' (with accent)
      const exactFieldName = 'Número de cédula';
      
      // Check if this field exists in the data
      if (data[0] && data[0][exactFieldName] !== undefined) {
        setSelectedCedulaField(exactFieldName);
        await checkMissingRecords(data, exactFieldName);
      } else if (response.data.possibleCedulaFields.length > 0) {
        // Fallback to suggested fields
        const suggestedField = response.data.possibleCedulaFields[0];
        setSelectedCedulaField(suggestedField);
        
        if (response.data.possibleCedulaFields.length > 1) {
          setShowFieldSelector(true);
          setIsChecking(false);
        } else {
          await checkMissingRecords(data, suggestedField);
        }
      } else if (response.data.allFields.length > 0) {
        // No cedula fields found
        setShowFieldSelector(true);
        setIsChecking(false);
      } else {
        setLocalError('No fields found in Excel data');
        setIsChecking(false);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('API error:', err);
      const errorMessage = err.response ? 
        `Error (${err.response.status}): ${err.response.data?.error || err.message}` :
        `Network error: ${err.message}`;
      
      setLocalError(`Error analyzing Excel data: ${errorMessage}`);
      setIsChecking(false);
      setIsLoading(false);
    }
  };
  
  const handleFieldSelection = async () => {
    setShowFieldSelector(false);
    setIsChecking(true);
    await checkMissingRecords(excelData, selectedCedulaField);
  };
  
  const checkMissingRecords = async (data, cedulaField) => {
    try {
      console.log(`Checking missing records with field: ${cedulaField}`);
      console.log('First few records from Excel:', data.slice(0, 3));
      
      const response = await axios.post(`${API_BASE_URL}/api/check-missing-records`, {
        excelData: data,
        connectionParams,
        identifierField: cedulaField
      });
      
      console.log('API response:', response.data);
      setMissingRecords(response.data.missingRecords || []);
      setDebugInfo(response.data.debug || null);
      setIsChecking(false);
      setIsLoading(false);
    } catch (err) {
      console.error('API error:', err);
      const errorMessage = err.response ? 
        `Error (${err.response.status}): ${err.response.data?.error || err.message}` :
        `Network error: ${err.message}`;
      
      setLocalError(`Error checking records: ${errorMessage}`);
      setIsChecking(false);
      setIsLoading(false);
      setError(`Error checking records: ${errorMessage}`);
    }
  };
  
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportSuccess('');
      
      const response = await axios.post(`${API_BASE_URL}/api/export-records`, {
        records: missingRecords,
        connectionParams,
        targetTable: 'rectores'
      });
      
      setIsExporting(false);
      setExportSuccess(`Successfully exported ${response.data.exportedCount} records to the database.`);
      setSuccess(`Successfully exported ${response.data.exportedCount} records to the database.`);
    } catch (err) {
      console.error('API error:', err);
      const errorMessage = err.response ? 
        `Error (${err.response.status}): ${err.response.data?.error || err.message}` :
        `Network error: ${err.message}`;
      
      setLocalError(`Error exporting records: ${errorMessage}`);
      setIsExporting(false);
      setError(`Error exporting records: ${errorMessage}`);
    }
  };
  
  if (showFieldSelector) {
    return (
      <div className="mt-4">
        <h2>Select Identification Field</h2>
        <p>Please select the field that contains the identification number (cédula):</p>
        
        <Form>
          <Form.Group controlId="cedulaField">
            <Form.Select 
              value={selectedCedulaField}
              onChange={(e) => setSelectedCedulaField(e.target.value)}
            >
              {excelStructure.allFields.map(field => (
                <option 
                  key={field} 
                  value={field}
                  style={excelStructure.possibleCedulaFields.includes(field) ? {fontWeight: 'bold'} : {}}
                >
                  {field} {excelStructure.possibleCedulaFields.includes(field) ? '(Suggested)' : ''}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              Select the field that contains the identification numbers to match with the database.
            </Form.Text>
          </Form.Group>
          
          <Button 
            variant="primary" 
            onClick={handleFieldSelection} 
            className="mt-3"
          >
            Continue
          </Button>
        </Form>
        
        {excelStructure && (
          <div className="mt-4">
            <h4>Sample Data</h4>
            <div className="table-container">
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    {excelStructure.allFields.map(field => (
                      <th key={field}>{field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelStructure.sampleRecords.map((record, index) => (
                    <tr key={index}>
                      {excelStructure.allFields.map(field => (
                        <td key={field}>{record[field]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  if (isChecking) {
    return (
      <div className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Checking for missing records...</span>
        </Spinner>
        <p className="mt-2">Checking for missing records in the database using field: {selectedCedulaField}</p>
      </div>
    );
  }
  
  return (
    <div className="mt-4">
      <h2>Missing Records</h2>
      
      {localError && <Alert variant="danger">{localError}</Alert>}
      {exportSuccess && <Alert variant="success">{exportSuccess}</Alert>}
      {debugInfo && (
        <Alert variant="info">
          <h5>Debug Information</h5>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </Alert>
      )}
      
      {missingRecords.length > 0 ? (
        <>
          <p>Found {missingRecords.length} records that are missing in the database.</p>
          
          <div className="table-container">
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  {Object.keys(missingRecords[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {missingRecords.map((record, index) => (
                  <tr key={index}>
                    {Object.values(record).map((value, i) => (
                      <td key={i}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          <Button 
            variant="success" 
            onClick={handleExport} 
            disabled={isExporting}
            className="mt-3"
          >
            {isExporting ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span className="ms-2">Exporting...</span>
              </>
            ) : 'Export to Database'}
          </Button>
        </>
      ) : (
        <Alert variant="info">No missing records found! All Excel records exist in the database.</Alert>
      )}
    </div>
  );
};

export default ExcelComparer; 