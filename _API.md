# Personal Finance Assistant - API Documentation

**Version:** 1.0.0  
**Last Updated:** October 7, 2025  
**Test Coverage:** 187/187 tests passing ✅

---

## 🚀 Quick Start

### Base URL
```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

### Authentication
All endpoints except `/auth/register` and `/auth/login` require JWT authentication.

**Header Format:**
```http
Authorization: Bearer <jwt_token>
```

**Token Expiration:** 7 days (configurable)

### Content Types
- **Standard requests:** `application/json`
- **File uploads:** `multipart/form-data`

### Response Format
All responses follow this structure:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

### Error Format
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": [ /* Optional validation errors */ ],
  "traceId": "uuid-for-debugging"
}
```

### Rate Limiting
- **Gemini API calls:** ~50 requests/minute (shared across all users)
- **Standard endpoints:** No hard limit (consider implementing)

### File Upload Limits
- **Receipts:** 10 MB (JPEG, PNG, WebP)
- **Statements:** 20 MB (PDF only)

---

## 🏗️ Architecture Overview

### Module Structure
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    Auth     │────▶│  Categories  │────▶│Transactions │
│  (Users)    │     │   (Budget)   │     │  (Records)  │
└─────────────┘     └──────────────┘     └─────────────┘
                                                 │
                    ┌─────────────┐             │
                    │    Stats    │◀────────────┘
                    │ (Analytics) │
                    └─────────────┘
                           │
                    ┌──────────────┐
                    │   Uploads    │
                    │ (AI Extract) │
                    └──────────────┘
                           │
                    ┌──────────────┐
                    │  AI Agent 🤖 │◀────────────┐
                    │(Conversational│             │
                    │   Assistant)  │             │
                    └───────┬───────┘             │
                            └─────────────────────┘
                    (Can access Stats, Transactions, Categories)
```

### Data Flow: Upload Module (AI-Powered)
```
1. Upload File
   └─▶ POST /uploads/receipt or /uploads/statement
       └─▶ Multer validates file (type, size)
           └─▶ Gemini File API processes document
               └─▶ AI extracts structured data
                   └─▶ Preview saved (15-min TTL)
                       └─▶ Return preview to frontend

2. User Reviews/Edits Preview
   └─▶ Frontend shows extracted data
       └─▶ User can modify amounts, descriptions, categories
           └─▶ Optional: GET /uploads/previews/:id to re-fetch

3. Commit to Database
   └─▶ POST /uploads/receipt/commit or /statement/commit
       └─▶ Validate preview exists & not expired
           └─▶ Validate category ownership
               └─▶ Create transaction(s)
                   └─▶ Delete preview (cleanup)
                       └─▶ Return transaction(s)
```

### AI Features Powered by Google Gemini
- **Receipt OCR:** Extract merchant, date, amount, description from images
- **Statement Parsing:** Extract all transactions from PDF bank statements
- **Category Suggestions:** Smart matching based on merchant/description keywords
- **Confidence Scores:** AI confidence levels for data quality assessment
- **Structured Output:** JSON schema enforcement for reliable parsing

---

## 📋 Table of Contents
1. [Getting Started Guide](#getting-started-guide)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Category Endpoints](#category-endpoints)
4. [Transaction Endpoints](#transaction-endpoints)
5. [Statistics Endpoints](#statistics-endpoints)
6. [Upload Endpoints](#upload-endpoints)
7. [AI Agent Endpoints](#ai-agent-endpoints) 🆕
8. [Common Response Formats](#common-response-formats)
9. [Error Codes](#error-codes)
10. [Best Practices](#best-practices)
11. [Code Examples](#code-examples)

---

## 🎯 Getting Started Guide

### Step 1: Register a User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "clxxx...", "email": "user@example.com" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

💡 **Save the token!** You'll need it for all subsequent requests.

---

### Step 2: Create Categories
Before adding transactions, create categories to organize your finances.

```bash
# Create Income Category
curl -X POST http://localhost:3001/api/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Salary",
    "type": "INCOME"
  }'

# Create Expense Categories
curl -X POST http://localhost:3001/api/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Food",
    "type": "EXPENSE"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cat_abc123",
    "name": "Salary",
    "type": "INCOME",
    "userId": "user_xyz",
    "createdAt": "2025-10-07T10:00:00.000Z"
  }
}
```

---

### Step 3: Add Transactions (3 Methods)

#### Method A: Manual Entry
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INCOME",
    "amount": 50000,
    "description": "Monthly Salary",
    "occurredAt": "2025-10-01",
    "categoryId": "cat_salary_123"
  }'
```

#### Method B: Receipt Upload (AI-Powered)
```bash
# 1. Upload receipt image
curl -X POST http://localhost:3001/api/uploads/receipt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@receipt.jpg"

# Response includes AI-extracted data and previewId
# {
#   "previewId": "preview_xyz",
#   "extractedData": {
#     "merchant": "Starbucks",
#     "amount": 450,
#     "date": "2025-10-07"
#   }
# }

# 2. Review and commit
curl -X POST http://localhost:3001/api/uploads/receipt/commit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "previewId": "preview_xyz",
    "transaction": {
      "type": "EXPENSE",
      "amount": 450,
      "description": "Coffee at Starbucks",
      "date": "2025-10-07",
      "categoryId": "cat_food_456"
    }
  }'
```

#### Method C: Bank Statement Import (AI-Powered)
```bash
# 1. Upload bank statement PDF
curl -X POST http://localhost:3001/api/uploads/statement \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@statement.pdf"

# Response includes all extracted transactions
# {
#   "previewId": "preview_abc",
#   "extractedData": {
#     "transactions": [
#       { "date": "2025-09-05", "amount": 50000, "description": "Salary", "type": "INCOME" },
#       { "date": "2025-09-10", "amount": 2500, "description": "Amazon", "type": "EXPENSE" }
#     ],
#     "summary": { "totalIncome": 50000, "totalExpenses": 8500, "transactionCount": 25 }
#   }
# }

# 2. Review, edit, and commit
curl -X POST http://localhost:3001/api/uploads/statement/commit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "previewId": "preview_abc",
    "transactions": [
      { "type": "INCOME", "amount": 50000, "description": "Salary", "date": "2025-09-05", "categoryId": "cat_salary" },
      { "type": "EXPENSE", "amount": 2500, "description": "Amazon Purchase", "date": "2025-09-10", "categoryId": "cat_shopping" }
    ],
    "options": { "skipDuplicates": true }
  }'
```

---

### Step 4: View Analytics
```bash
# Get monthly summary
curl -X GET "http://localhost:3001/api/stats/summary?startDate=2025-10-01&endDate=2025-10-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get spending by category
curl -X GET "http://localhost:3001/api/stats/expenses-by-category?startDate=2025-10-01&endDate=2025-10-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get income/expenses over time (daily/weekly/monthly)
curl -X GET "http://localhost:3001/api/stats/expenses-over-time?interval=daily&startDate=2025-10-01&endDate=2025-10-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Typical User Journey

```
Day 1: Setup
├─ Register account
├─ Create categories (Salary, Food, Transport, Shopping, etc.)
└─ Add initial balance transactions

Day 2-30: Daily Usage
├─ Option 1: Take photo of receipt → AI extracts → Review → Commit
├─ Option 2: Manually add transactions via API/app
└─ View daily/weekly stats

