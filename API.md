# Personal Finance Assistant - API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
All endpoints except `/auth/register` and `/auth/login` require JWT authentication.

**Header Format:**
```
Authorization: Bearer <jwt_token>
```

---

## 📋 Table of Contents
1. [Authentication Endpoints](#authentication-endpoints)
2. [Category Endpoints](#category-endpoints)
3. [Transaction Endpoints](#transaction-endpoints)
4. [Common Response Formats](#common-response-formats)
5. [Error Codes](#error-codes)

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

## Future Endpoints (Not Yet Implemented)

The following endpoints are planned but not yet available:

### Upload Endpoints
- `POST /api/uploads/receipt` - Receipt OCR processing
- `POST /api/imports/ai/from-pdf` - AI statement import
- `POST /api/imports/ai/commit` - Commit imported transactions

---

**Last Updated:** October 7, 2025  
**API Version:** 1.0.0  
**Test Coverage:** 140 tests passing
