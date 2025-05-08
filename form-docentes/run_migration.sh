#!/bin/bash

# Script to update the jornada column in the docentes_form_submissions table

echo "Starting migration to update jornada column to array type"

# Check if DATABASE_URL environment variable is set
if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL environment variable is not set."
    echo "Please set it to run the migration, e.g.:"
    echo "export DATABASE_URL=postgresql://user:password@localhost:5432/database"
    exit 1
fi

echo "Running migration script..."
psql "$DATABASE_URL" -f ./migrations/update_jornada_column.sql

if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
else
    echo "Migration failed. Please check the error messages above."
    exit 1
fi

echo "Migration process completed." 