# Backend Setup Guide

Complete guide to set up the e-commerce backend locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Redis** 7+ ([Download](https://redis.io/download))

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Install PostgreSQL (if not installed)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

### 3. Install Redis (if not installed)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS (using Homebrew):**
```bash
brew install redis
brew services start redis
```

**Windows:**
Download from [Redis Downloads](https://redis.io/download) or use WSL

### 4. Configure PostgreSQL

Set up PostgreSQL user and password:

```bash
# Access PostgreSQL
sudo -u postgres psql

# In PostgreSQL shell, create user and set password
CREATE USER postgres WITH PASSWORD 'postgres';
ALTER USER postgres WITH SUPERUSER;

# Exit
\q
```

### 5. Configure Environment Variables

The `.env` file has been created with default development values. Update if needed:

```bash
# Edit .env file
nano .env
```

Key variables to check:
- `DB_PASSWORD` - Your PostgreSQL password
- `DB_NAME` - Database name (default: ecommerce_db)
- `JWT_SECRET` - Change for production
- `PORT` - API server port (default: 5000)

### 6. Create Database

```bash
npm run db:setup
```

This will create the `ecommerce_db` database if it doesn't exist.

### 7. Run Migrations

```bash
npm run db:migrate
```

This will create all database tables with proper schema.

### 8. Verify Setup

Check if PostgreSQL is running:
```bash
pg_isready
```

Check if Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### 9. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

Test the health endpoint:
```bash
curl http://localhost:5000/health
```

## Database Schema

The migrations create the following tables:

### Core Tables (Migration 001)
- `users` - User accounts
- `addresses` - User addresses
- `categories` - Product categories
- `products` - Product catalog
- `product_variants` - Product variations
- `product_images` - Product images

### Order Tables (Migration 002)
- `orders` - Customer orders
- `order_items` - Order line items
- `order_status_history` - Order status tracking

### Payment & Shipping Tables (Migration 003)
- `payments` - Payment transactions
- `refunds` - Refund records
- `shipments` - Shipment tracking

### Review & Support Tables (Migration 004)
- `reviews` - Product reviews
- `product_questions` - Product Q&A questions
- `product_answers` - Product Q&A answers
- `support_tickets` - Customer support tickets
- `ticket_messages` - Support ticket messages

### Marketing & Analytics Tables (Migration 005)
- `promotions` - Discount codes and promotions
- `carts` - Shopping carts
- `cart_items` - Cart items
- `wishlists` - User wishlists
- `analytics_events` - Analytics tracking
- `email_subscriptions` - Email subscribers

## Troubleshooting

### PostgreSQL Connection Issues

**Error: "FATAL: password authentication failed"**
```bash
# Reset PostgreSQL password
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'postgres';
\q
```

**Error: "could not connect to server"**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql
```

### Redis Connection Issues

**Error: "Redis connection refused"**
```bash
# Check if Redis is running
redis-cli ping

# Start if not running
sudo systemctl start redis-server  # Linux
brew services start redis          # macOS
```

### Port Already in Use

**Error: "Port 5000 is already in use"**
```bash
# Change PORT in .env file
PORT=5001
```

## Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Setup database
npm run db:setup

# Run migrations
npm run db:migrate
```

## Next Steps

1. ✅ Backend infrastructure is set up
2. ✅ Database schema is created
3. 🔄 Next: Implement authentication service (Task 3.1)
4. 🔄 Next: Implement API endpoints (Phase 4)

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Support

If you encounter any issues, check:
1. All services are running (PostgreSQL, Redis)
2. Environment variables are correctly set
3. Database migrations have been applied
4. Node modules are installed

For more help, refer to the main project README or create an issue.
