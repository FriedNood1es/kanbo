import { describe, expect, it } from "vitest";
import { formatGhostedMessage, formatRejectionAge, getAttentionBadge } from "@/lib/staleness";
import type { Stage } from "@/lib/stages";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

function app(overrides: Partial<{ stage: Stage; updatedAt: Date; followUpAt: Date | null }> = {}) {
  return {
    stage: "APPLIED" as Stage,
    updatedAt: daysAgo(10),
    followUpAt: null,
    ...overrides,
  };
}

describe("formatRejectionAge", () => {
  it("uses days below a month", () => {
    expect(formatRejectionAge(0)).toBe("Rejected 0d ago");
    expect(formatRejectionAge(29)).toBe("Rejected 29d ago");
  });

  it("uses whole months below a year", () => {
    expect(formatRejectionAge(30)).toBe("Rejected 1 mo ago");
    expect(formatRejectionAge(63)).toBe("Rejected 2 mo ago");
    expect(formatRejectionAge(364)).toBe("Rejected 12 mo ago");
  });

  it("uses whole years at a year and beyond", () => {
    expect(formatRejectionAge(365)).toBe("Rejected 1 yr ago");
    expect(formatRejectionAge(800)).toBe("Rejected 2 yr ago");
  });
});

describe("formatGhostedMessage", () => {
  it("nudges gently below 60 days", () => {
    expect(formatGhostedMessage(30)).toBe("No reply in 30d — send a nudge?");
    expect(formatGhostedMessage(59)).toBe("No reply in 59d — send a nudge?");
  });

  it("names it warmly at 60 days and beyond", () => {
    expect(formatGhostedMessage(60)).toBe("Ghosted 👻 — their loss. Follow up or let it go?");
    expect(formatGhostedMessage(200)).toBe("Ghosted 👻 — their loss. Follow up or let it go?");
  });
});

describe("getAttentionBadge ghosting", () => {
  it("calls 30 days of silence ghosted, not stale", () => {
    expect(getAttentionBadge(app({ updatedAt: daysAgo(29) }))).toMatchObject({ kind: "stale" });
    expect(getAttentionBadge(app({ updatedAt: daysAgo(30) }))).toMatchObject({
      kind: "ghosted",
      days: 30,
    });
  });

  it("lets an explicit follow-up override ghosting", () => {
    expect(
      getAttentionBadge(app({ updatedAt: daysAgo(90), followUpAt: daysAgo(40) })),
    ).toMatchObject({ kind: "overdue" });
    expect(
      getAttentionBadge(
        app({ updatedAt: daysAgo(90), followUpAt: new Date(Date.now() + 86_400_000) }),
      ),
    ).toMatchObject({ kind: "upcoming" });
  });

  it("never ghosts offers or rejections", () => {
    expect(getAttentionBadge(app({ stage: "OFFER", updatedAt: daysAgo(90) }))).toMatchObject({
      kind: "stale",
    });
    expect(getAttentionBadge(app({ stage: "REJECTED", updatedAt: daysAgo(90) }))).toBeNull();
  });
});
