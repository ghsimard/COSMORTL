import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import ExcelComparer from './components/ExcelComparer';
import DevToProdExporter from './components/DevToProdExporter';
import { 
  DEFAULT_DEV_CONNECTION, 
  saveConnectionToLocalStorage, 
  loadConnectionFromLocalStorage 
} from './config';

function App() {
  const [excelFile, setExcelFile] = useState(null);
  const [connectionParams, setConnectionParams] = useState(DEFAULT_DEV_CONNECTION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showComparer, setShowComparer] = useState(false);
  const [activeTab, setActiveTab] = useState('excelImport');
  const [saveSettings, setSaveSettings] = useState(true);
  
  // Load saved connection settings when component mounts
  useEffect(() => {
    const savedConnection = loadConnectionFromLocalStorage('excelImportConnection', DEFAULT_DEV_CONNECTION);
    setConnectionParams(savedConnection);
  }, []);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setExcelFile(file);
    setError('');
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConnectionParams({
      ...connectionParams,
      [name]: value
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!excelFile) {
      setError('Please select an Excel file');
      return;
    }
    
    if (!connectionParams.user) {
      setError('Database username is required');
      return;
    }
    
    // Save settings if the option is checked
    if (saveSettings) {
      saveConnectionToLocalStorage('excelImportConnection', connectionParams);
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    setShowComparer(true);
  };
  
  return (
    <Container>
      <h1 className="my-4">COSMO RLT Database Management</h1>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="excelImport" title="Excel Import">
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="excelFile">
                  <Form.Label>Excel File</Form.Label>
                  <Form.Control 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange}
                    required 
                  />
                  <Form.Text className="text-muted">
                    Select the Excel file containing the records to check.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group controlId="host">
                  <Form.Label>Database Host</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="host" 
                    value={connectionParams.host}
                    onChange={handleInputChange}
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group controlId="port">
                  <Form.Label>Port</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="port" 
                    value={connectionParams.port}
                    onChange={handleInputChange}
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="database">
                  <Form.Label>Database Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="database" 
                    value={connectionParams.database}
                    onChange={handleInputChange}
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="user">
                  <Form.Label>Database Username</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="user" 
                    value={connectionParams.user}
                    onChange={handleInputChange}
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="password">
                  <Form.Label>Database Password</Form.Label>
                  <Form.Control 
                    type="password" 
                    name="password" 
                    value={connectionParams.password}
                    onChange={handleInputChange}
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group controlId="ssl">
                  <Form.Check 
                    type="checkbox" 
                    label="Use SSL/TLS Connection"
                    name="ssl"
                    checked={connectionParams.ssl}
                    onChange={(e) => setConnectionParams({
                      ...connectionParams,
                      ssl: e.target.checked
                    })}
                  />
                  <Form.Text className="text-muted">
                    Check this if your database server requires a secure SSL/TLS connection.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group controlId="saveSettings">
                  <Form.Check 
                    type="checkbox" 
                    label="Save connection settings for next session (passwords will not be saved)"
                    checked={saveSettings}
                    onChange={(e) => setSaveSettings(e.target.checked)}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                  <span className="ms-2">Processing...</span>
                </>
              ) : 'Check Missing Records'}
            </Button>
          </Form>
          
          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          {success && <Alert variant="success" className="mt-3">{success}</Alert>}
          
          {showComparer && excelFile && (
            <ExcelComparer 
              excelFile={excelFile} 
              connectionParams={connectionParams}
              setIsLoading={setIsLoading}
              setError={setError}
              setSuccess={setSuccess}
            />
          )}
        </Tab>
        
        <Tab eventKey="devToProd" title="Dev to Prod Migration">
          <DevToProdExporter />
        </Tab>
      </Tabs>
    </Container>
  );
}

export default App; 