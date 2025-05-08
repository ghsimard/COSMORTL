#!/bin/bash

# COSMO Project - Start All Applications
echo "Starting COSMO applications..."

# Function to check if a port is available
check_port() {
    nc -z localhost $1 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Port $1 is already in use. Make sure no other application is running on this port."
        exit 1
    fi
}

# Kill any existing processes that might be using our ports
echo "Stopping any existing processes on the required ports..."
./stop-all.sh > /dev/null 2>&1

# Wait a moment for processes to terminate
sleep 2

# Check if all required ports are available
check_port 3000  # form-docentes frontend
check_port 3001  # form-docentes backend
check_port 3003  # form-estudiantes frontend
check_port 3004  # form-acudientes frontend
check_port 3005  # form-acudientes backend
check_port 3006  # form-estudiantes backend (if exists)
check_port 4000  # Stats frontend
check_port 4001  # Stats backend
check_port 80    # Proxy server

# Set environment variables to avoid SSL issues with local database
export NODE_TLS_REJECT_UNAUTHORIZED=0
export PGSSL=false
export PGSSLMODE=disable
export NODE_ENV=development

# Start form-docentes
echo "Starting form-docentes..."
cd form-docentes
PORT=3001 FRONTEND_PORT=3000 npm start &
DOCENTES_PID=$!
cd ..

# Start form-acudientes
echo "Starting form-acudientes..."
cd form-acudientes
PORT=3005 npm start &
ACUDIENTES_PID=$!
cd ..

# Start form-estudiantes
echo "Starting form-estudiantes..."
cd form-estudiantes
PORT=3006 npm start &
ESTUDIANTES_PID=$!
cd ..

# Start Stats
echo "Starting Stats..."
cd Stats

# First build the backend
cd backend
npm install --quiet
npm run build

# Start the backend
NODE_ENV=development PORT=4001 PGSSLMODE=disable npm start &
STATS_BACKEND_PID=$!

# Go to frontend
cd ../frontend

# For consistency, build the frontend in case it's not already built
if [ ! -d "build" ] || [ -z "$(ls -A build)" ]; then
  echo "Building Stats frontend..."
  npm install --quiet
  npm run build
fi

# Start the frontend using serve
echo "Starting Stats frontend on port 4000..."
npx serve -s build -l 4000 &
STATS_FRONTEND_PID=$!

cd ../..

# Wait for all applications to initialize
echo "Waiting for applications to initialize..."
sleep 15

# Start proxy server
echo "Starting proxy server..."
npm start &
PROXY_PID=$!

# Save all PIDs to a file
echo "$DOCENTES_PID $ACUDIENTES_PID $ESTUDIANTES_PID $STATS_BACKEND_PID $STATS_FRONTEND_PID $PROXY_PID" > .app_pids

echo "All applications are running!"
echo ""
echo "Access URLs:"
echo "- Form Docentes: http://localhost/docentes/DocToken123"
echo "- Form Acudientes: http://localhost/acudientes/AcuToken456"
echo "- Form Estudiantes: http://localhost/estudiantes/EstToken789"
echo "- Stats: http://localhost/stats/StatsToken012"
echo ""
echo "To stop all applications, run: ./stop-all.sh"

# Keep script running to maintain terminal process
wait 