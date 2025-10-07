Personal Finance Assistant — Software Requirements Specification (SRS)
Version: 1.0  
Date: 2025-10-06  
Author: You

1) Introduction
- Purpose
  - Define complete functional and non-functional requirements for a full-stack Personal Finance Assistant that meets the assignment brief and includes bonus features. This SRS is implementation-oriented, specify- Pagination: page >= 1; pageSize 1–100; default 20.

Receipt Extraction via Gemini Vision
- Gemini Model: gemini-2.0-flash-exp (default) or gemini-2.5-flash for cost optimization.
- Vision API: Supports images (JPEG, PNG) and PDF files.
- Structured Output: Use responseMimeType=application/json with schema defining:
  - merchant: string (required)
  - date: string in YYYY-MM-DD format (required)
  - amount: number (required)
  - currency: string (default "INR")
  - description: string (optional, itemized list or category hint)
  - confidence: object with per-field confidence scores 0-1 (optional)
- Prompt Engineering:
  - "You are a financial assistant. Extract transaction details from this receipt image."
  - "Return JSON with merchant name, date (YYYY-MM-DD), total amount as a number, currency code (default INR), and a brief description."
  - "If any field is unclear or missing, set it to null and indicate low confidence."
- Fallback: If Gemini returns invalid JSON or extraction fails, return 422 with error message.
- Privacy: Receipt images are processed by Gemini but not stored permanently; delete after extraction.

AI Table Schema v1 (for Gemini and paste-import)ontracts, data model, validations, UI, and an AI-assisted PDF import via Google Gemini.

- Scope
  - Users log income and expenses, categorize transactions, filter by date range, see summaries and charts, extract expenses from uploaded receipts (images/PDF), and import transaction histories from PDF statements using Gemini, with preview/edit/commit flow. Multi-user support and pagination included.

- Definitions
  - Transaction: A financial record (INCOME or EXPENSE).
  - Category: Label assigned to a transaction (e.g., Food, Salary).
  - Receipt: POS document (image/PDF) containing merchant, date, total.
  - Statement: Bank/credit card PDF containing multiple transaction rows.
  - OCR: Optical Character Recognition.
  - AI Import: Converting a statement PDF to a structured JSON table via Gemini.

- Stakeholders
  - Developer (you), Evaluators (Typeface India), End Users (app users).

- References
  - Assignment email and problem statement. Google Gemini model docs (1.5 Flash/Pro), JSON Schema draft-07.

2) Product Overview
- Product Perspective
  - API-first web application; frontend communicates with backend via REST APIs. Data persisted in a relational database. Files uploaded to backend and processed (OCR for receipts, Gemini for statements).

- Recommended Tech Stack (non-binding)
  - Backend: Node.js 18+, TypeScript, Express, PostgreSQL 14+, Prisma ORM, JWT auth, Zod/Ajv for validation, Multer for uploads.
  - Frontend: React + Vite + TypeScript, TailwindCSS, Recharts, Axios.
  - AI/Vision: Google Gemini (gemini-2.0-flash-exp or gemini-2.5-flash) for both receipt OCR and statement parsing via structured output.

- Constraints & Assumptions
  - Default currency: INR (user-visible); DB stores currency string.
  - Timezones: Store occurredAt in UTC; convert to user’s local time on UI.
  - Receipts in English; statements in typical tabular forms (with debit/credit or signed amounts).
  - Separate frontend and backend codebases; all data access via APIs.
  - No paid third-party services required (Gemini requires API key; free/paid quotas as applicable).
  - Desktop web only for this assignment.

3) User Roles
- End User
  - Can register/login, manage their own categories and transactions, upload receipts/statements, view charts.
- Admin
  - Not in scope.

4) Functional Requirements
F1. Authentication and Multi-User (Bonus)
- Description: Users register and login; all data is scoped to the authenticated user.
- Flows:
  - Register: POST email + password → returns JWT.
  - Login: POST email + password → returns JWT.
- Validation:
  - Email must be valid; password min length 6.
- Acceptance Criteria:
  - Duplicate email returns 409.
  - Invalid credentials return 401.
  - JWT validity 7 days (configurable).

F2. Category Management (Optional but Recommended)
- Description: Manage user-specific categories for income/expense.
- Actions:
  - List categories.
  - Create category (unique name per user).
  - Update name/type.
  - Delete if not referenced (or allow if soft deletion; optional).
- Acceptance Criteria:
  - Category type must match transaction type when assigned.
  - Unique name per user enforced.

