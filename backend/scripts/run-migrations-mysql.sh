#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-ecommerce_db}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASSWORD:-""}

# MySQL connection string (using -p if password is provided)
MYSQL_CMD="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER"
if [ -n "$DB_PASS" ]; then
    MYSQL_CMD="$MYSQL_CMD -p$DB_PASS"
fi

# Check for database and create if missing
$MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"

# Use the specific database for further commands
MYSQL_CMD="$MYSQL_CMD $DB_NAME"

# Check if MySQL is accessible
if ! $MYSQL_CMD -e "SELECT 1" > /dev/null 2>&1; then
  echo "Error: Cannot connect to MySQL at $DB_HOST:$DB_PORT with user $DB_USER."
  echo "Make sure MySQL is running and credentials in .env are correct."
  exit 1
fi

# Create migrations tracking table if it doesn't exist
$MYSQL_CMD -e "
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_file VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# Run migrations in order
for migration_file in migrations/*.sql; do
  filename=$(basename "$migration_file")
  
  # Check if migration has already been applied
  already_applied=$($MYSQL_CMD -N -s -e "SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '$filename'")
  
  if [ "$already_applied" -eq 0 ]; then
    echo "Applying migration: $filename"
    $MYSQL_CMD < "$migration_file"
    
    if [ $? -eq 0 ]; then
      $MYSQL_CMD -e "INSERT INTO schema_migrations (migration_file) VALUES ('$filename')"
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
echo "All MySQL migrations completed successfully!"
