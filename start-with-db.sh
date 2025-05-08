#!/bin/bash

# Kill any existing Node.js processes
pkill -f "node" || true

# Start the main server
echo "Starting main server..."
export DATABASE_URL="postgres://localhost:5432/COSMO_RLT"
node server.js &

# Wait for the server to start
sleep 5

echo "All services are running!"
echo "Access the applications at:"
echo "- Docentes Form: http://localhost:3000/DocToken123"
echo "- Acudientes Form: http://localhost:3000/AcuToken456"
echo "- Estudiantes Form: http://localhost:3000/EstToken789" 