F3. Create Transaction (Income/Expense)
- Description: Users can manually create transactions.
- Fields (request):
  - type: INCOME | EXPENSE (required)
  - amount: positive decimal (required; two decimal precision)
  - currency: string (default: INR)
  - occurredAt: ISO 8601 (required)
  - description: string (optional)
  - merchant: string (optional)
  - categoryId: string (optional)
  - source: MANUAL | RECEIPT | PDF_IMPORT (default MANUAL)
  - receiptUrl: string (optional)
- Acceptance Criteria:
  - Validations enforced; returns created transaction with ID.

F4. List Transactions with Filters and Pagination (Bonus)
- Description: Fetch paginated list with optional filters.
- Filters:
  - startDate, endDate (inclusive)
  - type (INCOME/EXPENSE)
  - categoryId
  - sort: occurredAt:asc|desc (default occurredAt:desc)
  - page (default 1), pageSize (default 20; range 1–100)
- Acceptance Criteria:
  - Response includes items, total, page, pageSize.
  - Stable ordering by occurredAt then id for tie-breaker.

F5. Transaction Details, Update, Delete
- Description: Users can retrieve, update, and delete their transactions.
- Update:
  - Editable fields: type, amount, currency, occurredAt, description, merchant, categoryId, receiptUrl.
- Acceptance Criteria:
  - 404 for not found; ownership enforced.

F6. Stats and Charts
- Summary:
  - GET total income, total expenses, net for a date range.
- Expenses by Category:
  - Returns aggregated expense totals grouped by category for date range.
- Expenses Over Time:
  - Returns time-bucketed totals (daily | weekly | monthly) for income and expenses, including net by bucket.
- Acceptance Criteria:
  - Correct aggregations respecting filters and user scope.

F7. Transaction Document Import via Gemini (Unified) 🆕
- Description: Upload any transaction document (receipt images, invoices, or bank statement PDFs); backend uses Gemini Vision API to extract ALL transactions from the document and return structured JSON. Works for single transactions (1 receipt) or bulk imports (100+ transactions from statements).

- Supported Document Types:
  - **Single Receipts**: JPEG, PNG, WebP images (1 transaction)
  - **Multiple Receipts**: JPEG, PNG, WebP images (1-5 transactions)
  - **Invoices**: PDF or images (1-10 transactions)
  - **Bank Statements**: PDF (10-100+ transactions)
  - **Credit Card Statements**: PDF (10-100+ transactions)

- Inputs:
  - file: image/jpeg, image/png, image/webp, application/pdf; max 20 MB for all types.

- Output:
  - Array of candidate transactions (each with type=INCOME|EXPENSE, amount, occurredAt, merchant, description)
  - Account information (if statement): accountNumber, bank, period
  - Confidence scores per transaction (optional)
  - Preview ID for verification workflow

- Process:
  1. **Upload & Extract** (POST /api/uploads/statement):
     - Upload document to Gemini File API or use inline base64
     - Call Gemini with vision prompt requesting structured JSON array output
     - Use responseMimeType=application/json with schema defining transaction array
     - Extract merchant names from descriptions automatically
     - Auto-suggest categories based on merchant/description patterns
     - Return preview with all extracted transactions
  
  2. **Review & Edit** (Frontend):
     - Display transactions in editable table
     - User can edit amounts, dates, descriptions, categories
     - User can select/deselect transactions to import
     - Bulk category assignment for selected rows
     - Warning for transactions missing categories
     - Summary shows total income, expenses, net
  
  3. **Commit** (POST /api/uploads/statement/commit):
     - Import selected transactions to database
     - Skip duplicates (optional, default: true)
     - Create missing categories automatically (optional)
     - Return created/skipped counts

- Unified Workflow:
  - Single flow for all document types (no "receipt vs statement" confusion)
  - AI automatically detects 1 or 100+ transactions
  - Same preview/edit/commit pattern for consistency
  - Preview expires in 15 minutes (TTL)

- Acceptance Criteria:
  - ✅ Extracts merchant, date, amount, description from any document type
  - ✅ Handles images (JPEG, PNG, WebP) and PDFs seamlessly
  - ✅ Works for 1 transaction (receipt) or 100+ (statement)
  - ✅ Auto-suggests categories based on merchant patterns
  - ✅ Handles poor image quality, rotated images, various formats
  - ✅ Duplicate detection prevents re-importing same transactions
  - ✅ Bulk editing and category assignment in preview
  - ✅ Clear error messages for extraction failures

- Errors:
  - 400 invalid file type or size; 422 if unreadable; 500 Gemini API failure.

- Privacy:
  - UI displays consent notice before sending to Gemini
  - Documents processed by Gemini but not stored permanently
  - Only transaction data persisted after user confirmation

