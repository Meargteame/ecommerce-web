#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check for DATABASE_URL (common for Cloud Postgres)
if [ -n "$DATABASE_URL" ]; then
  PSQL_CONN="$DATABASE_URL"
  echo "Using DATABASE_URL for connection"
else
  # Default values
  DB_HOST=${DB_HOST:-localhost}
  DB_PORT=${DB_PORT:-5432}
  DB_NAME=${DB_NAME:-ecommerce_db}
  DB_USER=${DB_USER:-postgres}
  PSQL_CONN="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
  
  # Check if PostgreSQL is running (only for local)
  if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo "Error: PostgreSQL is not running on $DB_HOST:$DB_PORT"
    exit 1
  fi

  # Create database if it doesn't exist (only if NOT using DATABASE_URL)
  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME"
fi

echo "Database setup complete!"
echo "Run migrations with: npm run migrate"
