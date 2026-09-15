# Roadmap

Planned work, roughly priority-ordered. Each item names the file(s) it touches.

## Planned

- **Demo-user cleanup job.** Every "Explore a live demo" click mints a throwaway
  user that never gets deleted. Add a scheduled job that removes users whose
  email ends in `@demo.kanbo.local` and whose session has expired — the
  `onDelete: Cascade` takes their data with them (`src/lib/demo-user.ts`).
- **CSV import.** Export exists (`src/app/api/export/route.ts`, `src/lib/csv.ts`);
  import is the symmetric gap. Validate rows with the Zod schemas in
  `src/lib/validation.ts` and seed `StageTransition` rows like
  `seedDemoData` does in `src/actions/demo.ts`.
- **Follow-up reminders.** Overdue/stale badges exist (`src/lib/staleness.ts`)
  but are passive — only visible when looking at the board. Add an in-app
  reminder list or email digest surfacing cards needing attention.
- **Richer board filtering.** Search covers company/role only. Add stale/overdue
  and date-range filters next to the search field in
  `src/components/board/BoardShell.tsx`.
- **Deeper stats.** Per-stage time-in-stage and activity-over-time. The
  `StageTransition` history already holds the data; extend the math in
  `src/lib/funnel.ts` and the display in `src/components/stats/`.
- **Offer-stage details.** Salary range / decision-deadline fields on OFFER cards,
  surfaced on the stats page. Schema change — remember the manual
  `npm run db:deploy` (see below).
- **Wire `db:deploy` into the deploy flow.** Schema changes currently need a
  manual `npm run db:deploy` against prod alongside the code deploy, or new
  columns don't exist when the new code runs. A Vercel build-step or pre-deploy
  hook removes the footgun.
- **Facebook sign-in.** Scoped but not shipped — public sign-in needs Facebook's
  App Review first. When it clears, mirror the Google provider in
  `src/lib/auth.config.ts` plus its sign-in button.
- **Split dev/prod databases.** Only if this ever supports more than one real
  user; until then the shared Neon DB stays (see below).

Out of scope for this single-user portfolio app: multi-user boards,
collaboration, realtime sync.

## Decided — background, not future work

- **Dev and prod share one Neon database** — deliberate simplification for a
  single-user app, not an oversight.
- **Portfolio-completeness backlog is done** — ESLint at zero, Vitest coverage
  for the pure-function logic, README written, scaffold assets removed.
