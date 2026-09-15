import { describe, expect, it } from "vitest";
import { companyFromUrl } from "@/lib/company-from-url";

describe("companyFromUrl", () => {
  it("derives the company from direct career domains", () => {
    expect(companyFromUrl("https://careers.netflix.com/jobs/123")).toBe("Netflix");
    expect(companyFromUrl("https://jobs.spotify.com/en/engineering/456")).toBe("Spotify");
    expect(companyFromUrl("https://stripe.com/jobs")).toBe("Stripe");
  });

  it("accepts bare domains without a scheme", () => {
    expect(companyFromUrl("careers.netflix.com/jobs/123")).toBe("Netflix");
    expect(companyFromUrl("facebook.com/jobs/…")).toBe("Facebook");
  });

  it("strips multi-part public suffixes", () => {
    expect(companyFromUrl("https://careers.monzo.co.uk/jobs/1")).toBe("Monzo");
    expect(companyFromUrl("https://jobs.atlassian.com.au/2")).toBe("Atlassian");
  });

  it("reads the company slot of known ATS hosts", () => {
    expect(companyFromUrl("https://boards.greenhouse.io/acme/jobs/123")).toBe("Acme");
    expect(companyFromUrl("https://acme.lever.co/abc-123")).toBe("Acme");
    expect(companyFromUrl("https://jobs.ashbyhq.com/acme/456")).toBe("Acme");
    expect(companyFromUrl("https://apply.workable.com/acme/j/789")).toBe("Acme");
    expect(companyFromUrl("https://acme.workable.com/j/789")).toBe("Acme");
    expect(companyFromUrl("https://acme.breezy.hr/p/xyz")).toBe("Acme");
  });

  it("title-cases hyphenated slugs", () => {
    expect(companyFromUrl("https://boards.greenhouse.io/acme-corp/jobs/1")).toBe("Acme Corp");
  });

  it("returns null for aggregators that never carry the company", () => {
    expect(companyFromUrl("https://www.linkedin.com/jobs/view/123")).toBeNull();
    expect(companyFromUrl("https://indeed.com/viewjob?jk=abc")).toBeNull();
    expect(companyFromUrl("https://www.glassdoor.com/job/1")).toBeNull();
  });

  it("returns null instead of guessing the ATS brand itself", () => {
    expect(companyFromUrl("https://boards.greenhouse.io/")).toBeNull();
    expect(companyFromUrl("https://breezy.hr/")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(companyFromUrl("")).toBeNull();
    expect(companyFromUrl("   ")).toBeNull();
    expect(companyFromUrl("not a url at all !!!")).toBeNull();
    expect(companyFromUrl("localhost")).toBeNull();
  });
});
