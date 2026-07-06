import type { Stage } from "@/lib/stages";

const STALE_THRESHOLD_DAYS = 14;

// Only "waiting to hear back" stages can go stale — a rejected or offered
// application doesn't need a follow-up nudge, it's already resolved.
const staleableStages = new Set<Stage>(["APPLIED", "INTERVIEWING"]);

export function daysSince(date: Date): number {
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function formatShortDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isStale(stage: Stage, updatedAt: Date): boolean {
  return staleableStages.has(stage) && daysSince(updatedAt) >= STALE_THRESHOLD_DAYS;
}

export type AttentionBadge =
  | { kind: "overdue"; date: Date }
  | { kind: "upcoming"; date: Date }
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

  if (isStale(application.stage, application.updatedAt)) {
    return { kind: "stale", days: daysSince(application.updatedAt) };
  }

  return null;
}