Month End:
├─ Upload bank statement PDF → AI extracts all transactions
├─ Review for duplicates (auto-skip enabled)
├─ Commit verified transactions
└─ View monthly analytics and trends
```

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/auth/register` |
| **Authentication** | Not required |
| **Content-Type** | `application/json` |

#### Request Body
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `email` | string | Yes | Valid email format, unique | User's email address |
| `password` | string | Yes | Min 6 characters | User's password |

#### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxxx...",
      "email": "user@example.com",
      "createdAt": "2025-10-07T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid email format | `{ "error": "Validation Error", "details": [...] }` |
| 400 | Password too short | `{ "error": "Validation Error", "details": [...] }` |
| 409 | Email already exists | `{ "error": "Conflict", "message": "User already exists" }` |

---

### POST /auth/login
Authenticate and receive JWT token.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/auth/login` |
| **Authentication** | Not required |
| **Content-Type** | `application/json` |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxxx...",
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing credentials | `{ "error": "Validation Error", "details": [...] }` |
| 401 | Invalid credentials | `{ "error": "Unauthorized", "message": "Invalid credentials" }` |

---

## Category Endpoints

### GET /categories
Retrieve all categories for the authenticated user.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/categories` |
| **Authentication** | Required (JWT) |

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | No | - | Filter by type: `INCOME` or `EXPENSE` |

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Salary",
      "type": "INCOME",
      "userId": "clyyy...",
      "createdAt": "2025-10-07T10:00:00.000Z",
      "updatedAt": "2025-10-07T10:00:00.000Z"
    }
  ]
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### POST /categories
Create a new category.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/categories` |
| **Authentication** | Required (JWT) |
| **Content-Type** | `application/json` |

#### Request Body
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | Yes | 1-100 chars, unique per user | Category name |
| `type` | string | Yes | `INCOME` or `EXPENSE` | Category type |

#### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "name": "Groceries",
    "type": "EXPENSE",
    "userId": "clyyy...",
    "createdAt": "2025-10-07T10:00:00.000Z",
    "updatedAt": "2025-10-07T10:00:00.000Z"
  }
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid type value | `{ "error": "Validation Error", "details": [...] }` |
| 400 | Name too long | `{ "error": "Validation Error", "details": [...] }` |
| 409 | Name already exists | `{ "success": false, "error": "Category name already exists" }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### GET /categories/:id
Retrieve a specific category by ID.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/categories/:id` |
| **Authentication** | Required (JWT) |

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (CUID) | Category ID |

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "name": "Salary",
    "type": "INCOME",
    "userId": "clyyy...",
    "createdAt": "2025-10-07T10:00:00.000Z",
    "updatedAt": "2025-10-07T10:00:00.000Z"
  }
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 404 | Category not found or not owned | `{ "success": false, "error": "Category not found" }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### PUT /categories/:id
Update an existing category.

| Property | Value |
|----------|-------|
| **Endpoint** | `PUT /api/categories/:id` |
| **Authentication** | Required (JWT) |
| **Content-Type** | `application/json` |

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (CUID) | Category ID |

#### Request Body
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | No | 1-100 chars, unique per user | New category name |
| `type` | string | No | `INCOME` or `EXPENSE` | New category type |

**Note:** At least one field must be provided.

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "name": "Updated Name",
    "type": "EXPENSE",
    "userId": "clyyy...",
    "createdAt": "2025-10-07T10:00:00.000Z",
    "updatedAt": "2025-10-07T11:00:00.000Z"
  }
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | No fields provided | `{ "error": "Validation Error", "details": [...] }` |
| 404 | Category not found | `{ "success": false, "error": "Category not found" }` |
| 409 | Name already exists | `{ "success": false, "error": "Category name already exists" }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### DELETE /categories/:id
Delete a category.

| Property | Value |
|----------|-------|
| **Endpoint** | `DELETE /api/categories/:id` |
| **Authentication** | Required (JWT) |

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (CUID) | Category ID |

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 404 | Category not found | `{ "success": false, "error": "Category not found" }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

**Note:** Categories can be deleted even if they're associated with transactions. The association will be removed (set to null) due to `onDelete: SetNull` in the schema.

---

## Transaction Endpoints

### POST /transactions
Create a new transaction.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/transactions` |
| **Authentication** | Required (JWT) |
| **Content-Type** | `application/json` |

#### Request Body
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `type` | string | Yes | `INCOME` or `EXPENSE` | Transaction type |
| `amount` | number | Yes | Positive, finite number | Transaction amount |
| `currency` | string | No | 1-10 chars | Currency code (default: INR) |
| `occurredAt` | string/Date | Yes | Valid date | When transaction occurred |
| `description` | string | No | 1-500 chars | Transaction description |
| `merchant` | string | No | 1-200 chars | Merchant/payee name |
| `categoryId` | string | No | Valid CUID, must exist | Category ID |
| `receiptUrl` | string | No | Valid URL | Receipt image/PDF URL |

#### Validation Rules
- If `categoryId` is provided:
  - Category must exist and belong to the user
  - Category type must match transaction type

#### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "type": "EXPENSE",
    "amount": "100.00",
    "currency": "INR",
    "occurredAt": "2025-10-07T00:00:00.000Z",
    "description": "Grocery shopping",
    "merchant": "Walmart",
    "categoryId": "clyyy...",
    "receiptUrl": null,
    "userId": "clzzz...",
    "createdAt": "2025-10-07T10:00:00.000Z",
    "updatedAt": "2025-10-07T10:00:00.000Z",
    "category": {
      "id": "clyyy...",
      "name": "Groceries",
      "type": "EXPENSE"
    }
  }
}
```

**Note:** `amount` is returned as a string due to Prisma Decimal type.

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid type | `{ "error": "Validation Error", "details": [...] }` |
| 400 | Negative amount | `{ "error": "Validation Error", "details": [...] }` |
| 400 | Category not found | `{ "success": false, "error": "Category not found or does not belong to user" }` |
| 400 | Category type mismatch | `{ "success": false, "error": "Category type (INCOME) does not match transaction type (EXPENSE)" }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### GET /transactions
Retrieve transactions with filtering and pagination.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/transactions` |
| **Authentication** | Required (JWT) |

#### Query Parameters
| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `page` | number | No | 1 | >= 1 | Page number |
| `pageSize` | number | No | 20 | 1-100 | Items per page |
| `startDate` | string | No | - | Valid date | Filter: start date (inclusive) |
| `endDate` | string | No | - | Valid date | Filter: end date (inclusive) |
| `type` | string | No | - | `INCOME` or `EXPENSE` | Filter by type |
| `categoryId` | string | No | - | Valid CUID | Filter by category |
| `minAmount` | number | No | - | Positive number | Filter: minimum amount |
| `maxAmount` | number | No | - | Positive number | Filter: maximum amount |
| `search` | string | No | - | 1-200 chars | Search in description/merchant |

