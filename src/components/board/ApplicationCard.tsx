"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import type { Application } from "@/generated/prisma";
import { stageMeta } from "@/lib/stages";
import { cardTilt } from "@/lib/tilt";
import { formatShortDate, getAttentionBadge } from "@/lib/staleness";
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
}: {
  application: Application;
  index: number;
  onDeleteRequest: (application: Application) => void;
  isNew: boolean;
}) {
  const { ref, handleRef, isDragging } = useSortable({
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
    // means the board only reorders once, when React re-renders from our
    // own state update, which is the one thing keeping DOM and state
    // in sync.
    plugins: [SortableKeyboardPlugin],
  });
  const meta = stageMeta[application.stage];
  const tilt = cardTilt(application.id);
  const badge = getAttentionBadge(application);
  const needsAttention = badge?.kind === "overdue" || badge?.kind === "stale";
  const [isShredding, setIsShredding] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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
            className="-ml-1 mt-0.5 flex h-6 w-6 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-ink-faint hover:bg-ground hover:text-ink-dim active:cursor-grabbing"
            aria-label="Drag to reorder or change stage"
            title="Drag to reorder or change stage"
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
            <p className="text-sm text-ink-dim">{application.role}</p>
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
            className={`label-stamp flex items-center gap-1.5 text-xs ${
              needsAttention ? "text-warn" : "text-ink-dim"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${needsAttention ? "bg-warn" : "bg-ink-faint"}`}
              aria-hidden
            />
            {badge.kind === "overdue" && `Follow-up was due ${formatShortDate(badge.date)}`}
            {badge.kind === "upcoming" && `Follow up on ${formatShortDate(badge.date)}`}
            {badge.kind === "stale" && `No update in ${badge.days}d — follow up?`}
          </p>
        )}

        {application.notes && (
          <div className="max-h-28 overflow-y-auto rounded-md bg-ground px-2 py-1.5 text-sm text-ink-dim">
            <NoteContent text={application.notes} />
          </div>
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
          <div className="flex items-center justify-end gap-2">
            <ApplicationForm
              application={application}
              trigger={
                <Button type="button" variant="ghost" size="sm">
                  Edit
                </Button>
              }
            />
            <Button variant="danger" size="sm" onClick={() => setIsConfirmingDelete(true)}>
              Delete
            </Button>
          </div>
        )}
      </div>
    </>
  );

  return (
    // card-enter (plays once for a genuinely new card, per `isNew`) wraps a
    // bare dnd-kit-owned element — dnd-kit fully owns *its* transform for
    // drag positioning, so the tilt instead lives one level deeper, on a
    // plain child it never touches. `isNew` is tracked by KanbanBoard rather
    // than derived from this component's own mount, because moving a card to
    // a different stage unmounts it here and remounts it under the target
    // column — a fresh mount that must *not* replay the entrance animation.
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
                  } ${needsAttention ? "border-warn/50" : "border-line"}`}
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
          <div
            style={{ transform: isDragging ? `rotate(${tilt}deg)` : undefined }}
            className={`flex overflow-hidden rounded-md border bg-card shadow-sm transition-[transform,box-shadow,opacity] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              needsAttention ? "border-warn/50" : "border-line"
            } ${isDragging ? "scale-105 opacity-90 shadow-lg" : "hover:shadow-md"}`}
          >
            {cardContent}
          </div>
        )}
      </div>
    </div>
  );
}
