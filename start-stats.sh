#!/bin/bash

# Check if NPX is installed
if ! command -v npx &> /dev/null; then
    echo "Error: npx is required but could not be found. Please install Node.js and npm."
    exit 1
fi

# Function to check if a port is available
check_port() {
    nc -z localhost $1 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Port $1 is already in use. Make sure no other application is running on this port."
        exit 1
    fi
}

# Kill existing Stats processes
echo "Stopping any existing Stats processes..."
pkill -f "node.*Stats.*backend" || true
pkill -f "npx serve -s build -l 4000" || true

# Check if ports are available
check_port 4000  # Stats frontend
check_port 4001  # Stats backend

# Function to handle termination
cleanup() {
    echo "Shutting down Stats servers..."
    kill $STATS_BACKEND_PID 2>/dev/null
    kill $STATS_FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Start Stats
echo "Starting Stats application..."
cd Stats

# First build the backend if needed
cd backend
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
  echo "Building Stats backend..."
  npm install --quiet
  npm run build
fi

# Start the backend
echo "Starting Stats backend on port 4001..."
NODE_ENV=development PORT=4001 PGSSLMODE=disable npm start &
STATS_BACKEND_PID=$!

# Go to frontend
cd ../frontend

# For consistency, build the frontend if needed
if [ ! -d "build" ] || [ -z "$(ls -A build)" ]; then
  echo "Building Stats frontend..."
  npm install --quiet
  npm run build
fi

# Start the frontend using serve
echo "Starting Stats frontend on port 4000..."
npx serve -s build -l 4000 &
STATS_FRONTEND_PID=$!

echo "Stats application is running!"
echo "- Stats frontend: http://localhost:4000"
echo "- Stats backend API: http://localhost:4001/api"
echo "- Stats with token access: http://localhost/stats/StatsToken012 (requires proxy server)"
echo ""
echo "Press Ctrl+C to stop the Stats application."

# Wait for both processes
wait $STATS_BACKEND_PID $STATS_FRONTEND_PID 