#### Validation Rules
- `startDate` must be <= `endDate`
- `minAmount` must be <= `maxAmount`

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "type": "EXPENSE",
      "amount": "100.00",
      "currency": "INR",
      "occurredAt": "2025-10-07T00:00:00.000Z",
      "description": "Grocery shopping",
      "merchant": "Walmart",
      "categoryId": "clyyy...",
      "receiptUrl": null,
      "userId": "clzzz...",
      "createdAt": "2025-10-07T10:00:00.000Z",
      "updatedAt": "2025-10-07T10:00:00.000Z",
      "category": {
        "id": "clyyy...",
        "name": "Groceries",
        "type": "EXPENSE"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

#### Sorting
Transactions are sorted by:
1. `occurredAt` descending (newest first)
2. `id` descending (tie-breaker for stable pagination)

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid date range | `{ "success": false, "error": "Start date must be before or equal to end date" }` |
| 400 | Invalid amount range | `{ "success": false, "error": "Min amount must be less than or equal to max amount" }` |
| 400 | Invalid page/pageSize | `{ "error": "Validation Error", "details": [...] }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### GET /transactions/:id
Retrieve a specific transaction by ID.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/transactions/:id` |
| **Authentication** | Required (JWT) |

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (CUID) | Transaction ID |

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "type": "EXPENSE",
    "amount": "100.00",
    "currency": "INR",
    "occurredAt": "2025-10-07T00:00:00.000Z",
    "description": "Grocery shopping",
    "merchant": "Walmart",
    "categoryId": "clyyy...",
    "receiptUrl": null,
    "userId": "clzzz...",
    "createdAt": "2025-10-07T10:00:00.000Z",
    "updatedAt": "2025-10-07T10:00:00.000Z",
    "category": {
      "id": "clyyy...",
      "name": "Groceries",
      "type": "EXPENSE"
    }
  }
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 404 | Transaction not found or not owned | `{ "success": false, "error": "Transaction not found" }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### PUT /transactions/:id
Update an existing transaction.

| Property | Value |
|----------|-------|
| **Endpoint** | `PUT /api/transactions/:id` |
| **Authentication** | Required (JWT) |
| **Content-Type** | `application/json` |

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (CUID) | Transaction ID |

#### Request Body
All fields are optional, but at least one must be provided.

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `type` | string | `INCOME` or `EXPENSE` | Transaction type |
| `amount` | number | Positive, finite | Transaction amount |
| `currency` | string | 1-10 chars | Currency code |
| `occurredAt` | string/Date | Valid date | Transaction date |
| `description` | string/null | 1-500 chars | Description (null to clear) |
| `merchant` | string/null | 1-200 chars | Merchant name (null to clear) |
| `categoryId` | string/null | Valid CUID | Category ID (null to remove) |
| `receiptUrl` | string/null | Valid URL | Receipt URL (null to clear) |

#### Validation Rules
- If `categoryId` is provided (not null):
  - Category must exist and belong to user
  - Category type must match current or updated transaction type
- If `type` is being changed and transaction has a category:
  - New type must match category type
- To remove a category, set `categoryId: null`

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "type": "EXPENSE",
    "amount": "150.00",
    "currency": "INR",
    "occurredAt": "2025-10-07T00:00:00.000Z",
    "description": "Updated description",
    "merchant": "Updated merchant",
    "categoryId": "clyyy...",
    "receiptUrl": null,
    "userId": "clzzz...",
    "createdAt": "2025-10-07T10:00:00.000Z",
    "updatedAt": "2025-10-07T11:00:00.000Z",
    "category": {
      "id": "clyyy...",
      "name": "Groceries",
      "type": "EXPENSE"
    }
  }
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Category not found | `{ "success": false, "error": "Category not found or does not belong to user" }` |
| 400 | Category type mismatch | `{ "success": false, "error": "Category type (INCOME) does not match transaction type (EXPENSE)" }` |
| 400 | Type change with incompatible category | `{ "success": false, "error": "Cannot change transaction type to INCOME because it has a EXPENSE category assigned..." }` |
| 404 | Transaction not found | `{ "success": false, "error": "Transaction not found" }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### DELETE /transactions/:id
Delete a transaction.

| Property | Value |
|----------|-------|
| **Endpoint** | `DELETE /api/transactions/:id` |
| **Authentication** | Required (JWT) |

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (CUID) | Transaction ID |

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Transaction deleted successfully"
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 404 | Transaction not found or not owned | `{ "success": false, "error": "Transaction not found" }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

## AI Agent Endpoints

### Overview
The AI Agent is a conversational assistant powered by Google Gemini that can analyze your financial data, answer questions, and provide insights using natural language. It has access to all your stats and transaction APIs through function calling.

**Base Path:** `/api/agent`

**Features:**
- 🤖 Natural language understanding
- 📊 Access to all financial APIs (stats, transactions, categories)
- 📅 Smart date range calculations ("last 30 days", "this month", etc.)
- 💬 Conversation history support
- 🔄 Multi-turn function calling (up to 5 iterations)
- 🎯 Context-aware responses

### Architecture Flow
```
User Query
    └─▶ AI Agent analyzes intent
        └─▶ Determines required functions
            ├─▶ calculateDateRange (if relative dates)
            ├─▶ getSummary (for totals)
            ├─▶ getExpensesByCategory (for breakdowns)
            ├─▶ getExpensesOverTime (for trends)
            └─▶ getTransactions (for details)
                └─▶ Synthesizes response
                    └─▶ Returns natural language answer
```

---

### POST /agent/chat
Chat with the AI financial assistant.

**Authentication:** Required  
**Rate Limit:** Subject to Gemini API limits (~50 req/min)

#### Request Body
```json
{
  "message": "What's my total spending this month?",
  "history": [
    {
      "role": "user",
      "parts": [{ "text": "Previous question" }]
    },
    {
      "role": "model",
      "parts": [{ "text": "Previous response" }]
    }
  ]
}
```

#### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ✅ | User's question or command |
| `history` | array | ❌ | Conversation history for context (Gemini format) |

#### Response
```json
{
  "success": true,
  "data": {
    "response": "Your total spending this month is ₹45,250. Your top categories are Housing (₹22,000), Food (₹12,000), and Transportation (₹8,500).",
    "history": [
      {
        "role": "user",
        "parts": [{ "text": "What's my total spending this month?" }]
      },
      {
        "role": "model",
        "parts": [{ "text": "Your total spending this month is ₹45,250..." }]
      }
    ],
    "functionCalls": 2
  }
}
```

#### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| `response` | string | AI-generated natural language response |
| `history` | array | Updated conversation history (include in next request for context) |
| `functionCalls` | number | Number of function calls made to answer the query |

#### Example Queries

**Financial Summary:**
```bash
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "message": "Show me my income vs expenses for last 30 days"
  }'
```

**Category Analysis:**
```bash
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "message": "What are my top 3 expense categories?"
  }'
```

**Time-based Analysis:**
```bash
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "message": "How much did I spend on housing last month?"
  }'
```

**Transaction Search:**
```bash
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "message": "Show me all transactions over ₹10,000 in the last 7 days"
  }'
```

**With Conversation History:**
```bash
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "message": "What about food expenses?",
    "history": [
      {
        "role": "user",
        "parts": [{ "text": "Show my spending by category" }]
      },
      {
        "role": "model",
        "parts": [{ "text": "Your spending by category..." }]
      }
    ]
  }'
