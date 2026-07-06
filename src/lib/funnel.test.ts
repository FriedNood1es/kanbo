import { describe, expect, it } from "vitest";
import { computeFunnelStats } from "@/lib/funnel";
import type { Stage } from "@/lib/stages";

const D = (iso: string) => new Date(iso);

function counts(overrides: Partial<Record<Stage, number>> = {}): Record<Stage, number> {
  return { APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ...overrides };
}

function transitions(...entries: [Stage, string][]) {
  return { transitions: entries.map(([toStage, iso]) => ({ toStage, createdAt: D(iso) })) };
}

describe("computeFunnelStats", () => {
  it("returns null rates and averages for an empty board", () => {
    const stats = computeFunnelStats([], counts());
    expect(stats.total).toBe(0);
    expect(stats.interviewRate).toBeNull();
    expect(stats.offerRate).toBeNull();
    expect(stats.avgDaysToInterview).toBeNull();
    expect(stats.avgDaysToOffer).toBeNull();
  });

  it("computes interview and offer rates for a normal partial funnel", () => {
    const apps = [
      transitions(["APPLIED", "2026-01-01"], ["INTERVIEWING", "2026-01-05"], ["OFFER", "2026-01-10"]),
      transitions(["APPLIED", "2026-01-01"], ["INTERVIEWING", "2026-01-05"]),
      transitions(["APPLIED", "2026-01-01"]),
    ];

    const stats = computeFunnelStats(apps, counts({ APPLIED: 1, INTERVIEWING: 1, OFFER: 1 }));

    expect(stats.total).toBe(3);
    expect(stats.reachedInterviewing).toBe(2);
    expect(stats.reachedOffer).toBe(1);
    expect(stats.interviewRate).toBeCloseTo(2 / 3);
    expect(stats.offerRate).toBe(0.5);
  });

  it("does not let the offer rate exceed 100% when a card was dragged straight to Offer", () => {
    // A drag records a transition only for the stage dropped on, so an
    // Applied -> Offer drag has no INTERVIEWING row. Reaching Offer must still
    // count as having reached Interviewing, or reachedOffer could exceed
    // reachedInterviewing and the rate would read e.g. "2 of 1" = 200%.
    const apps = [
      transitions(["APPLIED", "2026-01-01"], ["INTERVIEWING", "2026-01-05"], ["OFFER", "2026-01-10"]),
      transitions(["APPLIED", "2026-01-02"], ["OFFER", "2026-01-06"]),
    ];

    const stats = computeFunnelStats(apps, counts({ OFFER: 2 }));

    expect(stats.reachedOffer).toBe(2);
    expect(stats.reachedInterviewing).toBe(2);
    expect(stats.offerRate).toBe(1);
  });

  it("averages days between stages, ignoring cards missing the needed timestamps", () => {
    const apps = [
      transitions(["APPLIED", "2026-01-01"], ["INTERVIEWING", "2026-01-05"], ["OFFER", "2026-01-11"]),
      transitions(["APPLIED", "2026-01-01"], ["INTERVIEWING", "2026-01-07"]),
      // dragged straight to Offer: contributes to reachedOffer but has no
      // interviewing timestamp, so it can't contribute to either day average.
      transitions(["APPLIED", "2026-01-01"], ["OFFER", "2026-01-09"]),
    ];

    const stats = computeFunnelStats(apps, counts({ INTERVIEWING: 1, OFFER: 2 }));

    // days to interview: (4 + 6) / 2 = 5
    expect(stats.avgDaysToInterview).toBeCloseTo(5);
    // days to offer: only the first card qualifies -> 11 - 5 = 6
    expect(stats.avgDaysToOffer).toBeCloseTo(6);
  });
});