- Legacy Endpoints:
  - POST /uploads/receipt still exists for backward compatibility (images only)
  - Recommended: Use /uploads/statement for all document types

F8. [DEPRECATED] - Merged into F7 (Unified Transaction Document Import)

F9. Pagination Support Across Lists (Bonus)
- Description: All list endpoints support page and pageSize; respond with total count.

F10. AI Financial Assistant (Conversational Agent) 🆕
- Description: An intelligent conversational AI agent powered by Google Gemini that can answer financial queries, analyze spending patterns, and provide insights using natural language. The agent has access to all stats and transaction APIs via function calling.

- Capabilities:
  - Natural Language Understanding: Understands queries like "What's my total spending this month?" or "Show me my top 3 expense categories"
  - Function Calling: Agent can call 5 backend functions to fetch real-time financial data
  - Smart Date Handling: Interprets relative dates ("last 30 days", "this month", "last quarter") accurately
  - Conversation Context: Maintains conversation history for follow-up questions
  - Multi-Turn Interactions: Can ask clarifying questions or provide additional context

- Available Functions:
  1. **calculateDateRange(daysAgo)**: Calculates exact date ranges for queries like "last X days"
     - Input: Number of days (e.g., 30)
     - Output: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
  
  2. **getSummary(startDate, endDate)**: Gets income and expense totals for a period
     - Input: Date range (optional)
     - Output: { totalIncome, totalExpense, balance, transactionCount }
  
  3. **getExpensesByCategory(startDate, endDate)**: Breakdown of expenses by category
     - Input: Date range (optional)
     - Output: Array of { category, amount, percentage }
  
  4. **getExpensesOverTime(interval, startDate, endDate)**: Spending trends over time
     - Input: interval ('daily' | 'weekly' | 'monthly'), date range (optional)
     - Output: Array of { date, totalIncome, totalExpense }
  
  5. **getTransactions(filters, pagination)**: Detailed transaction records with filters
     - Input: type, categoryId, startDate, endDate, minAmount, maxAmount, page, pageSize
     - Output: { transactions[], total, page, pageSize, totalPages }

- User Interactions:
  - Chat Interface: Clean, centered layout (max-width 768px) with auto-expanding textarea
  - Message History: Shows conversation between user and AI with role labels
  - Example Queries: Welcome screen displays 4 example queries to guide users
  - Loading States: Animated loading indicator during AI processing
  - Error Handling: Graceful error messages if API calls fail

- System Behavior:
  - Authentication Required: Agent only accesses authenticated user's data
  - Function Call Limit: Maximum 5 function calls per query to prevent infinite loops
  - Response Time: Typically 2-8 seconds depending on query complexity
  - Data Privacy: All queries and responses are scoped to the authenticated user
  - Conversation Persistence: History maintained during session (not persisted to DB)

- Technical Implementation:
  - Model: Google Gemini 1.5 Flash (fast, cost-effective, excellent for function calling)
  - System Instructions: Detailed rules for date handling, function usage, and response formatting
  - Function Execution: Iterative loop that handles multi-turn function calling
  - Type Safety: Uses JSON schemas for function parameters
  - Error Recovery: Handles Prisma errors, invalid dates, and API failures gracefully

- Example Queries (Supported):
  - "What's my total spending this month?"
  - "Show me my top 3 expense categories"
  - "How much did I spend on food last week?"
  - "Compare my income vs expenses for last 30 days"
  - "What were my largest expenses in September?"
  - "How is my spending trending over time?"
  - "Show me all transactions over $100"
  - "What was my balance last quarter?"

- System Instructions (Key Rules):
  - Always call calculateDateRange() FIRST for relative date queries
  - Call each function ONLY ONCE per query
  - Immediately provide response after receiving function results
  - Do NOT repeat function calls unnecessarily
  - Use exact dates returned by calculateDateRange
  - Provide clear, concise responses with numbers formatted with currency
  - If data is insufficient, suggest what the user can try

- Acceptance Criteria:
  - ✅ Agent responds to financial queries with accurate data
  - ✅ Date calculations are exact ("last 30 days" = exactly 30 days)
  - ✅ Only authenticated user's data is accessed
  - ✅ Function calls limited to 5 per query (prevents infinite loops)
  - ✅ Conversation history maintained for follow-up questions
  - ✅ UI is clean, professional, and easy to use
  - ✅ Loading states indicate AI is processing
  - ✅ Error messages are user-friendly
  - ✅ Response time under 10 seconds for complex queries

- API Endpoint:
  - POST /api/agent/chat
    - Headers: Authorization: Bearer {jwt}
    - Body: { message: string, history?: ChatMessage[] }
    - Response: { response: string, history: ChatMessage[], functionCalls: number }