```

#### Success Response Example
```json
{
  "success": true,
  "data": {
    "response": "In the last 30 days (September 8 to October 8, 2025), your total income was ₹85,000 and your total expenses were ₹45,250. This leaves you with a net balance of ₹39,750. Your largest expense category was Housing at ₹22,000 (48.6% of total expenses).",
    "history": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Show me my income vs expenses for last 30 days"
          }
        ]
      },
      {
        "role": "model",
        "parts": [
          {
            "functionCall": {
              "name": "calculateDateRange",
              "args": { "daysAgo": 30 }
            }
          }
        ]
      },
      {
        "role": "function",
        "parts": [
          {
            "functionResponse": {
              "name": "calculateDateRange",
              "response": {
                "startDate": "2025-09-08",
                "endDate": "2025-10-08"
              }
            }
          }
        ]
      },
      {
        "role": "model",
        "parts": [
          {
            "functionCall": {
              "name": "getSummary",
              "args": {
                "startDate": "2025-09-08",
                "endDate": "2025-10-08"
              }
            }
          }
        ]
      },
      {
        "role": "function",
        "parts": [
          {
            "functionResponse": {
              "name": "getSummary",
              "response": {
                "income": 85000,
                "expenses": 45250,
                "net": 39750
              }
            }
          }
        ]
      },
      {
        "role": "model",
        "parts": [
          {
            "text": "In the last 30 days... [full response]"
          }
        ]
      }
    ],
    "functionCalls": 2
  }
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing message | `{ "success": false, "error": "Validation Error", "message": "Message is required..." }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "User not authenticated" }` |
| 500 | Gemini API error | `{ "success": false, "error": "Internal Server Error", "message": "Failed to process..." }` |

#### Agent Capabilities

**Available Functions (Auto-invoked by AI):**

1. **calculateDateRange(daysAgo: number)**
   - Calculates exact date ranges for relative queries
   - Examples: "last 30 days" → Sept 8 to Oct 8

2. **getSummary(startDate?, endDate?)**
   - Returns total income, expenses, and net balance
   - Optional date filtering

3. **getExpensesByCategory(startDate?, endDate?)**
   - Breakdown of expenses by category
   - Sorted by amount (highest first)

4. **getExpensesOverTime(interval, startDate?, endDate?)**
   - Spending trends over time
   - Intervals: daily, weekly, monthly

5. **getTransactions(filters, pagination)**
   - Detailed transaction list with filters
   - Supports: type, category, date range, amount range, search

#### Best Practices

**For Accurate Responses:**
- ✅ Be specific with dates: "last 30 days" vs "this month"
- ✅ Include context: "Compare my spending last month vs this month"
- ✅ Ask one thing at a time for faster responses
- ✅ Use conversation history for follow-up questions

**Performance Tips:**
- 🚀 Simple queries (1 function call): ~2-3 seconds
- 🚀 Complex queries (multiple functions): ~5-8 seconds
- 🚀 Max 5 function calls per query (prevents infinite loops)

**Example Conversations:**

```
User: "What's my total spending this month?"
Agent: [Calls getSummary] → "Your total spending this month is ₹45,250."

User: "What about last month?"
Agent: [Calls getSummary with last month dates] → "Last month you spent ₹38,900."

User: "Which month was higher?"
Agent: [Uses conversation history] → "This month (₹45,250) was higher than last month (₹38,900) by ₹6,350."
```

#### Known Limitations
- ⚠️ Subject to Gemini API rate limits (~50 req/min shared)
- ⚠️ Max 5 function call iterations to prevent loops
- ⚠️ Requires valid Gemini API key in environment
- ⚠️ Conversation history not persisted (client-side only)

---

## Common Response Formats

### Success Response Structure
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... }  // Only for list endpoints
}
```

### Error Response Structure
```json
{
  "success": false,
  "error": "Error message"
}
```

### Validation Error Response
```json
{
  "error": "Validation Error",
  "message": "Invalid request data",
  "details": [
    {
      "field": "body.amount",
      "message": "Amount must be positive"
    }
  ]
}
```

---

## Error Codes

| Status Code | Name | Description |
|-------------|------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or business logic violation |
| 401 | Unauthorized | Missing or invalid authentication token |
| 404 | Not Found | Resource not found or not owned by user |
| 409 | Conflict | Resource already exists (duplicate email/category name) |
| 500 | Internal Server Error | Unexpected server error |

---

## Data Types

### TransactionType Enum
- `INCOME` - Money received
- `EXPENSE` - Money spent

### CategoryType Enum
- `INCOME` - Income category
- `EXPENSE` - Expense category

---

## Multi-tenancy & Security

### User Isolation
- All data is automatically scoped to the authenticated user
- Users cannot access other users' data
- Ownership is validated on all read/write operations

### JWT Token
- Expires after 7 days
- Contains: `{ userId, email }`
- Must be included in Authorization header for protected endpoints

### Password Security
- Minimum 6 characters
- Hashed with bcrypt (cost factor 10)
- Never returned in API responses

---

## Pagination

All list endpoints support pagination with the following parameters:

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `page` | number | 1 | >= 1 | Current page number (1-indexed) |
| `pageSize` | number | 20 | 1-100 | Number of items per page |

### Pagination Response
```json
{
  "pagination": {
    "total": 145,        // Total number of items
    "page": 1,           // Current page
    "pageSize": 20,      // Items per page
    "totalPages": 8      // Total number of pages
  }
}
```

---

## Examples

### Create Transaction with Category
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EXPENSE",
    "amount": 75.50,
    "currency": "INR",
    "occurredAt": "2025-10-07T10:30:00.000Z",
    "description": "Lunch at restaurant",
    "merchant": "Pizza Hut",
    "categoryId": "clxxx..."
  }'
```

### List Transactions with Filters
```bash
curl -X GET "http://localhost:3001/api/transactions?type=EXPENSE&startDate=2025-10-01&endDate=2025-10-31&page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Transaction
```bash
curl -X PUT http://localhost:3001/api/transactions/clxxx... \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 80.00,
    "description": "Updated description"
  }'
```

### Register and Login Flow
```bash
# 1. Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'

# 2. Login (or use token from registration)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'

# 3. Use the returned token in subsequent requests
```

---

## Notes

### Decimal Precision
- All monetary amounts are stored with 2 decimal precision
- Database uses `Decimal(12, 2)` type
- API returns amounts as strings to preserve precision
- Example: `"100.00"` instead of `100`

### Date Handling
- All dates are stored in UTC
- Dates can be provided in ISO 8601 format
- Example: `"2025-10-07T10:30:00.000Z"`
- Sorting uses `occurredAt` for chronological ordering

### Category-Transaction Relationship
- Transactions can exist without a category
- Deleting a category sets `categoryId` to `null` on associated transactions
- Category type must match transaction type when assigned
- Users can only assign their own categories to their transactions

---

## Stats Endpoints

### GET /stats/summary
Retrieve summary statistics (total income, expenses, and net) for the authenticated user.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/stats/summary` |
| **Authentication** | Required (JWT) |

#### Query Parameters
| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `startDate` | date | No | Valid date, YYYY-MM-DD | Start of date range (inclusive) |
| `endDate` | date | No | Valid date, YYYY-MM-DD | End of date range (inclusive, full day) |

#### Validation Rules
- If both provided: `startDate` must be ≤ `endDate`

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "income": 6000,
    "expenses": 2500,
    "net": 3500
  }
}
```

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | startDate > endDate | `{ "error": "Validation Error", "details": [...] }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### GET /stats/expenses-by-category
Retrieve expenses grouped by category, sorted by amount descending.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/stats/expenses-by-category` |
| **Authentication** | Required (JWT) |

#### Query Parameters
| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `startDate` | date | No | Valid date, YYYY-MM-DD | Start of date range (inclusive) |
| `endDate` | date | No | Valid date, YYYY-MM-DD | End of date range (inclusive, full day) |

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "categoryId": "clxxx...",
      "categoryName": "Groceries",
      "amount": "2000.00"
    },
    {
      "categoryId": null,
      "categoryName": null,
      "amount": "500.00"
    }
  ]
}
```

