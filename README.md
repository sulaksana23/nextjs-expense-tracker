# Next.js Expense Tracker

![Expense Tracker Cover](./public/readme-cover.svg)

A modern personal finance tracker built with Next.js App Router, React 19, Prisma, and PostgreSQL. The app helps users record income and expenses, monitor balances, analyze spending patterns, and export transaction data from a clean dashboard.

## Highlights

- Secure email and password authentication with user-isolated data
- Add income and expense transactions with category and note support
- Dashboard summary for total balance, total income, and total expense
- Monthly cashflow visualization with Recharts
- Category breakdown chart for spending analysis
- Filters for date range, category, transaction type, and keyword search
- Sorting by newest, oldest, largest, and smallest transactions
- Quick analytics such as top expense this month and most expensive category
- CSV export and printable PDF export
- OCR-assisted receipt import using `tesseract.js`
- Responsive layout for desktop and mobile

## Documentation Images

### Cover

![Project Cover](./public/readme-cover.svg)

### Login Screen

![Login Screen](./public/readme-login.svg)

### Register Screen

![Register Screen](./public/readme-register.svg)

### Dashboard

![Dashboard Screen](./public/readme-dashboard.svg)

## Tech Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Prisma ORM
- PostgreSQL
- Recharts
- Tesseract.js

## Core Features

### Authentication

Users can register, sign in, and manage their own private financial records. Each account only sees its own transactions.

### Transaction Management

Users can create:

- income transactions
- expense transactions
- categorized records such as Food, Transport, Salary, Bills, and more
- optional notes for extra context

### Dashboard Analytics

The main dashboard includes:

- total balance
- total income
- total expense
- monthly overview chart
- category expense chart
- top expense this month
- most expensive category from active filters

### Filters and Sorting

Users can refine the transaction list with:

- date range filters
- category filter
- transaction type filter
- search by title, category, or note
- sorting by date or amount

### Import and Export

- Import expense details from pasted receipt text or OCR image extraction
- Export filtered transactions to CSV
- Export a printable PDF report from the browser

## Project Structure

```text
app/
  actions/              Server actions for auth and transactions
  generated/prisma/     Generated Prisma client
  globals.css           Global styles
  layout.tsx            Root layout
  page.tsx              Main page entry

components/
  auth-panel.tsx
  dashboard-client.tsx
  monthly-overview-chart.tsx
  category-breakdown-chart.tsx
  runtime-error-panel.tsx

lib/
  auth.ts               Session, password, and current-user helpers
  prisma.ts             Prisma client
  runtime-error.ts      Runtime diagnostics

prisma/
  schema.prisma         Database schema
  migrations/           Database migrations
```

## Database Model

The current schema includes:

- `User`
- `Session`
- `Transaction`

Each transaction stores:

- title
- category
- note
- amount
- type: `INCOME` or `EXPENSE`
- occurred date
- owning user

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root and set your PostgreSQL connection string.

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"
```

If you deploy to Vercel, make sure the same variable is also configured there.

### 3. Run database migrations

```bash
npx prisma migrate deploy
```

For local development, you can also use:

```bash
npx prisma migrate dev
```

### 4. Generate Prisma client

This runs automatically after install, but you can also run it manually:

```bash
npx prisma generate
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:deploy
npm run build:vercel
```

## Deployment

### Vercel

Recommended deployment flow:

1. Create a PostgreSQL database.
2. Add `DATABASE_URL` to Vercel environment variables.
3. Deploy the project.
4. Use the provided build command:

```bash
npm run build:vercel
```

This ensures Prisma migrations are applied before the production build.

## Troubleshooting

### App shows runtime database errors

Check these first:

- `DATABASE_URL` is set correctly
- the database is reachable from the deployment environment
- Prisma migrations have been applied

### Login or register fails

Make sure the database tables already exist and the app can write to the `User` and `Session` tables.

### Build works locally but not in production

Confirm:

- Prisma client has been generated
- migration state is up to date
- production environment variables match your local setup

## Notes

- This project uses the Next.js App Router and server actions
- Prisma client is generated into `app/generated/prisma`
- The UI is optimized for Indonesian Rupiah formatting
- OCR import quality depends on the screenshot clarity

## License

This project is licensed under the terms of the [LICENSE](./LICENSE) file.
