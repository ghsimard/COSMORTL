# COSMO Stats Project

A web application for visualizing frequency ratings data from different user groups (docentes, estudiantes, acudientes).

## Project Structure

```
cosmo-stats/
├── backend/           # Express + TypeScript backend
│   ├── src/
│   │   ├── server.ts # Main server file
│   │   ├── db.ts     # Database connection
│   │   └── types.ts  # Type definitions
│   └── package.json
└── frontend/         # React + TypeScript frontend
    ├── src/
    │   ├── components/
    │   │   └── FrequencyChart.tsx
    │   ├── services/
    │   │   └── api.ts
    │   └── types/
    │       └── index.ts
    └── package.json
```

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup

1. Clone the repository
2. Set up the backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Create and edit .env with your database credentials
   npm run build
   npm start
   ```

3. Set up the frontend:
   ```bash
   cd ../
   npm install
   npm start
   ```

4. Configure your PostgreSQL database:
   - Create a database named 'cosmo_stats'
   - Create tables: docentes, estudiantes, acudientes
   - Each table should have columns:
     - question (text)
     - frequency_ratings (text)

## Development

- Backend development server: `npm run dev`
- Frontend development server: `npm start`
- Backend TypeScript watch mode: `npm run watch`

## API Endpoints

### GET /api/frequency-ratings

Returns frequency ratings data from all tables (docentes, estudiantes, acudientes).

Response format:
```typescript
interface FrequencyData {
  title: string;
  questions: {
    question: string;
    frequencies: {
      rating: string;
      count: number;
    }[];
  }[];
}
```

## Environment Variables

### Backend (.env)
```
PORT=4001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cosmo_stats
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### Frontend (.env)
```
REACT_APP_API_BASE_URL=http://localhost:4001
```
