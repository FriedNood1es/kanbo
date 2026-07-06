# Kanbo

A Kanban-style job-application tracker. Applications move across **Applied →
Interviewing → Offer → Rejected** columns by drag-and-drop, and a stats page
turns their stage history into a conversion funnel.

**Live:** [kanbo-two.vercel.app](https://kanbo-two.vercel.app)

Built as a portfolio project to exercise a modern full-stack Next.js setup:
Server Actions for mutations, Auth.js v5 with database sessions, Prisma 7 on
serverless Postgres, and an optimistic drag-and-drop board.

## Features

- **Drag-and-drop board** — move a card between stages or reorder within a
  column; updates are optimistic and persist in the background.
- **Applications** — company, role, job-posting link (bare domains are
  auto-prefixed), applied/follow-up dates, and Markdown notes.
- **Follow-up tracking** — staleness/overdue badges nudge you when a card has
  gone quiet or a follow-up date has passed.
- **Company avatars** — best-effort favicon guess from the company name, with a
  colored initial as a graceful fallback.
- **Stats** — interview/offer conversion rates and average days between stages,
  computed from real stage-transition history (not just current stage).
- **Quality-of-life** — search, CSV export, an onboarding walkthrough, keyboard
  shortcuts, and light/dark themes.

## Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Auth | Auth.js v5 (`next-auth`), GitHub + Google, database sessions |
| Data | Prisma 7 with driver adapters, Neon serverless Postgres |
| Drag & drop | `@dnd-kit/react` |
| Validation | Zod |
| Styling | Tailwind CSS v4 |
| Tests | Vitest |

## Getting started

### 1. Prerequisites

- Node.js 20+
- A Postgres database (this project uses [Neon](https://neon.tech), which gives
  you both a pooled and a direct connection string)
- GitHub and/or Google OAuth credentials

### 2. Environment

Copy the example env file and fill in the values:

```bash
cp .env.example .env.local
```

- `DATABASE_URL` — pooled connection, used by the running app.
- `DIRECT_URL` — unpooled/direct connection, used only by the Prisma CLI
  (migrate/studio).
- `AUTH_SECRET` — generate with `npx auth secret`.
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — from a GitHub OAuth App.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from a Google OAuth Client.

### 3. Database

Generate the Prisma client (also runs automatically on `npm install`) and apply
migrations:

```bash
npm install
npm run db:migrate   # prisma migrate dev
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:migrate` | `prisma migrate dev` (create/apply a migration) |
| `npm run db:deploy` | `prisma migrate deploy` (apply migrations in prod) |
| `npm run db:studio` | Prisma Studio |

## Why these choices

- **Auth.js v5 + database sessions.** Database (not JWT) sessions keep session
  state server-side and let the Prisma adapter own the user/account tables, which
  matters for linking multiple OAuth providers to one account by email.
- **Prisma 7 driver adapters.** The Neon adapter (`@prisma/adapter-neon`) talks
  to Postgres over Neon's serverless driver, which suits Vercel's serverless
  runtime better than a long-lived TCP pool. The generated client lives in
  `src/generated/prisma`.
- **Server Actions for mutations.** Create/edit/move/delete all go through
  `"use server"` actions, so the board can update optimistically on the client
  while the action persists and revalidates in the background.
- **Fractional position indexing.** Card order is stored as a `Float`; inserting
  between two cards uses the midpoint of their positions (see
  `src/lib/position.ts`), so a reorder only ever rewrites the moved card's row,
  never renumbers the column.
- **Stage-transition history.** Every stage change writes a `StageTransition`
  row, so the stats page can compute real conversion rates and time-in-stage
  rather than inferring them from an application's current stage alone.

## Tests

Pure-function logic is covered with Vitest:

```bash
npm test
```

- `src/lib/funnel.test.ts` — conversion-rate and time-in-stage math
- `src/lib/position.test.ts` — fractional position indexing
- `src/lib/validation.test.ts` — the Zod input schemas

## Deployment

Deployed on Vercel at [kanbo-two.vercel.app](https://kanbo-two.vercel.app).
Note that `prisma migrate deploy` is **not** wired into the build command — a
schema change needs a manual `npm run db:deploy` against the production database
before (or alongside) the code deploy.
