# E-commerce Backend API

Node.js/Express backend API for the e-commerce platform.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT
- **Validation**: Zod
- **Testing**: Jest

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ installed and running
- Redis installed and running

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

4. Run database migrations (after setting up migrations):
```bash
npm run migrate
```

### Development

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Building

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── middleware/     # Express middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── dist/               # Compiled JavaScript
└── package.json
```

## API Documentation

API documentation will be available at `/api/docs` once implemented with Swagger.

## Environment Variables

See `.env.example` for all required environment variables.

## License

MIT
