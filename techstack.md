Stack overview
- Lang/runtime: TypeScript across backend and frontend; Node.js 18+.
- Monorepo: npm workspaces with apps/api and apps/web.
- Database: PostgreSQL via Prisma ORM.
- Validation: Zod on API inputs; Ajv for AI JSON schema validation.
- AI/Vision: Google Gemini (gemini-2.0-flash-exp, gemini-2.5-flash, gemini-1.5-pro) via @google/genai (v1.22.0) - unified SDK with File API for both receipt OCR and statement parsing.
Stack by folder

| Area | Folder | Tech | Why |
|---|---|---|---|
| API runtime | apps/api | Node.js 18+, TypeScript, Express | Fast to build, widely known for coding assignments |
| ORM/DB | apps/api | Prisma + PostgreSQL | Strong DX, schema as code, migrations, type-safe queries |
| Auth | apps/api | JWT (jsonwebtoken), bcryptjs | Simple, stateless multi-user support |
| Input validation | apps/api | Zod + custom validate middleware | Enforce request contracts and clean 400s |
| File upload | apps/api | Multer | Multipart handling for receipts/statements |
| AI Vision (receipts) | apps/api | @google/genai (Gemini 2.0 Flash) with File API | Extract transaction data from receipt images/PDFs with vision models; ai.files.upload() for large files |
| AI (statements) | apps/api | @google/genai + Ajv | Gemini structured output for table extraction, JSON schema enforcement, File API for PDFs |
| Config & CORS | apps/api | dotenv (optional), cors | Environment and browser access control |
| Logging | apps/api | pino (or console for brevity) | Structured logs, easy perf timing |
| Dev tools | apps/api | ts-node-dev, TypeScript | Fast dev reload + type safety |
| Testing (API) | apps/api | Jest + ts-jest, supertest | Unit + integration on endpoints/services |
| Web runtime | apps/web | React 18, Vite, TypeScript | Fast dev, minimal bundling ceremony |
| Routing | apps/web | react-router-dom v6 | Auth-protected routes, SPA nav |
| HTTP | apps/web | axios | Interceptors for JWT, error handling |
| Styling | apps/web | Tailwind CSS | Fast, consistent UI |
| Charts | apps/web | Recharts | Pie + line charts quickly |
| Forms | apps/web | react-hook-form + zod | Client-side validation mirrors API |
| Dates | apps/web | date-fns | Formatting and ranges |
| Testing (Web) | apps/web | Vitest + React Testing Library | Component and page tests |
| Infra | root | Docker Compose (Postgres), npm workspaces | Easy DB setup, shared scripts |

Layering pattern (recommended)
- Route: HTTP definitions and middleware wiring only.
- Controller: Translate HTTP to service calls; no business logic.
- Service: Business rules, validation orchestration, dedupe, category/type checks.
- Repository: Prisma queries only (CRUD + aggregates).
- Validators: Zod schemas per route.
- Middleware: auth, validate(schema), error handler.
- Utils: logger, pagination, date helpers.
- Modules: auth, categories, transactions, stats, uploads (receipt + AI).

This segregation is exactly what interviewers look for: clean, testable, and easy to reason about.

Key libraries (pin these unless you prefer alternates)
- Backend: express, @prisma/client, prisma, zod, jsonwebtoken, bcryptjs, multer, @google/genai, ajv, ajv-formats, cors, pino, ts-node-dev, typescript
- Frontend: react, react-dom, react-router-dom, axios, tailwindcss, recharts, date-fns, react-hook-form, zod, vite, vitest, @testing-library/react

Notes for the assignment rubric
- Separate API and frontend: apps/api and apps/web communicate via REST.
- Persistence: Prisma + Postgres satisfies DB requirement.
- Clean code/modularity: layered architecture + validators + middleware.
- Error handling: centralized error handler + consistent JSON error shape + Zod/Ajv errors surfaced.
- Bonus features: pagination (API + UI), multi-user (JWT), history import via PDF (Gemini), receipt extraction via Gemini Vision API.