**Notes:**
- Only includes EXPENSE type transactions
- Uncategorized expenses have `categoryId: null` and `categoryName: null`
- Sorted by amount descending (largest first)
- Amounts returned as strings (Decimal serialization)

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid date range | `{ "error": "Validation Error", "details": [...] }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### GET /stats/expenses-over-time
Retrieve income and expenses aggregated over time with specified interval.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/stats/expenses-over-time` |
| **Authentication** | Required (JWT) |

#### Query Parameters
| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `startDate` | date | No | - | Valid date | Start of date range (inclusive) |
| `endDate` | date | No | - | Valid date | End of date range (inclusive) |
| `interval` | enum | No | `daily` | `daily`, `weekly`, `monthly` | Time bucket size |

#### Success Response (200 OK)

**Daily Interval:**
```json
{
  "success": true,
  "data": [
    {
      "dateKey": "2025-10-01",
      "income": 5000,
      "expenses": 800,
      "net": 4200
    },
    {
      "dateKey": "2025-10-02",
      "income": 0,
      "expenses": 300,
      "net": -300
    }
  ]
}
```

**Weekly Interval:**
```json
{
  "success": true,
  "data": [
    {
      "dateKey": "2025-W40",
      "income": 7000,
      "expenses": 2500,
      "net": 4500
    }
  ]
}
```

**Monthly Interval:**
```json
{
  "success": true,
  "data": [
    {
      "dateKey": "2025-10",
      "income": 6000,
      "expenses": 2500,
      "net": 3500
    }
  ]
}
```

**Date Key Formats:**
- `daily`: `YYYY-MM-DD` (e.g., "2025-10-15")
- `weekly`: `YYYY-Www` (e.g., "2025-W40", ISO week number)
- `monthly`: `YYYY-MM` (e.g., "2025-10")

**Notes:**
- Results sorted chronologically
- Both income and expenses included in each bucket
- Empty buckets are omitted (not included in response)

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid interval value | `{ "error": "Validation Error", "details": [...] }` |
| 400 | Invalid date range | `{ "error": "Validation Error", "details": [...] }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

## Upload Endpoints

**🆕 UNIFIED IMPORT:** The `/uploads/statement` endpoint now accepts both **images (JPEG, PNG, WebP)** and **PDFs**, making it a unified solution for importing transactions from any document type — whether it's a single receipt, multiple invoices, or a full bank statement. The AI automatically detects and extracts 1 to 100+ transactions.

### POST /uploads/statement (Unified Import) 🌟
Upload any transaction document (receipt image, invoice, or bank statement PDF) and extract all transactions using AI.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/uploads/statement` |
| **Authentication** | Required (JWT) |
| **Content-Type** | `multipart/form-data` |

#### What Can You Upload?
- ✅ **Single receipts** (JPEG, PNG, WebP) - 1 transaction
- ✅ **Multiple receipts** (JPEG, PNG, WebP) - 1-5 transactions
- ✅ **Invoices** (PDF or images) - 1-10 transactions
- ✅ **Bank statements** (PDF) - 10-100+ transactions
- ✅ **Credit card statements** (PDF) - 10-100+ transactions

The AI automatically handles all document types and extracts however many transactions are present!

#### Request Body (Multipart Form Data)
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `file` | File | Yes | JPEG/PNG/WebP/PDF, max 20MB | Any transaction document |

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "previewId": "660e8400-e29b-41d4-a716-446655440111",
    "type": "statement",
    "extractedData": {
      "accountInfo": {
        "accountNumber": "****1234",
        "accountHolder": "John Doe",
        "bank": "Example Bank",
        "period": {
          "startDate": "2025-09-01",
          "endDate": "2025-09-30"
        }
      },
      "transactions": [
        {
          "date": "2025-09-05",
          "description": "Salary Credit from Employer",
          "merchant": "Salary",
          "amount": 50000.00,
          "type": "INCOME",
          "balance": 55000.00
        },
        {
          "date": "2025-09-10",
          "description": "AMAZON.COM ORDER 123-4567890-1234567",
          "merchant": "Amazon",
          "amount": 2500.00,
          "type": "EXPENSE",
          "balance": 52500.00
        },
        {
          "date": "2025-09-15",
          "description": "CHECK 1234",
          "merchant": "CHECK 1234",
          "amount": 500.00,
          "type": "EXPENSE",
          "balance": 52000.00
        }
      ],
      "summary": {
        "totalIncome": 50000.00,
        "totalExpenses": 8500.00,
        "transactionCount": 25
      }
    },
    "suggestedTransactions": [
      {
        "type": "INCOME",
        "amount": 50000.00,
        "description": "Salary Credit from Employer",
        "merchant": "Salary",
        "date": "2025-09-05",
        "categoryId": "cat_salary_98765"
      },
      {
        "type": "EXPENSE",
        "amount": 2500.00,
        "description": "AMAZON.COM ORDER 123-4567890-1234567",
        "merchant": "Amazon",
        "date": "2025-09-10",
        "categoryId": "cat_shopping_54321"
      }
    ],
    "expiresAt": "2025-10-07T14:45:00.000Z",
    "createdAt": "2025-10-07T14:30:00.000Z"
  },
  "message": "Statement processed successfully. Found 25 transactions. Please review before importing."
}
```

**Notes:**
- ✅ **Works with images AND PDFs** - Unified solution for all transaction documents
- ✅ **Smart extraction** - Automatically detects 1 or 100+ transactions
- Merchant names automatically extracted from descriptions
- Categories auto-suggested for each transaction based on merchant/description
- Preview expires in 15 minutes (TTL)
- Supports deduplication on commit
- Each transaction can be individually edited before committing

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | No file uploaded | `{ "error": "Bad Request", "message": "No file uploaded" }` |
| 400 | Invalid file type | `{ "error": "Bad Request", "message": "Invalid file type. Allowed: image/jpeg, image/png, image/webp, application/pdf" }` |
| 400 | File too large | `{ "error": "Bad Request", "message": "File too large..." }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |
| 500 | AI extraction failed | `{ "error": "Internal Server Error", "message": "Failed to extract document data..." }` |

---

### POST /uploads/receipt (Legacy)
**⚠️ DEPRECATED:** Use `/uploads/statement` instead for all document types.

This endpoint is maintained for backward compatibility but only accepts images. The `/uploads/statement` endpoint accepts both images and PDFs, making it the preferred choice.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/uploads/receipt` |
| **Authentication** | Required (JWT) |
| **Status** | Deprecated (use `/uploads/statement` instead) |

---

### POST /uploads/receipt/commit
Commit a verified receipt transaction to the database.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/uploads/receipt/commit` |
| **Authentication** | Required (JWT) |
| **Content-Type** | `application/json` |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `previewId` | string (UUID) | Yes | Preview ID from upload response |
| `transaction` | object | Yes | Transaction data |
| `transaction.type` | string | Yes | `INCOME` or `EXPENSE` |
| `transaction.amount` | number | Yes | Transaction amount (positive) |
| `transaction.description` | string | Yes | Transaction description |
| `transaction.date` | string | Yes | Date in YYYY-MM-DD format |
| `transaction.categoryId` | string | Yes | Category ID (must exist) |
| `metadata` | object | No | Additional metadata (merchant, currency, etc.) |

