// Default database connection configurations
const DEFAULT_DEV_CONNECTION = {
  host: 'localhost',
  port: 5432,
  database: 'COSMO_RLT',
  user: '',
  password: '',
  ssl: false
};

// Updated production server details for Render.com
const DEFAULT_PROD_CONNECTION = {
  host: 'dpg-d054t79r0fns73d2loeg-a.oregon-postgres.render.com',
  port: 5432,
  database: 'cosmo_rlt',
  user: 'cosmo_rlt_user',
  password: '',
  ssl: true // Render.com requires SSL
};

// Helper functions to save/load connections from localStorage
const saveConnectionToLocalStorage = (key, connection) => {
  try {
    // Don't save password
    const connectionToSave = { ...connection };
    delete connectionToSave.password;
    
    localStorage.setItem(key, JSON.stringify(connectionToSave));
    return true;
  } catch (error) {
    console.error('Error saving connection to localStorage:', error);
    return false;
  }
};

const loadConnectionFromLocalStorage = (key, defaultConnection) => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultConnection;
    
    const parsedConnection = JSON.parse(saved);
    return { ...defaultConnection, ...parsedConnection, password: '' };
  } catch (error) {
    console.error('Error loading connection from localStorage:', error);
    return defaultConnection;
  }
};

export {
  DEFAULT_DEV_CONNECTION,
  DEFAULT_PROD_CONNECTION,
  saveConnectionToLocalStorage,
  loadConnectionFromLocalStorage
}; 