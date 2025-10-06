Monorepo layout (apps/api + apps/web)

Repository tree
.
├─ README.md
├─ docker-compose.yml # Postgres
├─ package.json # workspaces: ["apps/*"]
├─ .gitignore
├─ .env.example # optional root env
└─ apps
├─ api
│ ├─ package.json
│ ├─ tsconfig.json
│ ├─ .env.example
│ ├─ prisma
│ │ ├─ schema.prisma
│ │ └─ seed.ts
│ └─ src
│ ├─ server.ts
│ ├─ app.ts
│ ├─ routes
│ │ └─ index.ts
│ ├─ config
│ │ └─ index.ts
│ ├─ db
│ │ └─ prisma.ts
│ ├─ middleware
│ │ ├─ auth.ts
│ │ ├─ validate.ts
│ │ └─ error.ts
│ ├─ utils
│ │ ├─ logger.ts
│ │ ├─ pagination.ts
│ │ └─ dates.ts
│ ├─ types
│ │ └─ express.d.ts
│ ├─ modules
│ │ ├─ auth
│ │ │ ├─ auth.routes.ts
│ │ │ ├─ auth.controller.ts
│ │ │ ├─ auth.service.ts
│ │ │ └─ auth.validators.ts
│ │ ├─ categories
│ │ │ ├─ category.routes.ts
│ │ │ ├─ category.controller.ts
│ │ │ ├─ category.service.ts
│ │ │ ├─ category.repo.ts
│ │ │ └─ category.validators.ts
│ │ ├─ transactions
│ │ │ ├─ transaction.routes.ts
│ │ │ ├─ transaction.controller.ts
│ │ │ ├─ transaction.service.ts
│ │ │ ├─ transaction.repo.ts
│ │ │ └─ transaction.validators.ts
│ │ ├─ stats
│ │ │ ├─ stats.routes.ts
│ │ │ ├─ stats.controller.ts
│ │ │ └─ stats.service.ts
│ │ └─ uploads
│ │ ├─ receipt.routes.ts
│ │ ├─ receipt.controller.ts
│ │ ├─ receipt.parser.ts
│ │ ├─ ai.routes.ts
│ │ ├─ ai.controller.ts
│ │ ├─ ai.normalizer.ts
│ │ ├─ ai.schema.ts
│ │ └─ gemini.ts
│ └─ tests (optional)
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
│ ├─ api.ts
│ └─ auth.ts
├─ components
│ ├─ Layout.tsx
│ ├─ Navbar.tsx
│ ├─ ProtectedRoute.tsx
│ ├─ Pagination.tsx
│ ├─ DateRangePicker.tsx
│ └─ Charts
│ ├─ ExpensesPie.tsx
│ └─ OverTimeChart.tsx
└─ pages
├─ Login.tsx
├─ Register.tsx
├─ Dashboard.tsx
├─ Transactions.tsx
├─ AddTransaction.tsx
├─ UploadReceipt.tsx
└─ UploadStatement.tsx