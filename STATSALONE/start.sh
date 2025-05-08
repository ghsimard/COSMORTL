#!/bin/bash

# Kill any existing Node.js processes
pkill -f "node" || true

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm run install-all
fi

# Build the backend
echo "Building backend..."
npm run build

# Start the application
echo "Starting Stats application..."
npm start 