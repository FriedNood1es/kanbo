import { applicationStages } from "@/lib/validation";

export { applicationStages };
export type Stage = (typeof applicationStages)[number];

export const stageMeta: Record<Stage, { label: string; color: string }> = {
  APPLIED: { label: "Applied", color: "var(--stage-applied)" },
  INTERVIEWING: { label: "Interviewing", color: "var(--stage-interviewing)" },
  OFFER: { label: "Offer", color: "var(--stage-offer)" },
  REJECTED: { label: "Rejected", color: "var(--stage-rejected)" },
};