#### Example Request
```json
{
  "previewId": "550e8400-e29b-41d4-a716-446655440000",
  "transaction": {
    "type": "EXPENSE",
    "amount": 450.00,
    "description": "Starbucks Coffee - Morning Snack",
    "date": "2025-10-07",
    "categoryId": "cat_food_12345"
  },
  "metadata": {
    "merchant": "Starbucks Coffee",
    "currency": "INR",
    "aiConfidence": 0.95
  }
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "txn_123456789",
    "type": "EXPENSE",
    "amount": "450.00",
    "description": "Starbucks Coffee - Morning Snack",
    "occurredAt": "2025-10-07T00:00:00.000Z",
    "categoryId": "cat_food_12345",
    "category": {
      "id": "cat_food_12345",
      "name": "Food",
      "type": "EXPENSE"
    },
    "userId": "user_abc123",
    "createdAt": "2025-10-07T14:35:00.000Z",
    "updatedAt": "2025-10-07T14:35:00.000Z"
  },
  "message": "Transaction created successfully"
}
```

**Notes:**
- Preview is automatically deleted after successful commit
- Preview must not be expired (15-minute TTL)
- Category must exist and belong to user

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Validation error | `{ "error": "Validation Error", "details": [...] }` |
| 400 | Invalid category ID | `{ "error": "Bad Request", "message": "Invalid category ID" }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |
| 404 | Preview not found | `{ "error": "Not Found", "message": "Preview not found or expired" }` |
| 403 | Preview belongs to other user | `{ "error": "Forbidden", "message": "Unauthorized: Preview belongs to another user" }` |
| 410 | Preview expired | `{ "error": "Gone", "message": "Preview has expired. Please re-upload the receipt." }` |

---

### POST /uploads/statement/commit
Commit verified statement transactions to the database (bulk import).

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/uploads/statement/commit` |
| **Authentication** | Required (JWT) |
| **Content-Type** | `application/json` |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `previewId` | string (UUID) | Yes | Preview ID from upload response |
| `transactions` | array | Yes | Array of transaction objects |
| `transactions[].type` | string | Yes | `INCOME` or `EXPENSE` |
| `transactions[].amount` | number | Yes | Transaction amount (positive) |
| `transactions[].description` | string | Yes | Transaction description |
| `transactions[].date` | string | Yes | Date in YYYY-MM-DD format |
| `transactions[].categoryId` | string | Yes | Category ID (must exist) |
| `transactions[].merchant` | string | No | Merchant name (optional) |
| `options` | object | No | Import options |
| `options.skipDuplicates` | boolean | No | Skip duplicate transactions (default: true) |

#### Example Request
```json
{
  "previewId": "660e8400-e29b-41d4-a716-446655440111",
  "transactions": [
    {
      "type": "INCOME",
      "amount": 50000.00,
      "description": "Salary Credit from Employer",
      "merchant": "Salary",
      "date": "2025-09-05",
      "categoryId": "cat_salary_98765"
    },
    {
      "type": "EXPENSE",
      "amount": 2500.00,
      "description": "AMAZON.COM ORDER 123-4567890-1234567",
      "merchant": "Amazon",
      "date": "2025-09-10",
      "categoryId": "cat_shopping_54321"
    },
    {
      "type": "EXPENSE",
      "amount": 500.00,
      "description": "CHECK 1234",
      "merchant": "CHECK 1234",
      "date": "2025-09-15",
      "categoryId": "cat_groceries_11111"
    }
  ],
  "options": {
    "skipDuplicates": true
  }
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "created": 23,
    "skipped": 2,
    "total": 25
  },
  "message": "Successfully imported 23 transaction(s). Skipped 2 duplicate(s)."
}
```

**Notes:**
- Preview automatically deleted after successful commit
- Deduplication checks date + amount + description (exact match)
- All categories must exist and belong to user
- Transactions validated individually before bulk create

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Validation error | `{ "error": "Validation Error", "details": [...] }` |
| 400 | Invalid category IDs | `{ "error": "Bad Request", "message": "One or more invalid category IDs" }` |
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |
| 404 | Preview not found | `{ "error": "Not Found", "message": "Preview not found or expired" }` |
| 403 | Preview belongs to other user | `{ "error": "Forbidden", "message": "Unauthorized: Preview belongs to another user" }` |
| 410 | Preview expired | `{ "error": "Gone", "message": "Preview has expired. Please re-upload the statement." }` |

---

### GET /uploads/previews
List all active previews for the authenticated user.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/uploads/previews` |
| **Authentication** | Required (JWT) |

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Filter by type: `receipt` or `statement` |
| `page` | number | No | Page number (default: 1) |
| `pageSize` | number | No | Items per page (default: 20) |

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user_abc123",
      "type": "receipt",
      "data": { /* full extracted data */ },
      "expiresAt": "2025-10-07T14:45:00.000Z",
      "createdAt": "2025-10-07T14:30:00.000Z"
    }
  ],
  "count": 1
}
```

**Notes:**
- Only returns non-expired previews
- Sorted by creation date (newest first)

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |

---

### GET /uploads/previews/:id
Retrieve a specific preview by ID.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/uploads/previews/:id` |
| **Authentication** | Required (JWT) |

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Preview ID |

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_abc123",
    "type": "receipt",
    "data": { /* full extracted data */ },
    "expiresAt": "2025-10-07T14:45:00.000Z",
    "createdAt": "2025-10-07T14:30:00.000Z"
  }
}
```

**Notes:**
- Auto-deletes if expired when accessed
- Can only access own previews

#### Error Responses
| Status | Condition | Response |
|--------|-----------|----------|
| 401 | Missing/invalid token | `{ "error": "Unauthorized", "message": "..." }` |
| 403 | Preview belongs to other user | `{ "error": "Forbidden", "message": "Unauthorized: Preview belongs to another user" }` |
| 404 | Preview not found | `{ "error": "Not Found", "message": "Preview not found or expired" }` |
| 410 | Preview expired | `{ "error": "Gone", "message": "Preview has expired" }` |

---

## 🎯 Best Practices

### Authentication & Security

#### 1. Token Storage
```javascript
// ❌ DON'T: Store token in localStorage (XSS vulnerable)
localStorage.setItem('token', token);

// ✅ DO: Store in httpOnly cookies or secure storage
// Backend sets: Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict

// For mobile apps: Use secure encrypted storage
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('@auth_token', token);
```

#### 2. Token Refresh
```javascript
// Check token expiration before requests
function isTokenExpired(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return Date.now() >= payload.exp * 1000;
}

// Refresh if needed (implement refresh token endpoint)
if (isTokenExpired(token)) {
  token = await refreshToken();
}
```

#### 3. Secure API Calls
```javascript
// Create axios instance with interceptors
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 30000, // 30s for file uploads
});

api.interceptors.request.use((config) => {
  const token = getToken(); // from secure storage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - redirect to login
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);
```

---

### File Upload Optimization

#### 1. Image Compression Before Upload
```javascript
// Compress receipt images to reduce upload time and costs
import imageCompression from 'browser-image-compression';

async function uploadReceipt(file) {
  // Compress image before upload
  const options = {
    maxSizeMB: 1, // Max 1MB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  
  const compressedFile = await imageCompression(file, options);
  
  const formData = new FormData();
  formData.append('file', compressedFile);
  
  return api.post('/uploads/receipt', formData);
}
```

#### 2. Progress Tracking
```javascript
// Show upload progress for better UX
async function uploadWithProgress(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  
  return api.post('/uploads/statement', formData, {
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted);
    },
  });
}

// Usage
await uploadWithProgress(pdfFile, (progress) => {
  console.log(`Upload progress: ${progress}%`);
  updateProgressBar(progress);
});
```

