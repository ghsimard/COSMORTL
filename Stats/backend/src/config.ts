export const config = {
  ports: {
    backend: process.env.PORT || 4001
  },
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://cosmo-rlt-stats-ui.onrender.com'
      : ['http://localhost:4000', 'http://localhost']
  },
  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/COSMO_RLT',
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  }
}; 