- UI Routes:
  - /agent - Main chat interface
  - Navigation: "AI Agent" in sidebar with SparklesIcon

- Performance Metrics:
  - Simple queries (1 function): ~2-3 seconds
  - Date + summary queries: ~4-5 seconds
  - Complex analysis (3 functions): ~6-8 seconds

- Known Limitations:
  - Conversation history not persisted (clears on page refresh)
  - No streaming responses (full response returned at once)
  - English language only
  - No markdown formatting in responses
  - Cannot modify data (read-only access)

- Future Enhancements:
  - Streaming responses for better UX
  - Conversation persistence in database
  - Markdown rendering (bold, lists, tables)
  - Voice input support
  - Multi-language support
  - Budget recommendations based on patterns
  - Anomaly detection ("You spent 3x more than usual")

5) Data Model
Core Entities (Relational DB; example types given with Prisma-like notation)
- User
  - id: string (PK, cuid)
  - email: string (unique, not null)
  - passwordHash: string (not null)
  - createdAt: timestamp (default now)

- Category
  - id: string (PK, cuid)
  - userId: string (FK → User.id; nullable if supporting global defaults; otherwise required)
  - name: string (not null)
  - type: enum EXPENSE | INCOME (not null)
  - createdAt: timestamp
  - Unique: (userId, name)

- Transaction
  - id: string (PK, cuid)
  - userId: string (FK → User.id, not null)
  - type: enum INCOME | EXPENSE (not null)
  - amount: numeric(12,2) (not null, > 0)
  - currency: string (default 'INR')
  - occurredAt: timestamp (UTC, not null)
  - description: text (nullable)
  - merchant: text (nullable)
  - categoryId: string (FK → Category.id, nullable)
  - source: enum MANUAL | RECEIPT | PDF_IMPORT (default MANUAL)
  - receiptUrl: text (nullable)
  - createdAt: timestamp (default now)
  - updatedAt: timestamp (auto)

- ImportPreview (ephemeral; in-memory or cache like Redis)
  - previewId: string
  - userId: string
  - expiresAt: timestamp
  - items: array of preview rows (see AI normalization)
  - summary: JSON with counts and currency

Indexes
- User: email unique
- Category: unique (userId, name)
- Transaction: composite index (userId, occurredAt), (userId, categoryId), optionally (userId, amount, occurredAt)

Data Integrity Rules
- amount > 0.00
- category.type must match transaction.type when assigned
- occurredAt is a valid date; by default, reject dates far in the future unless explicitly allowed
- Only owners can read/modify their records (userId scoping)

Example Prisma Schema (informative)
- The previous provided Prisma schema with enums TransactionType, CategoryType, TransactionSource is valid and can be used as-is.

6) API Specification
6.1 Common
- Base URL: / (backend service root)
- Auth: Bearer JWT in Authorization header for protected endpoints.
- Content types:
  - application/json for standard endpoints
  - multipart/form-data for uploads
- Error response format:
  { "error": "StringCode", "message"?: "human message", "details"?: any, "traceId"?: "uuid" }

Common Status Codes
- 200 OK, 201 Created, 204 No Content
- 400 Bad Request, 401 Unauthorized, 404 Not Found, 409 Conflict
- 415 Unsupported Media Type, 422 Unprocessable Entity
- 500 Internal Server Error, 502 Bad Gateway, 504 Gateway Timeout

6.2 Auth
- POST /auth/register
  - Body: { email: string, password: string }
  - 200: { token: string }
  - 409: { error: "Conflict", message: "Email exists" }

- POST /auth/login
  - Body: { email: string, password: string }
  - 200: { token: string }
  - 401: { error: "Unauthorized" }

6.3 Categories (auth required)
- GET /categories
  - 200: [{ id, name, type }]

- POST /categories
  - Body: { name: string, type: "INCOME"|"EXPENSE" }
  - 201: { id, name, type }
  - 409 if name exists for user

- PUT /categories/:id
  - Body: { name?: string, type?: "INCOME"|"EXPENSE" }
  - 200: updated entity
  - 404 if not found

- DELETE /categories/:id
  - 204 No Content (optional 409 if in use, depending on policy)

6.4 Transactions (auth required)
- POST /transactions
  - Body: { type, amount, currency?, occurredAt, description?, merchant?, categoryId?, source?, receiptUrl? }
  - 201: created transaction

- GET /transactions
  - Query: startDate?, endDate?, type?, categoryId?, page?, pageSize?, sort? (=occurredAt:desc)
  - 200: { items: [transaction+category], total, page, pageSize }