#### 3. File Validation Before Upload
```javascript
function validateReceiptFile(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }
  
  return true;
}

function validateStatementFile(file) {
  if (file.type !== 'application/pdf') {
    throw new Error('Invalid file type. Only PDF files are allowed.');
  }
  
  if (file.size > 20 * 1024 * 1024) { // 20MB
    throw new Error('File too large. Maximum size is 20MB.');
  }
  
  return true;
}
```

---

### AI Preview Management

#### 1. Handle Preview Expiration Gracefully
```javascript
async function commitReceipt(previewId, transactionData) {
  try {
    const response = await api.post('/uploads/receipt/commit', {
      previewId,
      transaction: transactionData,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 410) {
      // Preview expired - prompt user to re-upload
      alert('Preview expired. Please upload the receipt again.');
      return { expired: true };
    }
    throw error;
  }
}
```

#### 2. Cache Previews Locally
```javascript
// Cache preview data in frontend state to allow editing without re-fetching
const [previewCache, setPreviewCache] = useState({});

async function fetchPreview(previewId) {
  // Check cache first
  if (previewCache[previewId]) {
    return previewCache[previewId];
  }
  
  // Fetch from API
  const response = await api.get(`/uploads/previews/${previewId}`);
  setPreviewCache({ ...previewCache, [previewId]: response.data.data });
  
  return response.data.data;
}
```

#### 3. Cleanup After Commit
```javascript
async function commitAndCleanup(previewId, data) {
  try {
    const result = await api.post('/uploads/receipt/commit', {
      previewId,
      transaction: data,
    });
    
    // Clear local cache after successful commit
    delete previewCache[previewId];
    
    // Clear form
    resetForm();
    
    // Redirect to transactions list
    navigate('/transactions');
    
    return result;
  } catch (error) {
    console.error('Commit failed:', error);
    throw error;
  }
}
```

---

### Category Management

#### 1. Pre-populate Default Categories
```javascript
const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'INCOME' },
  { name: 'Freelance', type: 'INCOME' },
  { name: 'Food', type: 'EXPENSE' },
  { name: 'Transport', type: 'EXPENSE' },
  { name: 'Shopping', type: 'EXPENSE' },
  { name: 'Utilities', type: 'EXPENSE' },
  { name: 'Entertainment', type: 'EXPENSE' },
  { name: 'Healthcare', type: 'EXPENSE' },
];

async function setupDefaultCategories() {
  for (const category of DEFAULT_CATEGORIES) {
    try {
      await api.post('/categories', category);
    } catch (error) {
      if (error.response?.status !== 409) { // Ignore duplicates
        console.error(`Failed to create ${category.name}:`, error);
      }
    }
  }
}
```

#### 2. Category Caching
```javascript
// Cache categories to avoid repeated API calls
let categoriesCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCategories(forceRefresh = false) {
  const now = Date.now();
  
  if (!forceRefresh && categoriesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return categoriesCache;
  }
  
  const response = await api.get('/categories');
  categoriesCache = response.data.data;
  cacheTimestamp = now;
  
  return categoriesCache;
}
```

---

### Transaction Best Practices

#### 1. Batch Operations
```javascript
// When importing statement, commit in batches for better UX
async function commitStatementInBatches(previewId, transactions, batchSize = 50) {
  const batches = [];
  for (let i = 0; i < transactions.length; i += batchSize) {
    batches.push(transactions.slice(i, i + batchSize));
  }
  
  const results = [];
  for (let i = 0; i < batches.length; i++) {
    console.log(`Processing batch ${i + 1}/${batches.length}...`);
    
    const result = await api.post('/uploads/statement/commit', {
      previewId,
      transactions: batches[i],
      options: { skipDuplicates: true },
    });
    
    results.push(result.data.data);
  }
  
  return results;
}
```

#### 2. Optimistic Updates
```javascript
// Update UI immediately, rollback on failure
async function deleteTransaction(transactionId) {
  // Save current state
  const originalTransactions = [...transactions];
  
  // Optimistic update
  setTransactions(transactions.filter(t => t.id !== transactionId));
  
  try {
    await api.delete(`/transactions/${transactionId}`);
  } catch (error) {
    // Rollback on failure
    setTransactions(originalTransactions);
    alert('Failed to delete transaction');
  }
}
```

#### 3. Pagination for Large Datasets
```javascript
async function fetchTransactions(page = 1, pageSize = 50) {
  const response = await api.get('/transactions', {
    params: {
      page,
      pageSize,
      // Add sorting
      sortBy: 'occurredAt',
      sortOrder: 'desc',
    },
  });
  
  return response.data;
}
```

---

### Error Handling

#### 1. Comprehensive Error Handler
```javascript
function handleApiError(error) {
  if (!error.response) {
    // Network error
    return {
      type: 'NETWORK_ERROR',
      message: 'Unable to connect to server. Please check your internet connection.',
    };
  }
  
  const { status, data } = error.response;
  
  switch (status) {
    case 400:
      return {
        type: 'VALIDATION_ERROR',
        message: data.message || 'Invalid request data',
        details: data.details || [],
      };
    
    case 401:
      // Auto-logout
      clearToken();
      redirectToLogin();
      return {
        type: 'AUTH_ERROR',
        message: 'Session expired. Please login again.',
      };
    
    case 403:
      return {
        type: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      };
    
    case 404:
      return {
        type: 'NOT_FOUND',
        message: data.message || 'Resource not found',
      };
    
    case 409:
      return {
        type: 'CONFLICT',
        message: data.message || 'Resource already exists',
      };
    
    case 410:
      return {
        type: 'GONE',
        message: 'This resource has expired.',
      };
    
    case 500:
      return {
        type: 'SERVER_ERROR',
        message: 'Server error. Please try again later.',
        traceId: data.traceId, // For support
      };
    
    default:
      return {
        type: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      };
  }
}
```

#### 2. Retry Logic for Transient Failures
```javascript
async function apiCallWithRetry(apiCall, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      const isRetryable = error.response?.status >= 500 || !error.response;
      
      if (!isRetryable || isLastAttempt) {
        throw error;
      }
      
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// Usage
const data = await apiCallWithRetry(() => 
  api.get('/transactions')
);
```

---

## 💻 Code Examples

### React Complete Flow Example

