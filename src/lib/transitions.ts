import type { Stage } from "@/lib/stages";

export type StageChangeDecision = { kind: "revert" } | { kind: "record" };

// A stage change that is the exact inverse of the transition that established
// the application's current stage is an undo, not a new step: dragging a card
// to Interviewing and then back to Applied because it was a mistake must erase
// the forward transition, or the funnel stats keep counting the card as having
// reached Interviewing. Anything else (a genuinely new step forward, a return
// to a stage reached differently, or a stage entered from nothing) is recorded
// as a fresh transition.
export function decideStageChange(
  lastTransition: { fromStage: Stage | null; toStage: Stage } | null,
  currentStage: Stage,
  targetStage: Stage,
): StageChangeDecision {
  if (
    lastTransition &&
    lastTransition.toStage === currentStage &&
    lastTransition.fromStage === targetStage
  ) {
    return { kind: "revert" };
  }
  return { kind: "record" };
}

// When a card most recently entered a stage — e.g. how long ago it was
// rejected. Null when it never entered that stage, in which case callers
// treat the card as not old (fail-open, never fail-hidden).
export function latestStageEntry(
  transitions: { toStage: Stage; createdAt: Date }[],
  stage: Stage,
): Date | null {
  let latest: Date | null = null;
  for (const t of transitions) {
    if (t.toStage === stage && (latest === null || t.createdAt > latest)) {
      latest = t.createdAt;
    }
  }
  return latest;
}
