# Personal Finance Assistant

A full-stack web application for personal finance management with income/expense tracking, transaction categorization, receipt processing, and AI-powered statement import.

## Features

### Core Features
- ✅ **Multi-user Authentication** - Secure registration and login with JWT
- ✅ **Transaction Management** - Create, read, update, delete income and expense entries
- ✅ **Categorization** - Organize transactions with custom categories
- ✅ **Date Range Filtering** - View transactions within specific time periods
- ✅ **Analytics & Charts** - Visual insights with expense categorization and trends
- ✅ **Receipt Processing** - Extract transaction data from uploaded receipt images/PDFs

### Bonus Features
- ✅ **Pagination** - Efficient handling of large transaction lists
- ✅ **Statement Import** - AI-powered PDF statement processing with Google Gemini
- ✅ **Multi-tenancy** - Isolated data per user

## Tech Stack

### Backend (apps/api)
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Zod for request validation
- **File Processing**: Multer for uploads, Tesseract.js for OCR
- **AI Integration**: Google Gemini for statement processing

### Frontend (apps/web)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios with JWT interceptors
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Google Gemini API key (for AI features)

### Setup

1. **Clone and install dependencies**
   ```bash
   cd /home/dekode/Desktop/app
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the database**
   ```bash
   npm run db:setup
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```
   
   This will start:
   - API server at http://localhost:3001
   - Web app at http://localhost:5173

### Available Scripts

- `npm run dev` - Start both API and web servers
- `npm run dev:api` - Start only the API server
- `npm run dev:web` - Start only the web server
- `npm run build` - Build both applications for production
- `npm run test` - Run tests for both applications
- `npm run db:setup` - Start database and run migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data

## API Documentation

The API follows RESTful conventions with the following main endpoints:

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Transactions
- `GET /transactions` - List transactions with filtering and pagination
- `POST /transactions` - Create new transaction
- `GET /transactions/:id` - Get specific transaction
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction

### Categories
- `GET /categories` - List user categories
- `POST /categories` - Create category
- `PUT /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category

### Statistics
- `GET /stats/summary` - Get income/expense summary
- `GET /stats/expenses-by-category` - Get expenses grouped by category
- `GET /stats/expenses-over-time` - Get time-series data

### File Processing
- `POST /uploads/receipt` - Process receipt image/PDF
- `POST /imports/ai/from-pdf` - Import transactions from PDF statement
- `POST /imports/ai/preview` - Preview imported data
- `POST /imports/ai/commit` - Commit imported transactions

## Project Structure

```
/
├── apps/
│   ├── api/          # Backend Express.js application
│   └── web/          # Frontend React application
├── docker-compose.yml # PostgreSQL setup
├── package.json      # Workspace configuration
└── README.md         # This file
```

See `folder_structure.md` for detailed project organization.

## Development Guidelines

### Code Quality
- TypeScript strict mode enabled
- Modular architecture with clear separation of concerns
- Comprehensive error handling and validation
- Structured logging and monitoring
- Unit and integration tests

### Security
- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS configuration
- File upload security

## License

MIT License - see LICENSE file for details.