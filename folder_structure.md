Monorepo layout (apps/api + apps/web)

Repository tree
.
├─ README.md
├─ API.md                           # Complete API documentation
├─ docker-compose.yml               # Postgres database
├─ package.json                     # workspaces: ["apps/*"]
├─ .gitignore
├─ .env.example                     # Root environment template
├─ srs.md                           # Software Requirements Specification
├─ task.md                          # Project tasks and milestones
├─ techstack.md                     # Technology stack documentation
├─ ProgressTracks/                  # Implementation progress tracking
│  ├─ AUTH_IMPLEMENTATION.md        # Auth module completion
│  ├─ CATEGORY_IMPLEMENTATION.md    # Category module completion
│  ├─ SDK_MIGRATION.md              # Gemini SDK migration guide
│  ├─ UPLOAD_MODULE_COMPLETE.md     # Upload module documentation
│  └─ STATS_IMPLEMENTATION.md       # Stats module completion
└─ apps
   ├─ api
   │  ├─ package.json
   │  ├─ tsconfig.json
   │  ├─ jest.config.js             # Jest testing configuration
   │  ├─ .env                        # Environment variables (gitignored)
   │  ├─ .env.example                # Environment template
   │  ├─ prisma
   │  │  ├─ schema.prisma            # Database schema
   │  │  ├─ seed.ts                  # Database seeding script
   │  │  └─ migrations/              # Database migrations
   │  │     ├─ migration_lock.toml
   │  │     ├─ 20251006171925_init/
   │  │     ├─ 20251006180512_add_stats/
   │  │     └─ 20251006215942_add_upload_preview/
   │  └─ src
   │     ├─ server.ts                # Express server entry point
   │     ├─ app.ts                   # Express app configuration
   │     ├─ routes
   │     │  └─ index.ts              # Main route aggregator
   │     ├─ config
   │     │  └─ index.ts              # Configuration with Zod validation
   │     ├─ db
   │     │  └─ prisma.ts             # Prisma client instance
   │     ├─ middleware
   │     │  ├─ auth.ts               # JWT authentication
   │     │  ├─ validate.ts           # Zod validation middleware
   │     │  └─ error.ts              # Global error handler
   │     ├─ utils
   │     │  ├─ logger.ts             # Winston logger
   │     │  └─ gemini.ts             # Google Gemini AI integration
   │     ├─ types
   │     │  └─ express.d.ts          # TypeScript type extensions
   │     ├─ modules
   │     │  ├─ auth
   │     │  │  ├─ auth.routes.ts
   │     │  │  ├─ auth.routes.test.ts
   │     │  │  ├─ auth.controller.ts
   │     │  │  ├─ auth.service.ts
   │     │  │  ├─ auth.service.test.ts
   │     │  │  └─ auth.validators.ts
   │     │  ├─ categories
   │     │  │  ├─ category.routes.ts
   │     │  │  ├─ category.routes.test.ts
   │     │  │  ├─ category.controller.ts
   │     │  │  ├─ category.service.ts
   │     │  │  ├─ category.service.test.ts
   │     │  │  └─ category.validators.ts
   │     │  ├─ transactions
   │     │  │  ├─ transaction.routes.ts
   │     │  │  ├─ transaction.routes.test.ts
   │     │  │  ├─ transaction.controller.ts
   │     │  │  ├─ transaction.service.ts
   │     │  │  ├─ transaction.service.test.ts
   │     │  │  ├─ transaction.repo.ts
   │     │  │  └─ transaction.validators.ts
   │     │  ├─ stats
   │     │  │  ├─ stats.routes.ts
   │     │  │  ├─ stats.routes.test.ts
   │     │  │  ├─ stats.controller.ts
   │     │  │  ├─ stats.service.ts
   │     │  │  └─ stats.service.test.ts
   │     │  └─ uploads
   │     │     ├─ upload.routes.ts           # All upload endpoints
   │     │     ├─ upload.routes.test.ts      # Route integration tests (26 tests)
   │     │     ├─ upload.controller.ts       # 6 endpoint handlers
   │     │     ├─ upload.service.ts          # AI extraction & commit logic
   │     │     ├─ upload.service.test.ts     # Service tests (21 tests)
   │     │     ├─ upload.validators.ts       # Zod schemas
   │     │     └─ testfiles/                 # Test assets
   │     │        ├─ petrol-or-fuel-receipt-template-for-Asian-or-India-customer.png
   │     │        └─ dummy_statement.pdf
   │     ├─ uploads/                         # Multer temp file storage
   │     │  ├─ receipts/                     # Receipt uploads (10MB max)
   │     │  └─ statements/                   # Statement uploads (20MB max)
   │     └─ __tests__
   │        ├─ setup.ts                      # Jest global setup
   │        └─ helpers.ts                    # Test utilities
   └─ web
      ├─ package.json
      ├─ tsconfig.json
      ├─ vite.config.ts
      ├─ index.html
      ├─ postcss.config.js
      ├─ tailwind.config.js
      ├─ .env.example
      └─ src
         ├─ main.tsx
         ├─ App.tsx
         ├─ routes.tsx
         ├─ lib
         │  ├─ api.ts                       # Axios API client
         │  └─ auth.ts                      # Auth utilities
         ├─ components
         │  ├─ Layout.tsx
         │  ├─ Navbar.tsx
         │  ├─ ProtectedRoute.tsx
         │  ├─ Pagination.tsx
         │  ├─ DateRangePicker.tsx
         │  └─ Charts
         │     ├─ ExpensesPie.tsx
         │     └─ OverTimeChart.tsx
         └─ pages
            ├─ Login.tsx
            ├─ Register.tsx
            ├─ Dashboard.tsx
            ├─ Transactions.tsx
            ├─ AddTransaction.tsx
            ├─ UploadReceipt.tsx            # Receipt upload UI
            └─ UploadStatement.tsx          # Statement upload UI

