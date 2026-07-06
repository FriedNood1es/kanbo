import type { Stage } from "@/lib/stages";

type Transition = { toStage: Stage; createdAt: Date };
type ApplicationWithTransitions = { transitions: Transition[] };

export type FunnelStats = {
  total: number;
  stageCounts: Record<Stage, number>;
  reachedInterviewing: number;
  reachedOffer: number;
  interviewRate: number | null;
  offerRate: number | null;
  avgDaysToInterview: number | null;
  avgDaysToOffer: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Reads from actual stage-transition history (not just an application's
// current stage), so "reached Interviewing" counts an application even if
// it was later rejected — the current-stage snapshot alone can't tell that
// apart from "was rejected immediately after applying."
export function computeFunnelStats(
  applications: ApplicationWithTransitions[],
  currentStageCounts: Record<Stage, number>,
): FunnelStats {
  const total = applications.length;
  let reachedInterviewing = 0;
  let reachedOffer = 0;
  const daysToInterview: number[] = [];
  const daysToOffer: number[] = [];

  for (const app of applications) {
    const sorted = [...app.transitions].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const appliedAt = sorted.find((t) => t.toStage === "APPLIED")?.createdAt;
    const interviewingAt = sorted.find((t) => t.toStage === "INTERVIEWING")?.createdAt;
    const offerAt = sorted.find((t) => t.toStage === "OFFER")?.createdAt;

    // Funnel progress is monotonic: reaching Offer means the application
    // reached Interviewing too, even when it was dragged straight from
    // Applied to Offer and so has no INTERVIEWING transition row. Counting
    // the two independently let reachedOffer exceed reachedInterviewing,
    // which pushed the offer conversion rate past 100% (e.g. "2 of 1").
    const reachedOfferHere = offerAt !== undefined;
    const reachedInterviewingHere = interviewingAt !== undefined || reachedOfferHere;

    if (reachedInterviewingHere) {
      reachedInterviewing++;
      if (interviewingAt && appliedAt) {
        daysToInterview.push((interviewingAt.getTime() - appliedAt.getTime()) / 86_400_000);
      }
    }

    if (reachedOfferHere) {
      reachedOffer++;
      if (interviewingAt) {
        daysToOffer.push((offerAt.getTime() - interviewingAt.getTime()) / 86_400_000);
      }
    }
  }

  return {
    total,
    stageCounts: currentStageCounts,
    reachedInterviewing,
    reachedOffer,
    interviewRate: total > 0 ? reachedInterviewing / total : null,
    offerRate: reachedInterviewing > 0 ? reachedOffer / reachedInterviewing : null,
    avgDaysToInterview: average(daysToInterview),
    avgDaysToOffer: average(daysToOffer),
  };
}
