export const config = {
  ports: {
    frontend: 3004,
    backend: 3005,
    database: 5432
  },
  urls: {
    frontend: `http://localhost:3004`,
    backend: `http://localhost:3005`,
    api: `http://localhost:3005/api`
  }
} as const;

export type Config = typeof config; 