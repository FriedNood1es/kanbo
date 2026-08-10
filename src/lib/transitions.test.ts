import { describe, expect, it } from "vitest";
import { decideStageChange } from "@/lib/transitions";
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
