"use client";

import { useState } from "react";
import { avatarColor, avatarInitial } from "@/lib/avatar";

// Best-effort guess, not a lookup — works well for well-known single-word
// company names, occasionally wrong for others. That's fine: a wrong-domain
// favicon request 404s (verified against Google's endpoint directly) and
// falls back to the initial-letter chip below, so a bad guess never shows a
// broken image or someone else's logo with confidence.
function guessDomain(company: string): string | null {
  const slug = company.toLowerCase().replace(/[^a-z0-9]/g, "");
  return slug ? `${slug}.com` : null;
}

export default function CompanyAvatar({ company }: { company: string }) {
  const [failed, setFailed] = useState(false);
  const domain = guessDomain(company);

  if (!domain || failed) {
    return (
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-accent-ink"
        style={{ backgroundColor: avatarColor(company) }}
        aria-hidden
      >
        {avatarInitial(company)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic external domain per company, can't be enumerated in next.config remotePatterns
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      aria-hidden
      className="h-8 w-8 shrink-0 rounded-full border border-line bg-card object-contain p-1.5"
      onError={() => setFailed(true)}
    />
  );
}
