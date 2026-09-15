// Guess a company name from a pasted job-posting URL. Best-effort and
// null-safe: aggregator links (LinkedIn, Indeed) don't carry the company in
// the URL at all, so those — and anything unparseable — return null and the
// caller leaves the form field alone.
const ATS_PATTERNS: {
  host: RegExp;
  companyFrom: "subdomain" | "path";
  pathIndex?: number;
  subdomainFallback?: boolean;
}[] = [
  // boards.greenhouse.io/<company>/jobs/<id>
  { host: /(^|\.)greenhouse\.io$/, companyFrom: "path", pathIndex: 0 },
  // <company>.lever.co/...
  { host: /(^|\.)lever\.co$/, companyFrom: "subdomain" },
  // jobs.ashbyhq.com/<company>/...
  { host: /(^|\.)ashbyhq\.com$/, companyFrom: "path", pathIndex: 0 },
  // apply.workable.com/<company>/... or <company>.workable.com/...
  { host: /(^|\.)workable\.com$/, companyFrom: "path", pathIndex: 0, subdomainFallback: true },
  // <company>.breezy.hr/...
  { host: /(^|\.)breezy\.hr$/, companyFrom: "subdomain" },
];

// Hosts where the company is never in the URL — skip straight to null.
const AGGREGATORS = [
  /(^|\.)linkedin\.com$/,
  /(^|\.)indeed\.com$/,
  /(^|\.)glassdoor\.com$/,
  /(^|\.)ziprecruiter\.com$/,
  /(^|\.)monster\.com$/,
  /(^|\.)simplyhired\.com$/,
];

// Leading labels that describe the page, not the company.
const JOB_SUBDOMAINS = new Set(["careers", "jobs", "apply", "boards", "board", "hiring", "talent"]);

// Multi-part public suffixes worth stripping before taking the registrable
// domain. Not exhaustive — just the common English-language ones; an
// unknown suffix degrades to keeping one extra label, not to failing.
const COMPOUND_SUFFIXES = new Set([
  "co.uk",
  "com.au",
  "co.nz",
  "co.jp",
  "co.in",
  "com.br",
  "com.mx",
]);

function titleCaseSlug(slug: string): string | null {
  const words = slug
    .split(/[-_]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length === 0) return null;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function registrableDomain(hostname: string): string[] {
  const parts = hostname.toLowerCase().split(".").filter(Boolean);
  if (parts.length >= 3) {
    const suffix = parts.slice(-2).join(".");
    if (COMPOUND_SUFFIXES.has(suffix)) return parts.slice(0, -2);
  }
  return parts.slice(0, -1);
}

// Company from the subdomain slot (<company>.<ats>/...). Needs at least two
// labels so a bare brand host (breezy.hr) doesn't guess the ATS brand
// itself as the company.
function subdomainCompany(hostname: string): string | null {
  const labels = registrableDomain(hostname).filter((l) => !JOB_SUBDOMAINS.has(l));
  if (labels.length < 2) return null;
  return titleCaseSlug(labels[0]);
}

export function companyFromUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Same normalization as the jobUrl schema in validation.ts: most people
  // paste (or type) a bare domain, which isn't a valid URL without a scheme.
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname || !hostname.includes(".")) return null;
  if (AGGREGATORS.some((re) => re.test(hostname))) return null;

  for (const pattern of ATS_PATTERNS) {
    if (!pattern.host.test(hostname)) continue;
    if (pattern.companyFrom === "subdomain") {
      return subdomainCompany(hostname);
    }
    // Workable serves both apply.workable.com/<company>/... and
    // <company>.workable.com/... — a real company subdomain beats the path.
    if (pattern.subdomainFallback && !JOB_SUBDOMAINS.has(hostname.split(".")[0])) {
      return subdomainCompany(hostname);
    }
    const segment = url.pathname.split("/").filter(Boolean)[pattern.pathIndex ?? 0];
    if (segment) return titleCaseSlug(segment);
    return null;
  }

  const labels = registrableDomain(hostname).filter((l) => !JOB_SUBDOMAINS.has(l));
  if (labels.length === 0) return null;
  // careers.<company>.com leaves ["careers", "<company>"] after suffix
  // stripping — the company is the last remaining label.
  return titleCaseSlug(labels[labels.length - 1]);
}
