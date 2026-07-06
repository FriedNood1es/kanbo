# Improvement backlog

Things raised during earlier work sessions that are still outstanding. Not urgent —
the app is deployed and working — but worth working through before calling this
fully "done" for the portfolio.

## Code quality

- **3 real ESLint errors** (`react-hooks/set-state-in-effect`), found once the
  linter was fixed to stop scanning the generated Prisma client:
  - `src/components/board/KanbanBoard.tsx` — `setApplications(initial)` inside a
    `useEffect` syncing local drag state to server-revalidated props. Has a
    cleaner fix available: React's "adjust state during render" pattern (compare
    `initial` to a `prevInitial` state value during render, no effect needed)
    instead of an effect.
  - `src/components/board/Walkthrough.tsx` — `setStepIndex(0)` reading
    `localStorage` on mount.
  - `src/components/ui/ThemeToggle.tsx` — `setTheme(...)` reading `localStorage`
    on mount.
  - The last two are legitimate uses of an effect (browser-only APIs can't be
    read during render) — just need a justified `eslint-disable` comment rather
    than a rewrite.

## Portfolio completeness

- **README.md is still unedited `create-next-app` boilerplate** — mentions the
  Geist font, which isn't even in the project anymore. Needs: what the app is,
  the actual stack, setup instructions (env vars, `prisma migrate dev`,
  `npm run dev`), and a short "why these choices" section (Auth.js v5 + database
  sessions, Prisma 7 driver adapters, `@dnd-kit/react`, fractional position
  indexing) — this is the first thing a recruiter clicking through the repo
  sees.
- **Zero tests**, despite Vitest being installed and a `test` script configured.
  The original project plan called out two concrete candidates: the fractional
  position-math helper (`computePosition` in `KanbanBoard.tsx`) and the Zod
  validation schemas (`src/lib/validation.ts`) — both are pure functions, cheap
  to test, and a legitimate "I tested this" portfolio talking point.
- **Portfolio's project card is stale.** `D:\VSCode Projects\portfolio\lib\content.ts`
  still lists the `job-tracker` entry as `status: "planned"` with placeholder
  copy, dating from before this was built. Needs updating to the real stack,
  status, summary, points, and `link.href` (the deployed URL) — same shape as
  the `bastafda` entry in that file.

## Auth

- **Facebook sign-in was scoped but not shipped** — going live for public
  sign-in requires Facebook's App Review (submission + wait, not instant), so it
  was deferred rather than blocking Google/GitHub. If/when that review clears,
  re-add the `Facebook` provider in `src/lib/auth.config.ts` (removed, not just
  commented out) and the corresponding button on the sign-in page — both are
  straightforward to restore, following the same pattern as the Google addition.

## Infra / deployment notes (not bugs, just things to know)

- Dev and production currently point at the **same Neon database** — deliberate
  simplification for a single-user personal app, not an oversight. Worth
  splitting into separate dev/prod databases if this ever needs to support
  more than one real user.
- `prisma migrate deploy` is **not wired into the Vercel build command** — any
  future schema change needs a manual `npm run db:deploy` run against the
  production database before/alongside the code deploy, or new columns/tables
  won't exist yet when the new code tries to use them.
- Leftover unused public assets (`next.svg`, `vercel.svg` in `/public`) from the
  original `create-next-app` scaffold — no longer referenced anywhere since the
  root page was rewritten. Harmless, just clutter.