- GET /transactions/:id
  - 200: transaction
  - 404 if not found

- PUT /transactions/:id
  - Body: editable fields
  - 200: updated transaction

- DELETE /transactions/:id
  - 204 on success

6.5 Stats (auth required)
- GET /stats/summary
  - Query: startDate?, endDate?
  - 200: { income: number, expenses: number, net: number }

- GET /stats/expenses-by-category
  - Query: startDate?, endDate?
  - 200: [{ categoryId, name, amount }]

- GET /stats/expenses-over-time
  - Query: startDate?, endDate?, interval=daily|weekly|monthly (default daily)
  - 200: [{ dateKey: "YYYY-MM-DD"|"YYYY-WW"|"YYYY-MM", income, expenses, net }]

6.6 Uploads: Receipts (auth required) - Gemini Vision
- POST /uploads/receipt
  - multipart/form-data: file (image/jpeg|image/png|application/pdf), max 10 MB
  - query: model=flash|flash-exp (optional, default: gemini-2.0-flash-exp)
  - Behavior:
    - Upload image to Gemini File API or use inline base64 (if < 4MB).
    - Call Gemini Vision with prompt: "Extract transaction details from this receipt. Return JSON with: merchant, date (YYYY-MM-DD), amount (number), currency, description, and confidence (0-1) for each field."
    - Use responseMimeType=application/json with schema.
    - Validate and normalize extracted fields.
  - 200: { 
      candidate: { 
        type: "EXPENSE", 
        amount: number, 
        currency: string, 
        occurredAt: ISO date string, 
        merchant: string, 
        description: string,
        source: "RECEIPT" 
      },
      confidence?: { merchant: 0.95, amount: 0.98, date: 0.92 },
      rawText?: string (optional, for debugging)
    }
  - 415 (unsupported type), 422 (unreadable/extraction failed), 500 (Gemini error), 502 (Gemini timeout)

6.7 AI Statement Import (Gemini) (auth required)
- POST /imports/ai/from-pdf
  - multipart/form-data: file=application/pdf; query: model=flash|pro (optional)
  - Behavior:
    - Upload PDF to Gemini file API.
    - Call Gemini with responseMimeType=application/json and responseSchema enforcing AI Table Schema v1.
    - Validate JSON (Ajv), normalize rows (see Section 7), cache preview, return previewId.
  - 200: {
      previewId,
      summary: { total, valid, invalid, currency },
      items: [{ rowIndex, valid, warnings?: [..], errors?: [..], transaction?: {...} }],
      ai: { model, latencyMs }
    }
  - 415, 422 (schema fail), 502 (Gemini error), 504 (timeout)

- POST /imports/ai/preview
  - Body: { content: string, format: "yaml"|"json" } OR { table: object }
  - Behavior: Parse, validate against schema, normalize, cache preview.
  - 200: same structure as from-pdf
  - 400 (malformed), 422 (schema errors)

- POST /imports/ai/commit
  - Body: {
      previewId: string,
      onlyRowIndexes?: number[],
      createMissingCategories?: boolean (default true),
      dedupe?: boolean (default true),
      overrideDuplicates?: boolean (default false),
      idempotencyKey: string
    }
  - Behavior:
    - Validate previewId belongs to user and not expired.
    - Create categories if opted.
    - Insert transactions in batch.
    - Deduplicate per rules; skip or override per options.
    - Store idempotency record for 24h to prevent accidental re-import.
  - 201: {
      created: number,
      skippedDuplicates: number,
      failed: number,
      results: [{ rowIndex, status: "created"|"duplicate_skipped"|"invalid_skipped"|"failed", transactionId?, errors? }]
    }
  - 400 (missing fields), 404 (preview not found), 409 (idempotency conflict)

7) Validation and Normalization Rules
General Validation
- Email: RFC compliant; lowercased.
- Password: >= 6 chars.
- Amount: positive number, 2 decimals max, <= 9,999,999,999.99.
- Date: ISO 8601 recommended; UI may supply YYYY-MM-DD; server normalizes to UTC.
- Currency: 3–10 char code; default INR.
- Pagination: page >= 1; pageSize 1–100; default 20.

Receipt Parsing Heuristics
- Merchant: first prominent line; trim to 80 chars.
- Date: patterns YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MMM-YYYY.
- Amount: prefer line with “Total/Grand Total/Amount”; fallback to largest numeric.
- Return rawText always to help user verify.

