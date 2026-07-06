import { describe, expect, it } from "vitest";
import { computePosition } from "@/lib/position";

describe("computePosition", () => {
  it("returns 0 for the first card in an empty column", () => {
    expect(computePosition(undefined, undefined)).toBe(0);
  });

  it("places a card before the first one (no prev)", () => {
    expect(computePosition(undefined, 5)).toBe(4);
  });

  it("places a card after the last one (no next)", () => {
    expect(computePosition(3, undefined)).toBe(4);
  });

  it("takes the midpoint between two neighbours", () => {
    expect(computePosition(2, 4)).toBe(3);
    expect(computePosition(1, 2)).toBe(1.5);
  });

  it("always lands strictly between the neighbours", () => {
    const mid = computePosition(0, 1);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it("keeps producing distinct positions when repeatedly inserting into the same gap", () => {
    // Inserting between 0 and 1, then between 0 and the result, etc. — the
    // point of fractional indexing is that this never collides or renumbers.
    const p1 = computePosition(0, 1); // 0.5
    const p2 = computePosition(0, p1); // 0.25
    const p3 = computePosition(0, p2); // 0.125
    expect(new Set([0, p1, p2, p3]).size).toBe(4);
    expect(p1).toBeGreaterThan(p2);
    expect(p2).toBeGreaterThan(p3);
    expect(p3).toBeGreaterThan(0);
  });
});
