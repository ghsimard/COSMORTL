#!/bin/bash

# Rebuild all applications with updated homepage settings
echo "Rebuilding all applications..."

# Stop any running applications
./stop-all.sh

# Rebuild form-docentes
echo "Rebuilding form-docentes..."
cd form-docentes
npm run build
cd ..

# Rebuild form-acudientes
echo "Rebuilding form-acudientes..."
cd form-acudientes
npm run build
cd ..

# Rebuild form-estudiantes
echo "Rebuilding form-estudiantes..."
cd form-estudiantes
npm run build
cd ..

# Rebuild Stats frontend
echo "Rebuilding Stats frontend..."
cd Stats/frontend
npm run build
cd ../..

echo "All applications have been rebuilt."
echo "Start the applications with: sudo ./start-all.sh" 