```javascript
import React, { useState } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

function ReceiptUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState({
    type: 'EXPENSE',
    amount: 0,
    description: '',
    date: '',
    categoryId: '',
  });

  // Step 1: Upload receipt
  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/uploads/receipt', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const { previewId, extractedData, suggestedTransaction } = response.data.data;
      
      setPreview({ previewId });
      setTransaction({
        type: suggestedTransaction.type,
        amount: suggestedTransaction.amount,
        description: suggestedTransaction.description,
        date: suggestedTransaction.date,
        categoryId: suggestedTransaction.categoryId,
      });
      
      alert('Receipt processed! Please review and edit if needed.');
    } catch (error) {
      alert('Upload failed: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Commit transaction
  const handleCommit = async () => {
    if (!preview) return;
    
    setLoading(true);
    try {
      const response = await api.post('/uploads/receipt/commit', {
        previewId: preview.previewId,
        transaction,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      alert('Transaction saved successfully!');
      // Reset form
      setFile(null);
      setPreview(null);
      setTransaction({ type: 'EXPENSE', amount: 0, description: '', date: '', categoryId: '' });
    } catch (error) {
      alert('Commit failed: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Upload Receipt</h2>
      
      {!preview ? (
        // Upload phase
        <>
          <input 
            type="file" 
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button onClick={handleUpload} disabled={!file || loading}>
            {loading ? 'Processing...' : 'Upload & Extract'}
          </button>
        </>
      ) : (
        // Review & Edit phase
        <>
          <h3>Review Extracted Data</h3>
          <input 
            type="number"
            value={transaction.amount}
            onChange={(e) => setTransaction({ ...transaction, amount: parseFloat(e.target.value) })}
            placeholder="Amount"
          />
          <input 
            type="text"
            value={transaction.description}
            onChange={(e) => setTransaction({ ...transaction, description: e.target.value })}
            placeholder="Description"
          />
          <input 
            type="date"
            value={transaction.date}
            onChange={(e) => setTransaction({ ...transaction, date: e.target.value })}
          />
          <select 
            value={transaction.categoryId}
            onChange={(e) => setTransaction({ ...transaction, categoryId: e.target.value })}
          >
            {/* Load categories from API */}
            <option value="">Select Category</option>
          </select>
          
          <button onClick={handleCommit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>
          <button onClick={() => setPreview(null)}>Cancel</button>
        </>
      )}
    </div>
  );
}

export default ReceiptUpload;
```

---

### Node.js Backend Integration Example

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class FinanceAPIClient {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Authentication
  async register(email, password) {
    const response = await this.client.post('/auth/register', {
      email,
      password,
    });
    return response.data;
  }

  async login(email, password) {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });
    // Update token
    this.client.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
    return response.data;
  }

  // Categories
  async createCategory(name, type) {
    const response = await this.client.post('/categories', { name, type });
    return response.data;
  }

  async getCategories(type = null) {
    const params = type ? { type } : {};
    const response = await this.client.get('/categories', { params });
    return response.data;
  }

  // Transactions
  async createTransaction(transaction) {
    const response = await this.client.post('/transactions', transaction);
    return response.data;
  }

  async getTransactions(filters = {}) {
    const response = await this.client.get('/transactions', { params: filters });
    return response.data;
  }

  // Upload Receipt
  async uploadReceipt(filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const response = await this.client.post('/uploads/receipt', formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  async commitReceipt(previewId, transaction) {
    const response = await this.client.post('/uploads/receipt/commit', {
      previewId,
      transaction,
    });
    return response.data;
  }

  // Upload Statement
  async uploadStatement(filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const response = await this.client.post('/uploads/statement', formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return response.data;
  }

  async commitStatement(previewId, transactions, options = {}) {
    const response = await this.client.post('/uploads/statement/commit', {
      previewId,
      transactions,
      options,
    });
    return response.data;
  }

  // Statistics
  async getSummary(startDate, endDate) {
    const response = await this.client.get('/stats/summary', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  async getExpensesByCategory(startDate, endDate) {
    const response = await this.client.get('/stats/expenses-by-category', {
      params: { startDate, endDate },
    });
    return response.data;
  }
}

// Usage Example
async function main() {
  const client = new FinanceAPIClient('http://localhost:3001/api', '');

  // Register
  const registerResult = await client.register('user@example.com', 'password123');
  console.log('Registered:', registerResult.data.user.email);

  // Create categories
  const foodCategory = await client.createCategory('Food', 'EXPENSE');
  console.log('Created category:', foodCategory.data.name);

  // Upload receipt
  const receiptPreview = await client.uploadReceipt('./receipt.jpg');
  console.log('Receipt extracted:', receiptPreview.data.extractedData);

  // Commit transaction
  const transaction = await client.commitReceipt(
    receiptPreview.data.previewId,
    {
      type: 'EXPENSE',
      amount: receiptPreview.data.extractedData.amount,
      description: 'Coffee',
      date: receiptPreview.data.extractedData.date,
      categoryId: foodCategory.data.id,
    }
  );
  console.log('Transaction saved:', transaction.data.id);

  // Get summary
  const summary = await client.getSummary('2025-10-01', '2025-10-31');
  console.log('Monthly summary:', summary.data);
}

main().catch(console.error);
```

---

### Python Integration Example

```python
import requests
from typing import Optional, Dict, List

class FinanceAPIClient:
    def __init__(self, base_url: str, token: Optional[str] = None):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        if token:
            self.session.headers.update({'Authorization': f'Bearer {token}'})

    def register(self, email: str, password: str) -> Dict:
        response = self.session.post(
            f'{self.base_url}/auth/register',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()
        data = response.json()
        self.token = data['data']['token']
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        return data

    def login(self, email: str, password: str) -> Dict:
        response = self.session.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()
        data = response.json()
        self.token = data['data']['token']
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        return data

    def create_category(self, name: str, type: str) -> Dict:
        response = self.session.post(
            f'{self.base_url}/categories',
            json={'name': name, 'type': type}
        )
        response.raise_for_status()
        return response.json()

    def get_categories(self, type: Optional[str] = None) -> Dict:
        params = {'type': type} if type else {}
        response = self.session.get(
            f'{self.base_url}/categories',
            params=params
        )
        response.raise_for_status()
        return response.json()

    def upload_receipt(self, file_path: str) -> Dict:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = self.session.post(
                f'{self.base_url}/uploads/receipt',
                files=files
            )
        response.raise_for_status()
        return response.json()

    def commit_receipt(self, preview_id: str, transaction: Dict) -> Dict:
        response = self.session.post(
            f'{self.base_url}/uploads/receipt/commit',
            json={'previewId': preview_id, 'transaction': transaction}
        )
        response.raise_for_status()
        return response.json()

    def get_summary(self, start_date: str, end_date: str) -> Dict:
        response = self.session.get(
            f'{self.base_url}/stats/summary',
            params={'startDate': start_date, 'endDate': end_date}
        )
        response.raise_for_status()
        return response.json()

# Usage
if __name__ == '__main__':
    client = FinanceAPIClient('http://localhost:3001/api')
    
    # Register
    result = client.register('user@example.com', 'password123')
    print(f"Registered: {result['data']['user']['email']}")
    
    # Create category
    category = client.create_category('Food', 'EXPENSE')
    print(f"Created category: {category['data']['name']}")
    
    # Upload receipt
    preview = client.upload_receipt('./receipt.jpg')
    print(f"Receipt extracted: {preview['data']['extractedData']}")
    
    # Commit transaction
    transaction = client.commit_receipt(
        preview['data']['previewId'],
        {
            'type': 'EXPENSE',
            'amount': preview['data']['extractedData']['amount'],
            'description': 'Coffee',
            'date': preview['data']['extractedData']['date'],
            'categoryId': category['data']['id']
        }
    )
    print(f"Transaction saved: {transaction['data']['id']}")
```

---

## Future Endpoints (Not Yet Implemented)

The following endpoints are planned but not yet available:

### Upload Endpoints
- `POST /api/uploads/receipt` - Receipt OCR processing
- `POST /api/imports/ai/from-pdf` - AI statement import
- `POST /api/imports/ai/commit` - Commit imported transactions

---

**Last Updated:** October 7, 2025  
**API Version:** 1.0.0  
**Test Coverage:** 187/187 tests passing ✅  
**Modules:** Auth, Categories, Transactions, Statistics, Uploads

**AI Features:**
- Receipt OCR via Google Gemini Vision API
- Bank Statement extraction via Gemini Multimodal
- Automatic category suggestions
- Preview/verify/commit workflow

**Support:** For issues or questions, contact support@yourapp.com
