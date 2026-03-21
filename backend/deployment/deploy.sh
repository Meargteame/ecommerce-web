#!/bin/bash

# Configuration
APP_DIR="/var/www/ecommerce-backend"
REPO_URL="your-repo-url"

echo "Starting deployment..."

# Navigate to app directory
cd $APP_DIR

# Pull latest changes
git pull origin main

# Navigate to backend
cd backend

# Install dependencies
npm install

# Build the project
npm run build

# Run migrations
npm run db:migrate

# Restart PM2 process
pm2 restart ecosystem.config.js --env production

echo "Deployment complete!"
