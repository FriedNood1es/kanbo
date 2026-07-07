"use client";

import { useEffect, useRef, useState } from "react";
import type { Application } from "@/generated/prisma";
import KanbanBoard from "@/components/board/KanbanBoard";
import KanboMark from "@/components/ui/KanboMark";
import AccountMenu from "@/components/board/AccountMenu";
import ThemeToggle from "@/components/ui/ThemeToggle";
import ShortcutsHelp from "@/components/ui/ShortcutsHelp";
import Walkthrough from "@/components/board/Walkthrough";

export default function BoardShell({
  applications,
  userImage,
  userLabel,
  isDemo = false,
  onSignOut,
}: {
  applications: Application[];
  userImage: string | null | undefined;
  userLabel: string;
  isDemo?: boolean;
  onSignOut: () => void;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Press "/" anywhere on the page to jump into search — the kbd hint on
  // the field is a promise, not just decoration, so it has to actually work.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center gap-5 border-b border-line bg-card px-5 py-3.5 shadow-sm">
        <div className="flex shrink-0 items-center gap-2">
          <KanboMark className="h-8 w-8" />
          <span className="label-stamp text-xl font-semibold text-ink">Kanbo</span>
        </div>

        <div className="relative w-full max-w-md">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
            <path d="m14 14-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={searchRef}
            data-tour="search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company or role…"
            className="w-full rounded-md border border-line bg-ground py-2.5 pl-10 pr-9 text-base text-ink transition-shadow placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              title="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-ink-faint hover:text-ink"
            >
              ×
            </button>
          ) : (
            <kbd className="label-stamp pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-card px-1.5 py-0.5 text-[0.65rem] text-ink-faint">
              /
            </kbd>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <ShortcutsHelp />
          <ThemeToggle />
          <AccountMenu image={userImage} label={userLabel} onSignOut={onSignOut} />
        </div>
      </header>

      {isDemo && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-line bg-accent/10 px-5 py-2 text-center text-sm text-ink-dim">
          <span>
            You&rsquo;re exploring a live demo — changes save to a temporary account.
          </span>
          <a href="/sign-in" className="font-semibold text-accent hover:underline">
            Sign in to keep your own board →
          </a>
        </div>
      )}

      <div className="p-6">
        <KanbanBoard applications={applications} query={query} isDemo={isDemo} />
      </div>

      <Walkthrough isDemo={isDemo} />
    </div>
  );
}
