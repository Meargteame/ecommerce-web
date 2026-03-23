const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');
const outputFile = path.join(__dirname, 'all_migrations.sql');

const files = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort(); // Sorts files like 001_, 002_, ensuring correct order

let combinedSql = '';

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  combinedSql += `-- --- Migration: ${file} ---\n`;
  combinedSql += content + '\n\n';
}

fs.writeFileSync(outputFile, combinedSql);
console.log('Successfully created all_migrations.sql');
