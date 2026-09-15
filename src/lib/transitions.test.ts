import { describe, expect, it } from "vitest";
import { decideStageChange, latestStageEntry } from "@/lib/transitions";
import type { Stage } from "@/lib/stages";

const applied = { fromStage: null, toStage: "APPLIED" } as {
  fromStage: Stage | null;
  toStage: Stage;
};

describe("decideStageChange", () => {
  it("records a forward move that isn't a revert", () => {
    expect(decideStageChange(applied, "APPLIED", "INTERVIEWING")).toEqual({
      kind: "record",
    });
  });

  it("records when there is no prior transition", () => {
    expect(decideStageChange(null, "APPLIED", "INTERVIEWING")).toEqual({
      kind: "record",
    });
  });

  it("records a return to a stage that was reached differently", () => {
    const last = { fromStage: "REJECTED", toStage: "INTERVIEWING" } as const;
    expect(decideStageChange(last, "INTERVIEWING", "APPLIED")).toEqual({
      kind: "record",
    });
  });

  it("reverts a drag back to the stage the current one came from", () => {
    const last = { fromStage: "APPLIED", toStage: "INTERVIEWING" } as const;
    expect(decideStageChange(last, "INTERVIEWING", "APPLIED")).toEqual({
      kind: "revert",
    });
  });

  it("reverts a drag straight from Applied to Offer back to Applied", () => {
    const last = { fromStage: "APPLIED", toStage: "OFFER" } as const;
    expect(decideStageChange(last, "OFFER", "APPLIED")).toEqual({
      kind: "revert",
    });
  });

  it("reverts back to a stage even after moving forward twice", () => {
    const last = { fromStage: "INTERVIEWING", toStage: "OFFER" } as const;
    expect(decideStageChange(last, "OFFER", "INTERVIEWING")).toEqual({
      kind: "revert",
    });
  });

  it("does not treat the create row as reverting to nothing", () => {
    expect(decideStageChange(applied, "APPLIED", "REJECTED")).toEqual({
      kind: "record",
    });
  });
});

describe("latestStageEntry", () => {
  const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n));

  it("returns the most recent entry into the stage", () => {
    const transitions = [
      { toStage: "APPLIED" as Stage, createdAt: day(-90) },
      { toStage: "REJECTED" as Stage, createdAt: day(-63) },
      { toStage: "INTERVIEWING" as Stage, createdAt: day(-50) },
      { toStage: "REJECTED" as Stage, createdAt: day(-10) },
    ];
    expect(latestStageEntry(transitions, "REJECTED")).toEqual(day(-10));
  });

  it("returns null when the stage was never entered", () => {
    const transitions = [{ toStage: "APPLIED" as Stage, createdAt: day(-5) }];
    expect(latestStageEntry(transitions, "REJECTED")).toBeNull();
  });

  it("returns null for an empty history", () => {
    expect(latestStageEntry([], "REJECTED")).toBeNull();
  });
});
