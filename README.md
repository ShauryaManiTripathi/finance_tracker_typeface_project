# 💰 Personal Finance Assistant

> **A full-stack AI-powered personal finance management application** built with React, TypeScript, Express, PostgreSQL, and Google Gemini AI.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)
[![Node.js](https://img.shields.i### Testing
```bash
# All tests
npm test

# API tests only
npm test --workspace=apps/api

# Watch mode
npm test -- --watch
```

### Test Coverage
- Unit tests for validation logic
- Integration tests for API endpoints
- Test fixtures for receipts and statements

### Test Database
Tests use a separate database on port 5433 (configured in `.env.test`)

### Sample Files for Testing
The `SampleFiles/` folder contains example documents you can use to test the upload and import features:
- **`Bus_ticket.jpg`** - Single bus ticket receipt (tests receipt extraction)
- **`Petrol_invoice.png`** - Petrol station invoice (tests invoice processing)
- **`statement1.pdf`** - Bank statement with multiple transactions (tests bulk import)
- **`statement2.pdf`** - Another bank statement example (tests duplicate detection)

**Quick Test Flow:**
1. Register and login to the app
2. Navigate to "Import" page
3. Upload `Bus_ticket.jpg` → See single transaction extracted
4. Upload `statement1.pdf` → See multiple transactions in preview table
5. Edit, select, and import transactions
6. Check Dashboard for charts and summaries-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://www.postgresql.org/)

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
```bash
# Required
- Node.js 18+ and npm
- PostgreSQL 14+ (Docker Compose OR external PostgreSQL instance)
- Google Gemini API key (get from https://aistudio.google.com/app/apikey)
```

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Copy environment file
cp .env.example .env

# Edit .env and configure:
# 1. Add your Gemini API key
#    GEMINI_API_KEY="your-actual-api-key-here"
#
# 2. Set database URL (choose one):
#    - For Docker: DATABASE_URL="postgresql://finance_user:finance_password@localhost:5432/finance_db"
#    - For external PostgreSQL: DATABASE_URL="your-external-postgres-uri"
```

### Step 3: Setup Database

**Option A: Using Docker Compose (Recommended for local development)**
```bash
npm run db:setup
```
This will:
- Start PostgreSQL in Docker (port 5432)
- Run database migrations
- Create required tables

**Option B: Using External PostgreSQL**
```bash
# Just run migrations (ensure DATABASE_URL is set correctly in .env)
npm run db:migrate
```

### Step 4: Launch Application
```bash
npm run dev
```

**🎉 Done!** Your application is now running:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432

### First-Time User Flow
1. Navigate to http://localhost:5173
2. Click **"Register"** to create an account
3. Login with your credentials
4. **Optional**: Populate database using sample files from `SampleFiles/` folder:
   - `Bus_ticket.jpg` - Single receipt example
   - `Petrol_invoice.png` - Invoice example
   - `statement1.pdf` - Bank statement with multiple transactions
   - `statement2.pdf` - Another bank statement example
5. Start tracking your finances!

---

## 📋 Project Overview

### Assignment Requirements ✅

**Core Features (Required)**
- ✅ Create income/expense entries through web app
- ✅ List all income/expenses in a time range
- ✅ Show graphs (expenses by category, expenses by date)
- ✅ Extract expenses from uploaded receipts (images, PDFs)

**Bonus Features (Extra Credit)**
- ✅ Support upload of transaction history from PDF (tabular format)
- ✅ Pagination of list API
- ✅ Multi-user support with authentication

**Code Quality**
- ✅ Clean, modular code with meaningful names
- ✅ Separation of concerns (API separate from frontend)
- ✅ Comprehensive error handling and validation
- ✅ Well-documented with README and inline comments
- ✅ Database persistence with PostgreSQL + Prisma ORM

---

## ✨ Features

### 🔐 User Authentication
- Secure registration and login with JWT
- Password hashing with bcrypt
- Protected routes and API endpoints
- Multi-user support with data isolation

### 💸 Transaction Management
- Create, view, edit, and delete income/expense entries
- Categorize transactions (Food, Transport, Salary, etc.)
- Date range filtering (custom or preset ranges)
- Pagination for large transaction lists (20 per page)
- Sort by date, amount, or category

### 📊 Analytics & Insights
- **Summary Dashboard**: Total income, expenses, and net balance
- **Pie Chart**: Expenses breakdown by category
- **Line Chart**: Income/expense trends over time (daily, weekly, monthly)
- **Date Range Filters**: Current month, last 30 days, last 3 months, custom

### 📸 Receipt Scanning (AI-Powered)
- Upload receipt images (JPEG, PNG) or PDFs
- Automatic extraction of merchant, date, and amount using Google Gemini Vision API
- Review and edit extracted data before saving
- Supports POS receipts in English

### 📄 Statement Import (AI-Powered) 🆕
- Upload bank/credit card statements (PDF format)
- AI extracts **all transactions** from tabular data using Google Gemini
- Preview with editable table (edit amounts, dates, categories)
- Bulk category assignment for multiple transactions
- Duplicate detection and skip logic
- Creates missing categories automatically
- Handles 100+ transactions per statement

### 🤖 AI Financial Assistant 🆕
- Conversational AI agent powered by Google Gemini
- Ask questions like "What's my spending this month?"
- Natural language understanding of financial queries
- Real-time data access via function calling
- Provides spending insights and trends

---

## 🛠️ Tech Stack

### Backend (`apps/api/`)
| Technology | Purpose |
|------------|---------|
| **Node.js 18+** | JavaScript runtime |
| **TypeScript** | Type safety and developer experience |
| **Express.js** | Web framework for REST APIs |
| **PostgreSQL 14+** | Relational database |
| **Prisma ORM** | Type-safe database client |
| **JWT** | Authentication tokens |
| **bcrypt** | Password hashing |
| **Zod** | Request validation |
| **Multer** | File upload handling |
| **Google Gemini AI** | Vision API for receipt/statement extraction |
| **Jest** | Unit and integration testing |

### Frontend (`apps/web/`)
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Fast build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **React Router v6** | Client-side routing |
| **Axios** | HTTP client with interceptors |
| **Recharts** | Data visualization (charts) |
| **React Hook Form** | Form state management |
| **Heroicons** | Icon library |

### DevOps
- **Docker Compose**: PostgreSQL containerization
- **npm Workspaces**: Monorepo management
- **Concurrently**: Run API and web simultaneously

---

## 📁 Project Structure

```
personal-finance-assistant/
├── apps/
│   ├── api/                      # Backend Express.js application
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema
│   │   │   ├── migrations/       # DB migration history
│   │   │   └── seed.ts           # Sample data
│   │   ├── src/
│   │   │   ├── modules/          # Feature modules
│   │   │   │   ├── auth/         # Authentication logic
│   │   │   │   ├── transactions/ # Transaction CRUD
│   │   │   │   ├── categories/   # Category management
│   │   │   │   ├── stats/        # Analytics endpoints
│   │   │   │   ├── uploads/      # Receipt/statement processing
│   │   │   │   └── agent/        # AI assistant (NEW)
│   │   │   ├── middleware/       # Auth, error handling, validation
│   │   │   ├── config/           # Environment configuration
│   │   │   ├── utils/            # Gemini API, logger
│   │   │   ├── app.ts            # Express app setup
│   │   │   └── server.ts         # Entry point
│   │   └── package.json
│   │
│   └── web/                      # Frontend React application
│       ├── src/
│       │   ├── pages/            # Page components
│       │   │   ├── auth/         # Login, Register
│       │   │   ├── dashboard/    # Dashboard with charts
│       │   │   ├── transactions/ # Transaction list & form
│       │   │   ├── uploads/      # Receipt & statement upload
│       │   │   └── agent/        # AI chat interface (NEW)
│       │   ├── components/       # Reusable UI components
│       │   ├── services/         # API client services
│       │   ├── lib/              # Axios instance, utilities
│       │   ├── layouts/          # Page layouts with navigation
│       │   └── main.tsx          # Entry point
│       └── package.json
│
├── SampleFiles/                  # Example files for testing (NEW)
│   ├── Bus_ticket.jpg            # Single receipt example
│   ├── Petrol_invoice.png        # Invoice example
│   ├── statement1.pdf            # Bank statement sample
│   └── statement2.pdf            # Another statement sample
│
├── .env                          # Environment variables (create from .env.example)
├── .env.example                  # Environment template
├── .env.test                     # Test environment config
├── docker-compose.yml            # PostgreSQL container
├── package.json                  # Root workspace config
├── README.md                     # This file
├── srs.md                        # Software Requirements Specification
├── API.md                        # Detailed API documentation
└── ProgressTracks/               # Implementation progress logs
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Endpoints
```http
POST   /api/auth/register         # Create new user account
POST   /api/auth/login            # Login and get JWT token
```

### Transaction Endpoints (Protected)
```http
GET    /api/transactions          # List transactions (with filters & pagination)
POST   /api/transactions          # Create new transaction
GET    /api/transactions/:id      # Get single transaction
PUT    /api/transactions/:id      # Update transaction
DELETE /api/transactions/:id      # Delete transaction
```

**Query Parameters for GET /api/transactions:**
- `startDate`: Filter by start date (YYYY-MM-DD)
- `endDate`: Filter by end date (YYYY-MM-DD)
- `type`: Filter by INCOME or EXPENSE
- `categoryId`: Filter by category ID
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 20, max: 100)
- `sort`: Sort order (default: occurredAt:desc)

### Category Endpoints (Protected)
```http
GET    /api/categories            # List user's categories
POST   /api/categories            # Create category
PUT    /api/categories/:id        # Update category
DELETE /api/categories/:id        # Delete category
```

### Statistics Endpoints (Protected)
```http
GET    /api/stats/summary         # Get income/expense totals
GET    /api/stats/expenses-by-category    # Category breakdown
GET    /api/stats/expenses-over-time      # Time-series data
```

### Upload Endpoints (Protected)
```http
POST   /api/uploads/receipt       # Extract transaction from receipt image/PDF
POST   /api/uploads/statement     # Upload statement and extract transactions (NEW)
POST   /api/uploads/statement/commit     # Commit extracted transactions
```

### AI Agent Endpoint (Protected) 🆕
```http
POST   /api/agent/chat            # Send message to AI financial assistant
```

**Full API specification available in [`API.md`](./API.md)**

---

## 🧪 Available Scripts

### Development
```bash
npm run dev          # Start both API and web servers
npm run dev:api      # Start only backend (port 3001)
npm run dev:web      # Start only frontend (port 5173)
```

### Database
```bash
npm run db:setup     # Start PostgreSQL (Docker) + run migrations
npm run db:migrate   # Run Prisma migrations only (for external DB)
npm run db:seed      # Populate with sample data
```

### Testing
```bash
npm test             # Run all tests
npm run test:api     # Run backend tests only
```

### Production
```bash
npm run build        # Build both apps for production
```

---

## 🔧 Configuration

### Environment Variables

The application uses a **unified `.env` file at the root directory** for both frontend and backend.

**Required Variables:**
```bash
# Database (choose one)
# For Docker Compose:
DATABASE_URL="postgresql://finance_user:finance_password@localhost:5432/finance_db"
# For external PostgreSQL:
# DATABASE_URL="postgresql://user:password@your-host:5432/your-database"

# JWT Authentication
JWT_SECRET="your-super-secure-jwt-secret-change-in-production"
JWT_EXPIRES_IN="7d"

# Google Gemini AI (required for receipt/statement processing)
GEMINI_API_KEY="your-gemini-api-key-from-aistudio"
GEMINI_DEFAULT_MODEL="gemini-2.0-flash-exp"

# Frontend API URL
VITE_API_BASE_URL="http://localhost:3001/api"
```

**Optional Variables:**
```bash
# Server
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"

# Upload Limits
MAX_RECEIPT_SIZE_MB=10
MAX_STATEMENT_SIZE_MB=20

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Get Gemini API Key:**
1. Visit https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy and paste into `.env` file

---

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# API tests only
npm test --workspace=apps/api

# Watch mode
npm test -- --watch
```

### Test Coverage
- Unit tests for validation logic
- Integration tests for API endpoints
- Test fixtures for receipts and statements

### Test Database
Tests use a separate database on port 5433 (configured in `.env.test`)

---

## 🎯 Usage Guide

### 1. Register & Login
1. Navigate to http://localhost:5173
2. Click **"Register"** and create an account
3. Login with your credentials
4. JWT token stored in localStorage

### 2. Add Manual Transactions
1. Click **"Add Transaction"** in sidebar
2. Fill in details:
   - Type: Income or Expense
   - Amount: e.g., 1500.00
   - Date: Select from calendar
   - Category: Food, Transport, Salary, etc.
   - Description: Optional notes
3. Click **"Save Transaction"**

### 3. View Dashboard
1. Navigate to **"Dashboard"**
2. See summary cards (Income, Expenses, Balance)
3. View **Pie Chart** showing expenses by category
4. View **Line Chart** showing trends over time
5. Use date range filters (This Month, Last 30 Days, etc.)

### 4. Upload Receipt (Single Transaction)
1. Click **"Import"** in sidebar
2. Drag & drop receipt image (JPEG, PNG) or PDF
   - **Try sample files**: `SampleFiles/Bus_ticket.jpg` or `SampleFiles/Petrol_invoice.png`
3. AI extracts merchant, date, and amount
4. Review and edit if needed
5. Click **"Save Transaction"**

### 5. Import Bank Statement (Bulk)
1. Click **"Import"** in sidebar
2. Upload bank statement PDF (up to 20MB)
   - **Try sample files**: `SampleFiles/statement1.pdf` or `SampleFiles/statement2.pdf`
3. AI extracts all transactions in preview table
4. Edit any fields (date, amount, category, description)
5. Select/deselect rows to import
6. Bulk assign categories to multiple rows
7. Click **"Import Selected Transactions"**
8. Duplicates automatically skipped

### 6. Ask AI Assistant 🆕
1. Click **"AI Agent"** in sidebar
2. Type questions like:
   - "What's my total spending this month?"
   - "Show me my top 3 expense categories"
   - "How much did I spend on food last week?"
3. Get instant insights from your data

---

## 🏗️ Architecture

### Data Flow
```
User Input (Web) 
    ↓
React Components
    ↓
Axios HTTP Client
    ↓
Express.js REST API
    ↓
Validation Middleware (Zod)
    ↓
Service Layer (Business Logic)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

### AI Processing Flow
```
User Uploads File
    ↓
Multer (File Handling)
    ↓
Google Gemini Vision API
    ↓
Structured JSON Extraction
    ↓
Validation & Normalization
    ↓
Preview/Edit Interface
    ↓
Batch Insert to Database
```

### Key Design Patterns
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **Middleware Chain**: Auth, validation, error handling
- **DTO Pattern**: Request/response validation with Zod
- **API-First**: Frontend completely decoupled from backend

---

## 🔒 Security

### Authentication
- JWT tokens with 7-day expiration
- HttpOnly cookies recommended for production
- Token refresh not implemented (keep sessions short)

### Password Security
- bcrypt hashing with cost factor 10
- Passwords never logged or returned in responses
- Minimum 6 characters (configurable)

### Authorization
- User ID extracted from JWT
- All queries scoped to authenticated user
- IDOR protection through userId filtering

### File Upload Security
- MIME type validation (images, PDFs only)
- File size limits (10MB receipts, 20MB statements)
- Files stored outside public web root
- Temporary files deleted after processing

### API Security
- CORS configured (localhost for dev)
- Rate limiting (100 requests per 15 minutes)
- Input validation with Zod schemas
- SQL injection prevention via Prisma

### Data Privacy
- User consent for Gemini AI processing
- Files not permanently stored (deleted after extraction)
- Gemini API key server-side only

---

## 🐛 Troubleshooting

### Database Connection Issues

**If using Docker Compose:**
```bash
# Check if PostgreSQL is running
docker ps

# Restart database
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs db
```

**If using external PostgreSQL:**
```bash
# Verify DATABASE_URL is correct in .env
# Test connection manually:
psql "your-database-url-here"

# Check if database exists and user has permissions
```

### Port Already in Use
```bash
# Kill process on port 3001 (API)
lsof -ti:3001 | xargs kill -9

# Kill process on port 5173 (Web)
lsof -ti:5173 | xargs kill -9
```

### Gemini API Errors
- Verify API key is correct in `.env`
- Check quota limits at https://aistudio.google.com
- Ensure file size under limits (20MB)
- Try fallback model: `GEMINI_FALLBACK_MODEL=gemini-2.5-flash`

### Frontend Not Connecting to API
- Check `VITE_API_BASE_URL` in `.env`
- Verify API server is running on port 3001
- Check browser console for CORS errors
- Clear browser cache and localStorage

### Migration Errors
```bash
# Reset database (WARNING: deletes all data)
npm run db:migrate -- --reset

# Create new migration
cd apps/api
npx prisma migrate dev --name your_migration_name
```

---

## 📚 Additional Documentation

- **[srs.md](./srs.md)** - Complete Software Requirements Specification
- **[API.md](./API.md)** - Detailed API endpoint documentation
- **[folder_structure.md](./folder_structure.md)** - Project structure breakdown
- **[ProgressTracks/](./ProgressTracks/)** - Implementation progress logs
- **[task.md](./task.md)** - Original assignment requirements

---

## 🎓 Assignment Compliance

### Requirements Met ✅

**Core Requirements:**
- ✅ Create income/expenses through web app
- ✅ List all income/expenses in time range
- ✅ Show graphs (expenses by category, by date)
- ✅ Extract expenses from uploaded receipts (images, PDFs)
- ✅ API separate from frontend
- ✅ Database persistence (PostgreSQL)

**Bonus Features:**
- ✅ Upload transaction history from PDF (tabular format)
- ✅ Pagination support (20 items per page, configurable)
- ✅ Multi-user support with authentication

**Code Quality:**
- ✅ Clean, readable code with meaningful names
- ✅ Modular architecture (services, controllers, routes)
- ✅ Comprehensive README with setup instructions
- ✅ Error handling and validation throughout
- ✅ Comments explaining complex logic

---

## 🚀 Production Deployment (Optional)

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` (32+ characters)
3. Configure production database URL
4. Set up managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
5. Enable HTTPS
6. Configure CORS to frontend domain only

### Build
```bash
npm run build
```

### Serve
```bash
# API
cd apps/api
npm start

# Web (use Nginx or similar)
cd apps/web
# Serve dist/ folder
```

---

## 📝 License

MIT License - feel free to use this project for learning and development.

---

## 👤 Author

**Typeface.ai Software Engineer Assignment**

Developed as part of the technical assessment for Typeface India.

---

## 🙏 Acknowledgments

- **Google Gemini AI** for vision and language models
- **Prisma** for excellent TypeScript ORM
- **Vite** for lightning-fast development
- **Tailwind CSS** for utility-first styling
- **Recharts** for beautiful data visualizations

---

**Need Help?** Check the [Troubleshooting](#-troubleshooting) section or review detailed docs in `srs.md` and `API.md`.