"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

// useFormStatus only sees pending state from inside the <form> it belongs
// to — a plain submit button gave zero feedback while signOut()'s redirect
// was in flight, so a slow connection just looked like a dead click.
function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="menuitem"
      disabled={pending}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-stage-rejected hover:bg-ground disabled:cursor-wait disabled:opacity-60"
    >
      {pending && (
        <svg
          className="h-3 w-3 shrink-0 animate-spin"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" opacity="0.25" />
          <path
            d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export default function AccountMenu({
  image,
  label,
  onSignOut,
}: {
  image: string | null | undefined;
  label: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        title="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="group relative flex h-10 w-10 items-center justify-center"
      >
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-line transition-colors group-hover:border-accent">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- external avatar host
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-accent text-sm font-semibold text-accent-ink">
              {label.charAt(0).toUpperCase()}
            </span>
          )}
        </span>

        <span className="absolute -bottom-0.5 -right-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-line bg-card text-ink-dim">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
            <path
              d="M1.5 3 4 5.5 6.5 3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-md border border-line bg-card shadow-lg"
        >
          <p className="truncate border-b border-line px-3 py-2 text-xs text-ink-dim">{label}</p>

          <a
            href="/api/export"
            role="menuitem"
            className="block px-3 py-2 text-sm text-ink hover:bg-ground"
          >
            Export CSV
          </a>
          <Link
            href="/stats"
            role="menuitem"
            className="block px-3 py-2 text-sm text-ink hover:bg-ground"
          >
            Stats
          </Link>

          <form action={onSignOut}>
            <SignOutButton />
          </form>
        </div>
      )}
    </div>
  );
}
