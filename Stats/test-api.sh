#!/bin/bash

BASE_URL="https://cosmo-rlt-stats.onrender.com"

# Test frequency ratings endpoint
echo "Testing /api/frequency-ratings..."
curl -s "${BASE_URL}/api/frequency-ratings" | jq .

# Test monitoring endpoint
echo -e "
Testing /api/monitoring..."
curl -s "${BASE_URL}/api/monitoring" | jq .

# Test grades endpoint
echo -e "
Testing /api/test-grades..."
curl -s "${BASE_URL}/api/test-grades" | jq .

# Test estudiantes grades endpoint
echo -e "
Testing /api/estudiantes-grades..."
curl -s "${BASE_URL}/api/estudiantes-grades" | jq .
