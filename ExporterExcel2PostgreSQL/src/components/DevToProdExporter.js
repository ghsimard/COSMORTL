import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner, Table, Card } from 'react-bootstrap';
import axios from 'axios';
import { 
  DEFAULT_DEV_CONNECTION, 
  DEFAULT_PROD_CONNECTION, 
  saveConnectionToLocalStorage,
  loadConnectionFromLocalStorage
} from '../config';

// Create a base URL for API calls
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Empty for production, will use same domain
  : 'http://localhost:5001'; // Explicit for development

const DevToProdExporter = () => {
  // State for dev database connection
  const [devConnection, setDevConnection] = useState(DEFAULT_DEV_CONNECTION);

  // State for prod database connection
  const [prodConnection, setProdConnection] = useState(DEFAULT_PROD_CONNECTION);

  // State for UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recordCounts, setRecordCounts] = useState({
    dev: 0,
    prod: 0,
    missing: 0
  });
  const [missingRecords, setMissingRecords] = useState([]);
  const [showMissingRecords, setShowMissingRecords] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [backupCreated, setBackupCreated] = useState(false);
  const [executionSteps, setExecutionSteps] = useState([]);
  const [saveSettings, setSaveSettings] = useState(true);
  const [showServerConfigHelp, setShowServerConfigHelp] = useState(false);

  // Load saved connection settings when component mounts
  useEffect(() => {
    const savedDev = loadConnectionFromLocalStorage('devConnection', DEFAULT_DEV_CONNECTION);
    const savedProd = loadConnectionFromLocalStorage('prodConnection', DEFAULT_PROD_CONNECTION);
    
    setDevConnection(savedDev);
    setProdConnection(savedProd);
  }, []);

  // Handle input changes for dev database
  const handleDevInputChange = (e) => {
    const { name, value } = e.target;
    setDevConnection({
      ...devConnection,
      [name]: value
    });
  };

  // Handle input changes for prod database
  const handleProdInputChange = (e) => {
    const { name, value } = e.target;
    setProdConnection({
      ...prodConnection,
      [name]: value
    });
  };

  // Toggle select all records
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(missingRecords.map(record => record.numero_de_cedula));
    }
    setSelectAll(!selectAll);
  };

  // Toggle single record selection
  const handleSelectRecord = (cedula) => {
    if (selectedRecords.includes(cedula)) {
      setSelectedRecords(selectedRecords.filter(id => id !== cedula));
      if (selectAll) setSelectAll(false);
    } else {
      setSelectedRecords([...selectedRecords, cedula]);
      if (selectedRecords.length + 1 === missingRecords.length) {
        setSelectAll(true);
      }
    }
  };

  // Create a backup of production database before export
  const createBackup = async () => {
    try {
      setIsLoading(true);
      addExecutionStep('Creating backup of production database...');
      
      const response = await axios.post(`${API_BASE_URL}/api/backup-database`, {
        connectionParams: prodConnection,
        tableName: 'rectores'
      });
      
      setBackupCreated(true);
      addExecutionStep(`Backup created successfully: ${response.data.backupFile}`);
      return true;
    } catch (err) {
      const errorMessage = err.response ? 
        `Error (${err.response.status}): ${err.response.data?.error || err.message}` :
        `Network error: ${err.message}`;
      
      setError(`Error creating backup: ${errorMessage}`);
      addExecutionStep(`ERROR: Failed to create backup - ${errorMessage}`, 'error');
      return false;
    }
  };

  // Add a step to the execution log
  const addExecutionStep = (message, type = 'info') => {
    setExecutionSteps(prev => [...prev, { message, type, timestamp: new Date() }]);
  };

  // Check for missing records in production
  const checkMissingRecords = async () => {
    try {
      // Save settings if option is checked
      if (saveSettings) {
        saveConnectionToLocalStorage('devConnection', devConnection);
        saveConnectionToLocalStorage('prodConnection', prodConnection);
      }
      
      setIsLoading(true);
      setError('');
      setSuccess('');
      setMissingRecords([]);
      setShowMissingRecords(false);
      setExecutionSteps([]);
      
      addExecutionStep('Connecting to development database...');
      addExecutionStep('Connecting to production database...');
      
      const response = await axios.post(`${API_BASE_URL}/api/compare-environments`, {
        devConnection,
        prodConnection,
        tableName: 'rectores'
      });
      
      setRecordCounts({
        dev: response.data.devCount,
        prod: response.data.prodCount,
        missing: response.data.missingRecords.length
      });
      
      setMissingRecords(response.data.missingRecords);
      setShowMissingRecords(true);
      
      addExecutionStep(`Connected to databases successfully`);
      addExecutionStep(`Found ${response.data.devCount} records in development`);
      addExecutionStep(`Found ${response.data.prodCount} records in production`);
      addExecutionStep(`Identified ${response.data.missingRecords.length} records missing in production`);
      
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err.response ? 
        `Error (${err.response.status}): ${err.response.data?.error || err.message}` :
        `Network error: ${err.message}`;
      
      setError(`Error checking databases: ${errorMessage}`);
      addExecutionStep(`ERROR: ${errorMessage}`, 'error');
      setIsLoading(false);
    }
  };

  // Export selected records to production
  const exportToProd = async () => {
    if (selectedRecords.length === 0) {
      setError('Please select at least one record to export');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      // First create a backup
      const backupSuccess = await createBackup();
      if (!backupSuccess) {
        setIsLoading(false);
        return;
      }
      
      // Get the selected records details
      const recordsToExport = missingRecords.filter(record => 
        selectedRecords.includes(record.numero_de_cedula)
      );
      
      addExecutionStep(`Exporting ${recordsToExport.length} records to production...`);
      
      const response = await axios.post(`${API_BASE_URL}/api/export-to-production`, {
        devConnection,
        prodConnection,
        tableName: 'rectores',
        records: recordsToExport
      });
      
      setSuccess(`Successfully exported ${response.data.exportedCount} records to production database.`);
      addExecutionStep(`Successfully exported ${response.data.exportedCount} records to production`, 'success');
      
      // Refresh the record counts
      checkMissingRecords();
    } catch (err) {
      const errorMessage = err.response ? 
        `Error (${err.response.status}): ${err.response.data?.error || err.message}` :
        `Network error: ${err.message}`;
      
      setError(`Error exporting records: ${errorMessage}`);
      addExecutionStep(`ERROR: Export failed - ${errorMessage}`, 'error');
      setIsLoading(false);
    }
  };

  // Reset to default production settings
  const resetToDefaultProd = () => {
    setProdConnection(DEFAULT_PROD_CONNECTION);
  };

  // Save current settings as new defaults
  const saveAsDefaults = () => {
    saveConnectionToLocalStorage('devConnection', devConnection);
    saveConnectionToLocalStorage('prodConnection', prodConnection);
    setSuccess('Connection settings saved as defaults');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess('');
    }, 3000);
  };

  return (
    <Container className="my-4">
      <h2>Development to Production Exporter</h2>
      <p>Export missing records from development to production environment for the rectores table.</p>
      
      <Row className="mb-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              Development Database
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Host</Form.Label>
                <Form.Control 
                  type="text" 
                  name="host" 
                  value={devConnection.host}
                  onChange={handleDevInputChange}
                  placeholder="localhost"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Port</Form.Label>
                <Form.Control 
                  type="number" 
                  name="port" 
                  value={devConnection.port}
                  onChange={handleDevInputChange}
                  placeholder="5432"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Database</Form.Label>
                <Form.Control 
                  type="text" 
                  name="database" 
                  value={devConnection.database}
                  onChange={handleDevInputChange}
                  placeholder="COSMO_RLT"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control 
                  type="text" 
                  name="user" 
                  value={devConnection.user}
                  onChange={handleDevInputChange}
                  placeholder="Enter username"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control 
                  type="password" 
                  name="password" 
                  value={devConnection.password}
                  onChange={handleDevInputChange}
                  placeholder="Enter password"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check 
                  type="checkbox"
                  id="dev-ssl-connection"
                  label="Use SSL/TLS Connection"
                  name="ssl"
                  checked={devConnection.ssl}
                  onChange={(e) => setDevConnection({
                    ...devConnection,
                    ssl: e.target.checked
                  })}
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
              <span>Production Database</span>
              <Button 
                variant="light" 
                size="sm" 
                onClick={() => setShowServerConfigHelp(!showServerConfigHelp)}
              >
                <i className="fas fa-question-circle"></i> Help
              </Button>
            </Card.Header>
            {showServerConfigHelp && (
              <Alert variant="info" className="m-2 mb-0">
                <h6>Render.com PostgreSQL Connection Format</h6>
                <p className="mb-1"><strong>Host:</strong> yourserver.oregon-postgres.render.com</p>
                <p className="mb-1"><strong>Database:</strong> database_name (lowercase)</p>
                <p className="mb-1"><strong>Username:</strong> database_user</p>
                <p className="mb-0"><strong>SSL:</strong> Required for Render.com</p>
              </Alert>
            )}
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Host</Form.Label>
                <Form.Control 
                  type="text" 
                  name="host" 
                  value={prodConnection.host}
                  onChange={handleProdInputChange}
                  placeholder="yourserver.oregon-postgres.render.com"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Port</Form.Label>
                <Form.Control 
                  type="number" 
                  name="port" 
                  value={prodConnection.port}
                  onChange={handleProdInputChange}
                  placeholder="5432"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Database</Form.Label>
                <Form.Control 
                  type="text" 
                  name="database" 
                  value={prodConnection.database}
                  onChange={handleProdInputChange}
                  placeholder="database_name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control 
                  type="text" 
                  name="user" 
                  value={prodConnection.user}
                  onChange={handleProdInputChange}
                  placeholder="database_user"
                />
                <Form.Text className="text-muted">
                  Use the username provided by Render.com
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control 
                  type="password" 
                  name="password" 
                  value={prodConnection.password}
                  onChange={handleProdInputChange}
                  placeholder="Enter password"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check 
                  type="checkbox"
                  id="prod-ssl-connection"
                  label="Use SSL/TLS Connection (Required for Render.com)"
                  name="ssl"
                  checked={prodConnection.ssl}
                  onChange={(e) => setProdConnection({
                    ...prodConnection,
                    ssl: e.target.checked
                  })}
                />
              </Form.Group>
            </Card.Body>
            <Card.Footer>
              <div className="d-flex justify-content-between">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={resetToDefaultProd}
                >
                  <i className="fas fa-sync-alt"></i> Reset to Default
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={saveAsDefaults}
                >
                  <i className="fas fa-save"></i> Save as Default
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
      
      <Form.Group className="mb-3">
        <Form.Check 
          type="checkbox" 
          id="save-settings"
          label="Save connection settings for next session (passwords will not be saved)"
          checked={saveSettings}
          onChange={(e) => setSaveSettings(e.target.checked)}
        />
      </Form.Group>
      
      <div className="d-grid gap-2 mb-4">
        <Button 
          variant="primary" 
          size="lg" 
          onClick={checkMissingRecords}
          disabled={isLoading || !devConnection.user || !prodConnection.user}
        >
          {isLoading && !showMissingRecords ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
              <span className="ms-2">Checking Records...</span>
            </>
          ) : (
            <>
              <i className="fas fa-database me-2"></i> 
              Compare Environments & Check Missing Records
            </>
          )}
        </Button>
      </div>
      
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}
      
      {executionSteps.length > 0 && (
        <Card className="mb-4">
          <Card.Header>Execution Log</Card.Header>
          <Card.Body style={{maxHeight: '200px', overflowY: 'auto'}}>
            {executionSteps.map((step, index) => (
              <div 
                key={index} 
                className={`mb-1 ${
                  step.type === 'error' ? 'text-danger' : 
                  step.type === 'success' ? 'text-success' : 'text-dark'
                }`}
              >
                <small>
                  [{step.timestamp.toLocaleTimeString()}] {step.message}
                </small>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}
      
      {showMissingRecords && (
        <>
          <Row className="mb-3">
            <Col md={4}>
              <Card bg="light">
                <Card.Body className="text-center">
                  <h5>Dev Records</h5>
                  <h2 className="text-primary">{recordCounts.dev}</h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card bg="light">
                <Card.Body className="text-center">
                  <h5>Prod Records</h5>
                  <h2 className="text-success">{recordCounts.prod}</h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card bg="light">
                <Card.Body className="text-center">
                  <h5>Missing Records</h5>
                  <h2 className="text-danger">{recordCounts.missing}</h2>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {missingRecords.length > 0 ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>Records Missing in Production</h4>
                <div>
                  <Button 
                    variant="success" 
                    onClick={exportToProd}
                    disabled={isLoading || selectedRecords.length === 0}
                    className="me-2"
                  >
                    {isLoading && showMissingRecords ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        <span className="ms-2">Exporting...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-export me-2"></i>
                        Export Selected Records ({selectedRecords.length})
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div style={{maxHeight: '400px', overflowY: 'auto'}} className="mb-4">
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>
                        <Form.Check
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          label="Select All"
                        />
                      </th>
                      <th>Cédula</th>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Institución</th>
                      <th>Cargo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingRecords.map((record) => (
                      <tr key={record.numero_de_cedula}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={selectedRecords.includes(record.numero_de_cedula)}
                            onChange={() => handleSelectRecord(record.numero_de_cedula)}
                          />
                        </td>
                        <td>{record.numero_de_cedula}</td>
                        <td>{record.nombre_s_y_apellido_s_completo_s}</td>
                        <td>{record.correo_electronico_personal}</td>
                        <td>{record.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_}</td>
                        <td>{record.cargo_actual}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          ) : (
            <Alert variant="info">No missing records found! Development and production are in sync.</Alert>
          )}
        </>
      )}
    </Container>
  );
};

export default DevToProdExporter; 