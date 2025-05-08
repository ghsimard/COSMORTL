#!/bin/bash

# COSMO Project - Stop All Applications
echo "Stopping COSMO applications..."

# Check if the PIDs file exists
if [ -f .app_pids ]; then
    # Read PIDs from the file
    read -r DOCENTES_PID ACUDIENTES_PID ESTUDIANTES_PID STATS_BACKEND_PID STATS_FRONTEND_PID PROXY_PID < .app_pids
    
    # Stop all processes
    kill $DOCENTES_PID 2>/dev/null
    kill $ACUDIENTES_PID 2>/dev/null
    kill $ESTUDIANTES_PID 2>/dev/null
    kill $STATS_BACKEND_PID 2>/dev/null
    kill $STATS_FRONTEND_PID 2>/dev/null
    kill $PROXY_PID 2>/dev/null
    
    # Remove the PIDs file
    rm .app_pids
else
    # If PIDs file doesn't exist, try to find and kill processes by name
    echo "PIDs file not found. Trying to find processes by name..."
    
    # Kill node processes for each application
    pkill -f "node.*form-docentes" 2>/dev/null
    pkill -f "node.*form-acudientes" 2>/dev/null
    pkill -f "node.*form-estudiantes" 2>/dev/null
    pkill -f "node.*Stats" 2>/dev/null
    pkill -f "node.*proxy-server.js" 2>/dev/null
    pkill -f "serve.*build" 2>/dev/null
fi

# Additional cleanup for any potentially remaining processes on the required ports
echo "Checking for any remaining processes on required ports..."
for port in 3000 3001 3003 3004 3005 3006 4000 4001 80; do
    pid=$(lsof -i :$port -t 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
    fi
done

echo "All applications have been stopped." 