AI Table Schema v1 (for Gemini and paste-import)
- JSON Schema (Draft-07)
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AI Transaction Table v1",
  "type": "object",
  "required": ["schemaVersion", "rows"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "ai-transaction-table@1.0" },
    "currency": { "type": "string" },
    "account": { "type": "string" },
    "statementPeriod": {
      "type": "object",
      "required": ["start", "end"],
      "properties": { "start": { "type": "string" }, "end": { "type": "string" } },
      "additionalProperties": false
    },
    "rows": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["date", "description"],
        "properties": {
          "externalId": { "type": "string" },
          "date": { "type": "string" },
          "description": { "type": "string" },
          "merchant": { "type": "string" },
          "category": { "type": "string" },
          "currency": { "type": "string" },
          "amount": { "type": "number" },
          "debit": { "type": "number" },
          "credit": { "type": "number" },
          "sign": { "type": "string", "enum": ["DEBIT","CREDIT"] },
          "type": { "type": "string", "enum": ["INCOME","EXPENSE"] },
          "notes": { "type": "string" },
          "raw": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}

Normalization (AI rows → Transactions)
- Date:
  - Accept ISO YYYY-MM-DD; also accept DD/MM/YYYY, MM/DD/YYYY, DD-MMM-YYYY if present in pasted content; normalize to UTC midnight at occurredAt (00:00:00Z).
  - Invalid → row invalid with reason.

- Currency:
  - row.currency > table.currency > "INR".

- Amount/type determination:
  1) debit > 0 and credit = 0 → type=EXPENSE, amount=debit.
  2) credit > 0 and debit = 0 → type=INCOME, amount=credit.
  3) amount present:
     - sign="DEBIT" or amount<0 → type=EXPENSE, amount=abs(amount).
     - sign="CREDIT" or amount>0 → type=INCOME, amount=abs(amount).
     - else invalid (ambiguous).
  4) Both debit and credit present (>0) → invalid.
  5) Missing all amount info → invalid.

- Description/Merchant:
  - description: required; truncate to 500 chars.
  - merchant: optional.

- Category mapping:
  - If provided, match case-insensitive by name for the user; if missing, leave null.
  - If not found and createMissingCategories=true → create with type inferred from transaction type.
  - If found but type mismatch → warning; ignore category unless user overrides.

- Deduplication (on commit):
  - Consider duplicate if same userId, abs(dateDiff) ≤ 1 day, same amount, description similarity (case-insensitive; simple contains or ratio ≥ 0.8). Default skip duplicates; override if overrideDuplicates=true.
  - If externalId present and previously imported with same account/currency/amount → skip as duplicate.

Idempotency (commit)
- Require idempotencyKey on commit; store hash of preview subset + options for 24h. Same key with different hash → 409.

8) Security Requirements
- Authentication:
  - JWT bearer tokens; secure secret; expiration 7 days.
- Passwords:
  - Hash with bcrypt (cost ≥ 10); never log or return.
- Authorization:
  - Scope all DB queries by userId to prevent IDOR.
- CORS:
  - Dev: allow localhost; Prod: restrict to frontend origin.
- Upload Safety:
  - Store temp files outside public web root; delete after processing.
  - Validate MIME type; optionally sniff magic bytes.
  - Limit file size (10 MB receipts; 20 MB statements).
- Rate Limiting (recommended):
  - e.g., 60 requests/min per IP; stricter for /uploads and /imports/ai/from-pdf.
- Gemini Privacy:
  - Keep API key server-side; do not expose to client.
  - Show consent notice before sending PDFs to Gemini.
  - Do not log PDF contents or full AI responses; store only a short hash or metadata.

9) Non-Functional Requirements
- Performance Targets
  - GET /transactions (10k user dataset): p95 < 250 ms with pagination.
  - Aggregations: p95 < 500 ms.
  - /imports/ai/from-pdf end-to-end: typical 5–30s depending on PDF size/model.

- Availability
  - Best-effort; single-instance acceptable for assignment.

- Scalability
  - Pagination mandatory; indexes on date/user/category.

- Maintainability
  - Modular services; typed models; validation at boundaries.

- Observability
  - Structured logs with requestId; error stack traces sanitized; latency metrics for AI calls.

- Accessibility
  - Forms keyboard accessible; labels on inputs; sufficient contrast.

- Internationalization
  - English-only.

10) UI/UX Requirements
Global
- Auth-protected routes redirect to /login if token missing/expired.
- Navbar: Dashboard, Transactions, Add, Upload, Logout.
- Toasts for success/error; consistent loading and empty states.

Pages
- /register
  - Fields: email, password; client-side validation; on success, auto-login to /dashboard.

- /login
  - Fields: email, password; stores token in localStorage; redirect.

