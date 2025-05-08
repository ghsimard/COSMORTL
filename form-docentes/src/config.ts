export const config = {
  ports: {
    backend: process.env.PORT || 3001,
    frontend: process.env.FRONTEND_PORT || 3000
  },
  api: {
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://form-docentes.onrender.com' 
      : `http://localhost:${process.env.PORT || 3001}`
  }
} as const; 