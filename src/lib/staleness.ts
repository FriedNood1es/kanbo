import type { Stage } from "@/lib/stages";

const STALE_THRESHOLD_DAYS = 14;

// Rejected cards untouched this long collapse behind a "show older" toggle
// so the column doesn't grow without bound — while staying one click away
// for review. Shared by the board page (which computes the hidden set) and
// the board (which applies it).
export const REJECTED_COLLAPSE_DAYS = 60;

// An offer left alone goes quiet just like an application waiting to hear
// back — it earns the same staleness nudge. Rejected stays out: a resolved
// application needs no follow-up.
const staleableStages = new Set<Stage>(["APPLIED", "INTERVIEWING", "OFFER"]);

export function daysSince(date: Date): number {
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function formatShortDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Silence this long on an application nobody answered means it was
// ghosted — which is its own state, not a slower kind of stale. Only stages
// still waiting on the employer qualify: an outstanding offer isn't
// ghosting, and a rejection is already terminal.
export const GHOSTED_THRESHOLD_DAYS = 30;

const ghostableStages = new Set<Stage>(["APPLIED", "INTERVIEWING"]);

export function isGhosted(stage: Stage, updatedAt: Date): boolean {
  return ghostableStages.has(stage) && daysSince(updatedAt) >= GHOSTED_THRESHOLD_DAYS;
}

// Two-tier voice: recent silence gets a gentle nudge, long silence gets
// named warmly — "their loss" energy, never blaming the job seeker for an
// employer going quiet.
export function formatGhostedMessage(daysAgo: number): string {
  if (daysAgo < 60) return `No reply in ${daysAgo}d — send a nudge?`;
  return "Ghosted 👻 — their loss. Follow up or let it go?";
}

// Relative age for the stamp on collapsed-then-expanded older rejected
// cards: "Rejected 12d ago", "Rejected 2 mo ago", "Rejected 1 yr ago".
export function formatRejectionAge(daysAgo: number): string {
  if (daysAgo < 30) return `Rejected ${daysAgo}d ago`;
  if (daysAgo < 365) return `Rejected ${Math.floor(daysAgo / 30)} mo ago`;
  return `Rejected ${Math.floor(daysAgo / 365)} yr ago`;
}

export function isStale(stage: Stage, updatedAt: Date): boolean {
  return staleableStages.has(stage) && daysSince(updatedAt) >= STALE_THRESHOLD_DAYS;
}

export type AttentionBadge =
  | { kind: "overdue"; date: Date }
  | { kind: "upcoming"; date: Date }
  | { kind: "ghosted"; days: number }
  | { kind: "stale"; days: number };

// A manually-set follow-up date is a more specific signal than generic
// staleness, so it wins whenever one is set — overdue or upcoming, either
// way there's no need to also show the generic "no update in Xd" nudge.
export function getAttentionBadge(application: {
  stage: Stage;
  updatedAt: Date;
  followUpAt: Date | null;
}): AttentionBadge | null {
  if (application.followUpAt) {
    const overdue = application.followUpAt.getTime() < Date.now();
    return { kind: overdue ? "overdue" : "upcoming", date: application.followUpAt };
  }

  // Ghosting subsumes staleness — a card silent long enough to be ghosted
  // shows only the ghost badge, never both.
  if (isGhosted(application.stage, application.updatedAt)) {
    return { kind: "ghosted", days: daysSince(application.updatedAt) };
  }

  if (isStale(application.stage, application.updatedAt)) {
    return { kind: "stale", days: daysSince(application.updatedAt) };
  }

  return null;
}