- /dashboard
  - Date range filter (default current month).
  - Summary cards: Income, Expenses, Net.
  - Charts:
    - Pie: Expenses by Category.
    - Line/Bar: Expenses Over Time (daily).
  - Loading, empty, and error states.

- /transactions
  - Filters: date range, type, category.
  - Table: Date, Type, Amount, Category, Merchant, Description.
  - Pagination controls; page indicator; disabled prev/next when not applicable.
  - Row actions: Edit, Delete (with confirm).

- /add
  - Form: type, amount, currency (default INR), date, description, merchant, category.
  - Validation: show inline errors; disable submit while pending.

- /upload
  - Tabs:
    - Receipt:
      - Upload file (image/pdf), show rawText snippet and candidate fields; allow edits; Save → POST /transactions.
    - Statement (Gemini):
      - Upload PDF → calls /imports/ai/from-pdf.
      - Shows preview table with per-row status and warnings/errors.
      - Controls: filter to valid rows, exclude rows, edit fields inline (description, merchant, category, date, amount/type if provided via candidate).
      - Options: create missing categories (on), dedupe (on), override duplicates (off).
      - Commit → POST /imports/ai/commit with previewId and idempotencyKey; show results (created/skipped/failed).

Charts
- Pie chart:
  - Top N categories with “Other” grouping; legend labels include amount and percentage.
- Over time:
  - X-axis: date bucket; Y-axis: amount; tooltip shows income, expenses, net.

11) Gemini Integration (Statement Import)
- Models
  - Default: gemini-2.5-flash; accuracy mode: gemini-1.5-pro via ?model=pro.

- Structured Output
  - Use responseMimeType=application/json and responseSchema to constrain output.
  - System instruction: “You are a parser. Return only JSON matching ai-transaction-table@1.0…”
  - Short user prompt reminding of row rules and an example.

- Error Handling
  - Non-JSON response → 502 with truncated response preview.
  - Schema validation errors → 422 with Ajv error paths.
  - Upstream errors/timeouts → 502/504 with message only.

- Environment Variables
  - GEMINI_API_KEY
  - GEMINI_DEFAULT_MODEL=gemini-2.5-flash
  - AI_PREVIEW_TTL_SEC=900

- Privacy
  - Consent message on UI before sending to Gemini.
  - Delete temp PDF after request completes.

12) Deployment & Configuration
- Environment Variables
  - DATABASE_URL
  - JWT_SECRET
  - PORT=4000
  - CORS_ORIGIN=http://localhost:5173 (dev)
  - FILE_UPLOAD_DIR=./uploads (temp)
  - GEMINI_API_KEY, GEMINI_DEFAULT_MODEL, AI_PREVIEW_TTL_SEC

- Database
  - Postgres 14+; migrations provided (e.g., Prisma).

- Local Dev
  - Run Postgres via Docker Compose.
  - Start API and Web separately.

- Production (optional guidance)
  - Serve API behind HTTPS.
  - Configure CORS to exact frontend origin.
  - Use managed Postgres; use Redis for preview cache if horizontally scaling.

13) Testing Plan
- Unit Tests
  - Validation schemas (transactions, categories, AI table).
  - Receipt parsing heuristics with fixture texts.
  - AI normalization rules (debit/credit/amount/sign).

- Integration Tests
  - Auth flow; protected endpoints.
  - Transactions CRUD and scoping by userId.
  - Stats aggregations correctness.
  - Pagination correctness at boundaries.

- E2E Scenarios
  - Register → Login → Add expense → List → Charts reflect.
  - Filter by date range; pagination through pages.
  - Upload receipt (image) → candidate → save → appears in list.
  - Upload statement PDF via Gemini → preview → edit category/date → commit → appears in list; duplicates skipped.

- Negative Cases
  - Invalid email/password; startDate > endDate; amount ≤ 0; invalid file type.
  - Missing/expired JWT.
  - Gemini returns non-JSON or fails → show user-friendly error.

- Performance Spot Checks
  - 1k–10k transactions listing and stats p95 under targets.

14) Acceptance Criteria (Definition of Done)
- Core
  - Manual create income/expense works with validation.
  - List transactions with date range and filters; pagination supported.
  - Charts: expenses by category and over time.
  - Receipt extraction from image/PDF returns candidate and allows save.
  - Data persisted in DB; frontend only via APIs.

- Bonus
  - Multi-user with auth and scoping.
  - Pagination implemented in API and UI.
  - Statement import via Gemini with preview and commit; idempotency + dedupe.

- Quality
  - Clean, modular code; README with setup/run; input validation and error handling; comments for non-trivial logic; a handful of unit/integration tests.

