# Excel to PostgreSQL Exporter

A React application to export missing records from an Excel sheet to a PostgreSQL database table.

## Features

- Upload Excel files and identify records that are missing in the PostgreSQL database
- Compare based on `numero_de_cedula` field
- View missing records in a table format
- Export missing records to the PostgreSQL database with a single click
- Transaction support to ensure data integrity

## Prerequisites

- Node.js (version 14 or later)
- PostgreSQL database (with the 'rectores' table in COSMO_RLT database)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

## Usage

1. Start the development server:

```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:3000`

3. Upload your Excel file and enter database credentials

4. The application will show records from the Excel file that are missing in the database

5. Click "Export to Database" to add the missing records to the PostgreSQL table

## Database Configuration

Make sure your PostgreSQL database has a table named 'rectores' with the appropriate schema to match the Excel data. The comparison is done based on the 'numero_de_cedula' field.

## Production Deployment

To build for production:

```bash
npm run build
```

This will create a 'build' folder with optimized production files. You can then deploy it using:

```bash
NODE_ENV=production npm start
```

## License

MIT 