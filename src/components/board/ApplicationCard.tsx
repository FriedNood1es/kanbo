"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import type { Application } from "@/generated/prisma";
import { stageMeta } from "@/lib/stages";
import {
  formatGhostedMessage,
  formatRejectionAge,
  formatShortDate,
  getAttentionBadge,
} from "@/lib/staleness";
import ApplicationForm from "@/components/applications/ApplicationForm";
import Button from "@/components/ui/Button";
import CompanyAvatar from "@/components/board/CompanyAvatar";
import NoteContent from "@/components/board/NoteContent";

const SHRED_STRIPS = 7;
const SHRED_DURATION_MS = 480;

export default function ApplicationCard({
  application,
  index,
  onDeleteRequest,
  isNew,
  companies,
  roles,
  olderDaysAgo,
}: {
  application: Application;
  index: number;
  onDeleteRequest: (application: Application) => void;
  isNew: boolean;
  companies: string[];
  roles: string[];
  olderDaysAgo?: number;
}) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: application.id,
    index,
    group: application.stage,
    data: { stage: application.stage },
    // Default plugins include OptimisticSortingPlugin, which reorders the
    // *real* DOM directly (insertAdjacentElement) as you drag over other
    // cards, entirely outside React's reconciliation. Our onDragEnd handler
    // then updates React state on top of a DOM React no longer has an
    // accurate picture of — the actual cause of cards vanishing or
    // subsequent drags silently failing. Keeping only the keyboard plugin
    // means the board only reorders through React state (the live preview in
    // KanbanBoard's onDragOver plus the commit in onDragEnd), which is the
    // one thing keeping DOM and state in sync.
    plugins: [SortableKeyboardPlugin],
  });
  const meta = stageMeta[application.stage];
  const badge = getAttentionBadge(application);
  const needsAttention = badge?.kind === "overdue" || badge?.kind === "stale";
  const ghostDays = badge?.kind === "ghosted" ? badge.days : undefined;
  const isGhosted = ghostDays !== undefined;
  // Tier-2 ghosts (60d+, the "their loss" copy) earn the watermark; tier-1
  // stays clean with just the wash so the drama is reserved for true ghosts.
  const isHaunted = ghostDays !== undefined && ghostDays >= 60;
  // A long-collapsed rejection, expanded for review — filed-away look plus
  // its age as a rubber stamp. The stamp states a fact, so it shows anywhere
  // the card renders (column, search results).
  const isOlder = olderDaysAgo !== undefined;
  const badgeTitle = !badge
    ? undefined
    : badge.kind === "overdue"
      ? "Follow-up date has passed"
      : badge.kind === "upcoming"
        ? "Follow-up scheduled"
        : badge.kind === "ghosted"
          ? "No reply for a while — possibly ghosted"
          : "No updates for a while";
  const [isShredding, setIsShredding] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Same contract as AccountMenu's dropdown: outside click or Escape closes.
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  function handleConfirmDelete() {
    setIsConfirmingDelete(false);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      onDeleteRequest(application);
      return;
    }
    setIsShredding(true);
    setTimeout(() => onDeleteRequest(application), SHRED_DURATION_MS);
  }

  const cardContent = (
    <>
      <span className="w-1.5 shrink-0" style={{ backgroundColor: meta.color }} aria-hidden />

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start gap-2">
          <button
            ref={handleRef}
            className="-ml-1 mt-0.5 flex h-8 w-8 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-ink-faint hover:bg-ground hover:text-ink-dim active:cursor-grabbing relative after:absolute after:-inset-2 after:content-['']"
            aria-label="Drag to reorder or change stage (also keyboard-draggable)"
            title="Drag to reorder or change stage (also keyboard-draggable)"
          >
            <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
              <circle cx="3" cy="2" r="1.5" />
              <circle cx="9" cy="2" r="1.5" />
              <circle cx="3" cy="8" r="1.5" />
              <circle cx="9" cy="8" r="1.5" />
              <circle cx="3" cy="14" r="1.5" />
              <circle cx="9" cy="14" r="1.5" />
            </svg>
          </button>
          <CompanyAvatar company={application.company} />
          <div className="flex-1">
            <p className="text-base font-semibold text-ink">{application.company}</p>
            {application.role && <p className="text-sm text-ink-dim">{application.role}</p>}
            <p className="label-stamp text-xs text-ink-faint">
              Applied {formatShortDate(application.appliedAt)}
            </p>
          </div>
        </div>

        {application.jobUrl && (
          <a
            href={application.jobUrl}
            target="_blank"
            rel="noreferrer"
            className="label-stamp text-sm text-accent hover:underline"
          >
            Job posting ↗
          </a>
        )}

        {badge && (
          <p
            title={badgeTitle}
            className={`label-stamp flex items-center gap-1.5 text-xs ${
              isGhosted
                ? "font-semibold text-ghost"
                : needsAttention
                  ? "font-semibold text-danger"
                  : "text-ink-dim"
            }`}
          >
            {isGhosted ? (
              <span aria-hidden className="ghost-bob inline-block">
                👻
              </span>
            ) : needsAttention ? (
              <span aria-hidden>🚩</span>
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden />
            )}
            {badge.kind === "overdue" && `Follow-up was due ${formatShortDate(badge.date)}`}
            {badge.kind === "upcoming" && `Follow up on ${formatShortDate(badge.date)}`}
            {badge.kind === "ghosted" && formatGhostedMessage(badge.days)}
            {badge.kind === "stale" && `No update in ${badge.days}d — follow up?`}
          </p>
        )}

        {application.notes && (
          <>
            <div
              data-no-drag
              className={`rounded-md bg-ground px-2 py-1.5 text-sm text-ink-dim ${
                notesExpanded ? "max-h-28 overflow-y-auto" : ""
              }`}
            >
              <div className={notesExpanded ? undefined : "line-clamp-2"}>
                <NoteContent text={application.notes} />
              </div>
            </div>
            {application.notes.length > 140 && (
              <button
                type="button"
                onClick={() => setNotesExpanded((v) => !v)}
                className="-mt-1 self-start text-xs font-semibold text-accent hover:underline"
              >
                {notesExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </>
        )}

        {isConfirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="mr-auto text-xs text-ink-dim">Delete this card?</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirmingDelete(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end">
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Card actions"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title="Card actions"
                className="relative flex h-8 w-8 items-center justify-center rounded text-lg leading-none text-ink-faint hover:bg-ground hover:text-ink after:absolute after:-inset-2 after:content-['']"
              >
                ⋯
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full right-0 z-20 mb-1 w-36 overflow-hidden rounded-md border border-line bg-card shadow-lg"
                >
                  <div onClick={() => setMenuOpen(false)}>
                    <ApplicationForm
                      application={application}
                      companies={companies}
                      roles={roles}
                      trigger={
                        <button
                          type="button"
                          role="menuitem"
                          className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-ground"
                        >
                          Edit
                        </button>
                      }
                    />
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setIsConfirmingDelete(true);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-stage-rejected hover:bg-ground"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quiet closure for rejected cards — calm paper, not a shout. The
            ghost gets the mascot and the motion; rejection gets stillness. */}
        {application.stage === "REJECTED" && (
          <p className="label-stamp text-center text-xs text-ink-faint">
            Not the one — onward.
          </p>
        )}
      </div>
    </>
  );

  return (
    // card-enter (plays once for a genuinely new card, per `isNew`) wraps a
    // bare dnd-kit-owned element — dnd-kit fully owns *its* transform for
    // drag positioning, so decorative transforms live on plain children it
    // never touches. `isNew` is tracked by KanbanBoard rather than derived
    // from this component's own mount, because moving a card to a different
    // stage unmounts it here and remounts it under the target column — a
    // fresh mount that must *not* replay the entrance animation.
    <div className={isNew ? "card-enter" : undefined}>
      <div ref={ref}>
        {isShredding ? (
          <div className="relative" style={{ pointerEvents: "none" }}>
            {Array.from({ length: SHRED_STRIPS }).map((_, i) => {
              const leftPct = (i / SHRED_STRIPS) * 100;
              const rightPct = 100 - ((i + 1) / SHRED_STRIPS) * 100;
              const drift = (i % 2 === 0 ? -1 : 1) * (3 + i * 1.5);
              return (
                <div
                  key={i}
                  className={`shred-strip flex overflow-hidden rounded-md border bg-card shadow-sm ${
                    i === 0 ? "" : "absolute inset-0"
                  } ${needsAttention ? "border-danger/50" : "border-line"}`}
                  style={
                    {
                      clipPath: `inset(0 ${rightPct}% 0 ${leftPct}%)`,
                      animationDelay: `${i * 25}ms`,
                      "--shred-drift": `${drift}px`,
                      "--shred-tilt": `${drift}deg`,
                    } as React.CSSProperties
                  }
                >
                  {cardContent}
                </div>
              );
            })}
          </div>
        ) : (
          // While its overlay clone floats under the pointer, the source
          // card dims into a placeholder holding its slot. Lift is instant
          // (no transform transition): the old springy ease read as input
          // lag on grab. A long-collapsed rejection keeps its filed-away
          // look here too, with its age stamped on like an archive mark; a
          // ghosted card keeps its spectral wash — the three special states
          // never share a surface.
          <div
            className={`relative flex cursor-grab overflow-hidden rounded-md border shadow-sm transition-[box-shadow,opacity] duration-150 active:cursor-grabbing ${
              isOlder
                ? "border-dashed border-line bg-card saturate-[.6] shadow-none"
                : isGhosted
                  ? "border-ghost/60 bg-ghost/10 shadow-[0_0_12px_-2px_var(--ghost)]"
                  : needsAttention
                    ? "border-danger/50 bg-card"
                    : "border-line bg-card"
            } ${isDragSource ? "opacity-30" : isOlder ? "opacity-90" : "hover:shadow-md"}`}
          >
            {cardContent}
            {olderDaysAgo !== undefined && (
              <span
                aria-hidden
                className="label-stamp pointer-events-none absolute right-2 top-2 -rotate-6 rounded-sm border-2 border-current bg-card px-1 text-[0.65rem] font-semibold text-danger"
              >
                {formatRejectionAge(olderDaysAgo)}
              </span>
            )}
            {isHaunted && (
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-2 right-1 select-none text-5xl opacity-20"
              >
                👻
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
