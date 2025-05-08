#!/bin/bash

# Kill any existing server process
pkill -f "node server.js" || true

# Set DATABASE_URL environment variable - using the correct database name COSMO_RLT (uppercase)
# Update credentials if needed
export DATABASE_URL="postgres://localhost:5432/COSMO_RLT"

# Optional: check if there's a way to test database connection
echo "Starting server with DATABASE_URL configured to connect to COSMO_RLT..."
echo "Make sure PostgreSQL is running with the COSMO_RLT database."
echo "The server will search the 'rectores' table, column 'nombre_de_la_institucion_educativa_en_la_actualmente_desempena_'"

# Start the server
node server.js 