15) Risks and Mitigations
- OCR/AI variability
  - Mitigation: Show rawText/output; allow user edits; schema validation; clear error messages; provide retry with model=pro.

- PDF diversity
  - Mitigation: Rely on Gemini structured output; keep normalization rules loose enough to accept variations; allow manual edits.

- Time constraints
  - Mitigation: Implement core features first; keep UI simple; stub non-critical niceties.

- Data duplication
  - Mitigation: Dedup heuristics; idempotency on commit.

16) Traceability Matrix
- Create income/expense → F3 → POST /transactions; UI /add
- List by time range → F4 → GET /transactions; UI /transactions
- Graphs by category/date → F6 → /stats/*; UI /dashboard
- Extract from receipt (image/pdf) → F7 → POST /uploads/receipt; UI /upload (Receipt)
- Persist data in DB → Data Model → Postgres schema
- Separate API/frontend → Architecture → REST APIs + React client
- Bonus: upload transaction history from PDF → F8 → /imports/ai/from-pdf, /imports/ai/commit; UI /upload (Statement)
- Bonus: pagination → F4 → GET /transactions?page=…; UI pagination controls
- Bonus: multi-user → F1 → /auth/*; user scoping across APIs

17) Glossary
- JWT: JSON Web Token for authentication.
- Gemini Vision: Google's multimodal AI model capable of understanding images, PDFs, and extracting structured data.
- AI Table Schema v1: JSON structure produced by Gemini for statement rows.
- Idempotency Key: Client-supplied unique token to ensure a commit operation is not executed twice.
- Structured Output: Gemini's responseMimeType=application/json feature enforcing a specific JSON schema in responses.

Appendix A: Example API Contracts
- POST /transactions
  Request:
  {
    "type": "EXPENSE",
    "amount": 1299.50,
    "currency": "INR",
    "occurredAt": "2025-10-05T00:00:00.000Z",
    "description": "Weekly groceries",
    "merchant": "Big Bazaar",
    "categoryId": "cat_abc123",
    "source": "MANUAL"
  }
  Response 201: full transaction body

- GET /transactions
  Response:
  {
    "items": [
      {
        "id": "tx_1",
        "type": "EXPENSE",
        "amount": 1299.5,
        "currency": "INR",
        "occurredAt": "2025-10-05T00:00:00.000Z",
        "description": "Weekly groceries",
        "merchant": "Big Bazaar",
        "category": {"id":"cat_abc123","name":"Groceries","type":"EXPENSE"},
        "source": "MANUAL",
        "createdAt": "2025-10-05T10:01:00.000Z",
        "updatedAt": "2025-10-05T10:01:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }

- POST /uploads/receipt
  Response:
  {
    "candidate": {
      "type": "EXPENSE",
      "amount": 742.00,
      "currency": "INR",
      "occurredAt": "2025-10-04T00:00:00.000Z",
      "merchant": "Store Name",
      "description": "Imported from receipt",
      "source": "RECEIPT"
    },
    "rawText": "STORE NAME\nDate: 04/10/2025\n...GRAND TOTAL: Rs. 742.00\n..."
  }

- POST /imports/ai/from-pdf
  Response:
  {
    "previewId": "prv_abc123",
    "summary": { "total": 25, "valid": 22, "invalid": 3, "currency": "INR" },
    "items": [
      {
        "rowIndex": 0,
        "valid": true,
        "warnings": ["Category 'Food' will be created"],
        "transaction": {
          "type": "EXPENSE",
          "amount": 459.0,
          "currency": "INR",
          "occurredAt": "2025-09-03T00:00:00.000Z",
          "description": "SWIGGY ORDER #12345 BANGALORE",
          "merchant": "Swiggy",
          "categoryName": "Food",
          "source": "PDF_IMPORT"
        }
      }
    ],
    "ai": { "model": "gemini-2.5-flash", "latencyMs": 8200 }
  }

- POST /imports/ai/commit
  Request:
  {
    "previewId": "prv_abc123",
    "createMissingCategories": true,
    "dedupe": true,
    "overrideDuplicates": false,
    "idempotencyKey": "c9d5be7e-2fd1-4b0e-9b20-7e3f55a3b5c2"
  }
  Response 201:
  {
    "created": 20,
    "skippedDuplicates": 2,
    "failed": 0,
    "results": [
      {"rowIndex":0,"status":"created","transactionId":"tx_001"},
      {"rowIndex":1,"status":"duplicate_skipped"}
    ]
  }

That’s the complete, final SRS. If you want, I can now generate a matching repo skeleton (backend routes, Prisma schema, React pages, and Gemini integration stubs) so you can start coding immediately.