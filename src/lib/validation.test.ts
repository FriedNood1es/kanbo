import { describe, expect, it } from "vitest";
import { applicationInputSchema, moveApplicationSchema } from "@/lib/validation";

const base = { company: "Acme", role: "Engineer" };

describe("applicationInputSchema", () => {
  it("accepts a minimal application and trims company/role", () => {
    const r = applicationInputSchema.safeParse({ company: "  Acme  ", role: "  Engineer  " });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.company).toBe("Acme");
      expect(r.data.role).toBe("Engineer");
      expect(r.data.jobUrl).toBeUndefined();
      expect(r.data.notes).toBeUndefined();
      // followUpAt transforms an absent value to null (not undefined) so the
      // update action clears the column rather than leaving it untouched.
      expect(r.data.followUpAt).toBeNull();
    }
  });

  it("requires a non-empty company and role", () => {
    expect(applicationInputSchema.safeParse({ company: "", role: "Engineer" }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ company: "Acme", role: "   " }).success).toBe(false);
  });

  it("rejects company/role longer than 200 chars", () => {
    expect(
      applicationInputSchema.safeParse({ company: "a".repeat(201), role: "Engineer" }).success,
    ).toBe(false);
  });

  describe("jobUrl", () => {
    it("prefixes a bare domain with https://", () => {
      const r = applicationInputSchema.safeParse({ ...base, jobUrl: "facebook.com/jobs" });
      expect(r.success && r.data.jobUrl).toBe("https://facebook.com/jobs");
    });

    it("keeps an existing scheme", () => {
      const r = applicationInputSchema.safeParse({ ...base, jobUrl: "http://careers.x.com" });
      expect(r.success && r.data.jobUrl).toBe("http://careers.x.com");
    });

    it("treats a blank value as no URL", () => {
      const r = applicationInputSchema.safeParse({ ...base, jobUrl: "   " });
      expect(r.success && r.data.jobUrl).toBeUndefined();
    });

    it("rejects an unparseable URL", () => {
      expect(applicationInputSchema.safeParse({ ...base, jobUrl: "https://" }).success).toBe(false);
    });
  });

  describe("notes", () => {
    it("trims and keeps non-empty notes", () => {
      const r = applicationInputSchema.safeParse({ ...base, notes: "  follow up  " });
      expect(r.success && r.data.notes).toBe("follow up");
    });

    it("maps blank notes to undefined", () => {
      const r = applicationInputSchema.safeParse({ ...base, notes: "   " });
      expect(r.success && r.data.notes).toBeUndefined();
    });

    it("rejects notes longer than 4000 chars", () => {
      expect(applicationInputSchema.safeParse({ ...base, notes: "a".repeat(4001) }).success).toBe(
        false,
      );
    });
  });

  describe("followUpAt", () => {
    it("maps a blank value to null", () => {
      const r = applicationInputSchema.safeParse({ ...base, followUpAt: "" });
      expect(r.success && r.data.followUpAt).toBeNull();
    });

    it("parses a valid date string into a Date", () => {
      const r = applicationInputSchema.safeParse({ ...base, followUpAt: "2026-02-01" });
      expect(r.success && r.data.followUpAt instanceof Date).toBe(true);
    });

    it("rejects an invalid date string", () => {
      expect(
        applicationInputSchema.safeParse({ ...base, followUpAt: "not-a-date" }).success,
      ).toBe(false);
    });
  });

  it("coerces appliedAt to a Date", () => {
    const r = applicationInputSchema.safeParse({ ...base, appliedAt: "2026-01-15" });
    expect(r.success && r.data.appliedAt instanceof Date).toBe(true);
  });
});

describe("moveApplicationSchema", () => {
  it("accepts a valid move, with position optional", () => {
    expect(moveApplicationSchema.safeParse({ id: "abc", stage: "OFFER", position: 1.5 }).success).toBe(
      true,
    );
    expect(moveApplicationSchema.safeParse({ id: "abc", stage: "OFFER" }).success).toBe(true);
  });

  it("requires a non-empty id", () => {
    expect(moveApplicationSchema.safeParse({ id: "", stage: "OFFER" }).success).toBe(false);
  });

  it("rejects an unknown stage", () => {
    expect(moveApplicationSchema.safeParse({ id: "abc", stage: "PENDING" }).success).toBe(false);
  });

  it("rejects a non-numeric position", () => {
    expect(
      moveApplicationSchema.safeParse({ id: "abc", stage: "OFFER", position: "1" }).success,
    ).toBe(false);
  });
});
