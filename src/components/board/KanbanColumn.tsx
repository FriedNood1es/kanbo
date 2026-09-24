"use client";

import { useState, type ReactNode } from "react";
import { useDroppable } from "@dnd-kit/react";
import type { Application } from "@/generated/prisma";
import { stageMeta, type Stage } from "@/lib/stages";
import ApplicationCard from "@/components/board/ApplicationCard";

// One pill control for both collapse flavors (old rejected, ghosts) — same
// control language, only the copy differs.
function CollapseToggle({
  expanded,
  label,
  onToggle,
}: {
  expanded: boolean;
  label: ReactNode;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="label-stamp relative flex w-fit items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs text-ink-dim transition-colors after:absolute after:-inset-y-2.5 after:content-[''] hover:border-accent hover:text-ink"
    >
      {label}
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden="true"
        className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
      >
        <path
          d="M2 3.5 5 6.5 8 3.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function KanbanColumn({
  stage,
  applications,
  emptyMessage = "No applications yet",
  onDeleteRequest,
  newCardIds,
  companies,
  roles,
  olderAges,
  ghostIds,
}: {
  stage: Stage;
  applications: Application[];
  emptyMessage?: string;
  onDeleteRequest: (application: Application) => void;
  newCardIds: Set<string>;
  companies: string[];
  roles: string[];
  olderAges?: Map<string, number>;
  ghostIds?: Set<string>;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: stage,
    data: { stage },
  });
  const meta = stageMeta[stage];

  // Long-rejected cards and ghosted cards hide behind toggles so columns
  // don't grow without bound — while staying one click away for review. The
  // sets arrive server-side (rejection dates, ghost predicate). Hidden cards
  // render as null (not sliced out) so each card keeps its original `index`
  // for the sortable, and keys stay stable across expand/collapse. The two
  // sets are disjoint by construction (ghosts never live in REJECTED), so a
  // column never shows both toggles.
  const [showOlder, setShowOlder] = useState(false);
  const [showGhosts, setShowGhosts] = useState(false);
  const olderCount = olderAges
    ? applications.filter((a) => olderAges.has(a.id)).length
    : 0;
  const ghostCount = ghostIds ? applications.filter((a) => ghostIds.has(a.id)).length : 0;
  const isHidden = (application: Application) =>
    (!showOlder && (olderAges?.has(application.id) ?? false)) ||
    (!showGhosts && (ghostIds?.has(application.id) ?? false));

  return (
    <div
      ref={ref}
      data-tour={stage === "APPLIED" ? "column-applied" : undefined}
      className={`flex min-w-60 flex-1 flex-col gap-3 rounded-lg border-2 bg-ground-raised p-3 shadow-[inset_0_1px_3px_rgba(43,38,34,0.06)] transition-colors sm:min-w-64 ${
        isDropTarget ? "border-accent border-dashed" : "border-dashed border-line"
      }`}
    >
      <div className="flex items-center gap-2 px-1">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: meta.color }}
          aria-hidden
        />
        <h2 className="label-stamp text-sm font-semibold text-ink-dim">{meta.label}</h2>
        <span className="label-stamp ml-auto text-xs text-ink-faint">
          {applications.length}
        </span>
      </div>

      {applications.length === 0 && (
        <p className="px-1 text-sm text-ink-faint">{emptyMessage}</p>
      )}

      {olderCount > 0 && (
        <CollapseToggle
          expanded={showOlder}
          label={showOlder ? "Hide older" : `Show ${olderCount} older`}
          onToggle={() => setShowOlder((v) => !v)}
        />
      )}

      {ghostCount > 0 && (
        <CollapseToggle
          expanded={showGhosts}
          label={showGhosts ? "Hide ghosted" : `Show ${ghostCount} ghosted`}
          onToggle={() => setShowGhosts((v) => !v)}
        />
      )}

      <div className="flex flex-col gap-2">
        {applications.map((application, index) =>
          isHidden(application) ? null : (
            <ApplicationCard
              key={application.id}
              application={application}
              index={index}
              onDeleteRequest={onDeleteRequest}
              isNew={newCardIds.has(application.id)}
              companies={companies}
              roles={roles}
              olderDaysAgo={olderAges?.get(application.id)}
            />
          ),
        )}
      </div>
    </div>
  );
}
