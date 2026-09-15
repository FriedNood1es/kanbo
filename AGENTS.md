# Kanbo — agent notes

Next.js 16 (App Router, Turbopack) + React 19 + Tailwind v4 + Prisma 7 (Neon serverless Postgres) + Auth.js v5 + Zod v4 + Vitest. Single app, no monorepo. Path alias `@/*` → `src/*`.

## Commands

- `npm run dev` / `npm run build` / `npm start` — dev / prod build / serve
- `npm run lint` — ESLint (zero problems is the bar)
- `npm test` — `vitest run` (one-shot, not watch). Single file: `npx vitest run src/lib/<name>.test.ts`
- No typecheck script — use `npx tsc --noEmit`
- `npm run db:migrate` (`prisma migrate dev`) / `npm run db:deploy` (`prisma migrate deploy`) / `npm run db:studio`

## Env & database (non-obvious)

- Env lives in `.env.local` (see `.env.example`); `prisma.config.ts` loads it via `dotenv`.
- Two URLs with different roles: `DATABASE_URL` (pooled, runtime app via `PrismaNeon` in `src/lib/db.ts`) vs `DIRECT_URL` (unpooled, Prisma CLI only).
- Generated client is at `src/generated/prisma` (excluded from lint) — import `PrismaClient` from `@/generated/prisma`, not `@prisma/client`. Regenerate via `prisma generate` (also `postinstall`).
- `prisma migrate deploy` is **not** wired into the Vercel build — run `npm run db:deploy` manually against prod before/after a schema change.
- Dev and prod intentionally share one Neon DB (single-user app); split if multi-user. Demo users (`*@demo.kanbo.local`) accumulate with no cleanup job.

## Auth — call `requireUser()`, not the proxy

- Database sessions (`session.strategy: "database"`); `session.user.id` is attached explicitly in `src/lib/auth.ts`.
- `src/proxy.ts` (Next 16 name — do not rename to `middleware.ts`) is an optimistic cookie check only. The real boundary is `requireUser()` in `src/lib/dal.ts` — call it in every Server Action and data-touching Server Component. Matcher covers `/board/*`, `/stats/*` only.
- Enforce ownership with `updateMany`/`deleteMany` + `userId` in `where` (silent no-op on mismatch), never bare `update`/`delete`.

## Mutations & data conventions

- Mutations live in `src/actions/*.ts` (`"use server"`): `safeParse` input against `src/lib/validation.ts` schemas, return `{ success }` `ActionResult`, then `revalidatePath`.
- Creating an application must also insert its initial `StageTransition` row (`fromStage: null`) in the same transaction — funnel stats in `src/lib/funnel.ts` read transition history, not current stage.
- Card order is fractional `Float` positioning (`src/lib/position.ts`): move = midpoint write on the moved row only, never renumber the column.

## Tests

- Vitest covers pure functions only (`funnel`, `position`, `validation`, `transitions`). Config is Node env — DOM/component tests need `environment: "jsdom"` + `@vitejs/plugin-react` added to `vitest.config.ts` first.
