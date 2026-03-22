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
fi

# Create migrations tracking table if it doesn't exist
psql $PSQL_CONN -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_file VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# Run migrations in order
for migration_file in migrations/*.sql; do
  filename=$(basename "$migration_file")
  
  # Check if migration has already been applied
  already_applied=$(psql $PSQL_CONN -t -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '$filename'")
  
  if [ "$already_applied" -eq 0 ]; then
    echo "Applying migration: $filename"
    psql $PSQL_CONN -f "$migration_file"
    
    if [ $? -eq 0 ]; then
      psql $PSQL_CONN -c "INSERT INTO schema_migrations (migration_file) VALUES ('$filename')"
      echo "✓ Migration $filename applied successfully"
    else
      echo "✗ Migration $filename failed"
      exit 1
    fi
  else
    echo "⊘ Migration $filename already applied, skipping"
  fi
done

echo ""
echo "All migrations completed successfully!"
