# Known deferred & deliberate decisions

The portfolio-completeness and code-quality backlog that used to live here is
done: ESLint is at zero problems, the pure-function logic (funnel, position
indexing, validation schemas) has Vitest coverage, the README is written, and
the `create-next-app` scaffold assets are removed.

What remains below is not outstanding work — it's a record of choices that were
made deliberately or deferred for an external reason, kept so the reasoning
isn't lost.

## Auth

- **Facebook sign-in was scoped but not shipped.** Going live for public sign-in
  requires Facebook's App Review (submission + wait, not instant), so it was
  deferred rather than blocking Google/GitHub. If/when that review clears, re-add
  the `Facebook` provider in `src/lib/auth.config.ts` and the corresponding
  button on the sign-in page — both follow the same pattern as the Google
  addition.

## Demo mode

- **Each "Explore a live demo" click mints a throwaway user** (email
  `demo-<random>@demo.kanbo.local`) with a seeded board and a 1-day database
  session, so recruiters can try the app without OAuth. These accumulate: no
  automatic cleanup is wired up yet. When it's worth it, add a scheduled job
  that deletes users whose email ends in `@demo.kanbo.local` and whose session
  has expired — the `onDelete: Cascade` on Application/Session takes their data
  with them. The marker lives in `src/lib/demo-user.ts`.

## Infra / deployment

- **Dev and production point at the same Neon database** — a deliberate
  simplification for a single-user personal app, not an oversight. Worth
  splitting into separate dev/prod databases if this ever needs to support more
  than one real user.
- **`prisma migrate deploy` is not wired into the Vercel build command** — any
  future schema change needs a manual `npm run db:deploy` against the production
  database before/alongside the code deploy, or new columns/tables won't exist
  yet when the new code tries to use them.
