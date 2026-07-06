import type { Stage } from "@/lib/stages";

const STALE_THRESHOLD_DAYS = 14;

// Only "waiting to hear back" stages can go stale — a rejected or offered
// application doesn't need a follow-up nudge, it's already resolved.
const staleableStages = new Set<Stage>(["APPLIED", "INTERVIEWING"]);

export function daysSince(date: Date): number {
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isStale(stage: Stage, updatedAt: Date): boolean {
  return staleableStages.has(stage) && daysSince(updatedAt) >= STALE_THRESHOLD_DAYS;
}
