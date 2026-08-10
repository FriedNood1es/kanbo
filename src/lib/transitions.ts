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
