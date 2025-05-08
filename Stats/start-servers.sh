#!/bin/bash

# Kill any existing servers
echo "Stopping any existing servers..."
pkill -f "node.*server.ts" || true
pkill -f "node.*start.js" || true

# Function to handle termination
cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Start backend server
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Start frontend server
echo "Starting frontend server..."
cd ../frontend
npm start &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 