---

## Module Status

### ✅ Completed Modules (100%)

1. **Authentication** - User registration, login, JWT tokens
   - Tests: 48/48 passing
   - Files: auth.routes.ts, auth.controller.ts, auth.service.ts, auth.validators.ts
   - Features: Bcrypt password hashing, JWT generation, protected routes

2. **Categories** - Income/Expense category management
   - Tests: 27/27 passing
   - Files: category.routes.ts, category.controller.ts, category.service.ts, category.validators.ts
   - Features: CRUD operations, user isolation, type filtering

3. **Transactions** - Transaction CRUD operations
   - Tests: 32/32 passing
   - Files: transaction.routes.ts, transaction.controller.ts, transaction.service.ts, transaction.repo.ts, transaction.validators.ts
   - Features: Full CRUD, filtering, pagination, category linking

4. **Statistics** - Analytics and reporting
   - Tests: 33/33 passing
   - Files: stats.routes.ts, stats.controller.ts, stats.service.ts
   - Features: Summary stats, expenses by category, time-series data (daily/weekly/monthly)

5. **Uploads** - AI-powered receipt and statement extraction
   - Tests: 47/47 passing (26 route tests + 21 service tests)
   - Files: upload.routes.ts, upload.controller.ts, upload.service.ts, upload.validators.ts
   - Features:
     * Receipt OCR via Gemini Vision API
     * Statement PDF parsing via Gemini Multimodal
     * Category auto-suggestion
     * Preview/verify/commit workflow
     * 15-minute preview TTL
     * Deduplication for statement imports
     * File validation (MIME type, size limits)

### 📊 Test Coverage: 187/187 (100%) ✅

- Auth: 48 tests
- Categories: 27 tests
- Transactions: 32 tests
- Stats: 33 tests
- Uploads: 47 tests

---

## Technology Stack

### Backend
- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (via Docker)
- **ORM:** Prisma v5.22.0
- **Authentication:** JWT (jsonwebtoken), bcrypt
- **Validation:** Zod
- **Testing:** Jest, Supertest
- **Logging:** Winston
- **File Uploads:** Multer
- **AI/ML:** Google Gemini API (@google/genai v1.22.0)

### Frontend (Planned)
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **State Management:** React Context / Zustand
- **HTTP Client:** Axios
- **Charts:** Recharts / Chart.js

### DevOps
- **Database:** Docker Compose (PostgreSQL)
- **Environment:** dotenv
- **Package Manager:** npm workspaces
- **Git:** Version control with .gitignore

---

## API Endpoints Summary

### Auth (2 endpoints)
- POST /api/auth/register
- POST /api/auth/login

### Categories (5 endpoints)
- GET /api/categories
- POST /api/categories
- GET /api/categories/:id
- PUT /api/categories/:id
- DELETE /api/categories/:id

### Transactions (5 endpoints)
- GET /api/transactions
- POST /api/transactions
- GET /api/transactions/:id
- PUT /api/transactions/:id
- DELETE /api/transactions/:id

### Statistics (3 endpoints)
- GET /api/stats/summary
- GET /api/stats/expenses-by-category
- GET /api/stats/expenses-over-time

### Uploads (6 endpoints)
- POST /api/uploads/receipt (AI extraction)
- POST /api/uploads/statement (AI extraction)
- POST /api/uploads/receipt/commit (save to DB)
- POST /api/uploads/statement/commit (bulk save)
- GET /api/uploads/previews (list active previews)
- GET /api/uploads/previews/:id (get specific preview)

**Total: 21 endpoints, all fully tested and documented**

---

## Database Schema

### Models
- **User** - Authentication and ownership
- **Category** - Income/Expense categories
- **Transaction** - Financial transactions
- **UploadPreview** - Temporary AI-extracted data (TTL: 15 minutes)

### Relationships
```
User (1) ──→ (N) Category
User (1) ──→ (N) Transaction
User (1) ──→ (N) UploadPreview
Category (1) ──→ (N) Transaction
```

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start database:**
   ```bash
   docker-compose up -d
   ```

3. **Run migrations:**
   ```bash
   cd apps/api
   npx prisma migrate dev
   ```

4. **Seed database (optional):**
   ```bash
   npx prisma db seed
   ```

5. **Start API server:**
   ```bash
   npm run dev
   ```

6. **Run tests:**
   ```bash
   npm test
   ```

7. **Access API:**
   - Base URL: http://localhost:3001/api
   - Documentation: See API.md

---

## Environment Variables

### Required (.env in apps/api/)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/finance_db"
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"

# Google Gemini API
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_DEFAULT_MODEL="gemini-2.0-flash-exp"
GEMINI_FALLBACK_MODEL="gemini-2.5-flash"

# Upload Configuration
MAX_RECEIPT_SIZE_MB=10
MAX_STATEMENT_SIZE_MB=20
AI_PREVIEW_TTL_SEC=900  # 15 minutes
```

---

**Last Updated:** October 7, 2025
**Status:** Backend Complete ✅ | Frontend Pending
**Next Steps:** Frontend implementation for all modules