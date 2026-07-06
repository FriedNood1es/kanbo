"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import type { DragEndEvent } from "@dnd-kit/react";
import type { Application } from "@/generated/prisma";
import { applicationStages } from "@/lib/validation";
import KanbanColumn from "@/components/board/KanbanColumn";
import BoardStats from "@/components/board/BoardStats";
import ApplicationForm from "@/components/applications/ApplicationForm";
import { moveApplication } from "@/actions/board";
import { deleteApplication } from "@/actions/applications";
import { seedDemoApplications } from "@/actions/demo";
import type { Stage } from "@/lib/stages";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import KanboMark from "@/components/ui/KanboMark";

const DELETE_UNDO_MS = 5000;

// Fractional midpoint indexing — reordering one card only ever rewrites that
// card's position, never its neighbors'.
function computePosition(prev: number | undefined, next: number | undefined) {
  if (prev === undefined && next === undefined) return 0;
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}

// Field-by-field rather than a single `updatedAt` comparison: a drag's local
// optimistic update only patches stage/position, leaving its `updatedAt`
// stale, so comparing timestamps would treat every post-drag server refetch
// as "changed" and force a full-board resync (defeating the optimization
// below). Comparing the actual editable fields catches edits made through
// the form (company, role, jobUrl, notes, dates) without false-positiving on
// a drag whose optimistic copy already matches on everything that changed.
function sameApplication(a: Application, b: Application) {
  return (
    a.company === b.company &&
    a.role === b.role &&
    a.jobUrl === b.jobUrl &&
    a.notes === b.notes &&
    a.stage === b.stage &&
    a.position === b.position &&
    a.appliedAt.getTime() === b.appliedAt.getTime() &&
    (a.followUpAt?.getTime() ?? null) === (b.followUpAt?.getTime() ?? null)
  );
}

export default function KanbanBoard({
  applications: initial,
  query = "",
}: {
  applications: Application[];
  query?: string;
}) {
  const [applications, setApplications] = useState(initial);
  const normalizedQuery = query.trim().toLowerCase();
  const [isSeeding, startSeeding] = useTransition();

  function handleSeedDemo() {
    startSeeding(async () => {
      await seedDemoApplications();
    });
  }

  const [pendingDelete, setPendingDelete] = useState<{ id: string; company: string } | null>(
    null,
  );
  const pendingDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleApplications = applications.filter((a) => a.id !== pendingDelete?.id);

  function requestDelete(application: Application) {
    // Finalize any already-pending delete immediately rather than letting
    // two undo windows overlap.
    if (pendingDelete && pendingDeleteTimer.current) {
      clearTimeout(pendingDeleteTimer.current);
      deleteApplication(pendingDelete.id);
    }

    pendingDeleteTimer.current = setTimeout(() => {
      deleteApplication(application.id);
      setPendingDelete(null);
      pendingDeleteTimer.current = null;
    }, DELETE_UNDO_MS);

    setPendingDelete({ id: application.id, company: application.company });
  }

  function undoDelete() {
    if (pendingDeleteTimer.current) {
      clearTimeout(pendingDeleteTimer.current);
      pendingDeleteTimer.current = null;
    }
    setPendingDelete(null);
  }

  function matchesQuery(application: Application) {
    if (!normalizedQuery) return true;
    return (
      application.company.toLowerCase().includes(normalizedQuery) ||
      application.role.toLowerCase().includes(normalizedQuery)
    );
  }

  // KanbanBoard keeps its own copy of applications so drag-and-drop can update
  // it optimistically — but that means it also has to resync whenever the
  // server sends fresh data (e.g. after adding or editing an application,
  // whose actions do trigger a revalidated refetch), or the local copy just
  // goes stale. Guarded to skip replacing state with data that's already
  // identical to what's shown: swapping in a fresh array (new object
  // identities for every card, even unchanged ones) can needlessly remount
  // cards mid-animation elsewhere on the board.
  //
  // Drag-and-drop and delete deliberately do *not* trigger this path — they
  // call their Server Actions as bare, un-awaited promises rather than
  // through a transition, purely for persistence. The optimistic local
  // update already fully determines the correct UI state, and forcing a
  // round-trip-gated re-render of the whole board on every drop was both
  // slow (a full Server Component refetch on every single drag) and, on a
  // slower connection, opened a wider window for a `@dnd-kit/react` timing
  // issue (see the per-card key in KanbanColumn.tsx) to actually surface.
  useEffect(() => {
    setApplications((current) => {
      if (current.length !== initial.length) return initial;
      const currentById = new Map(current.map((a) => [a.id, a]));
      const unchanged = initial.every((a) => {
        const existing = currentById.get(a.id);
        return existing && sameApplication(existing, a);
      });
      return unchanged ? current : initial;
    });
  }, [initial]);

  function columnItems(stage: Stage, excludeId?: string) {
    return visibleApplications
      .filter((a) => a.stage === stage && a.id !== excludeId)
      .sort((a, b) => a.position - b.position);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { operation, canceled } = event;
    const { source, target } = operation;
    if (!source || !target || canceled) return;

    const activeId = String(source.id);
    const overId = String(target.id);
    const overStage = (target.data as { stage?: Stage } | undefined)?.stage;

    const active = visibleApplications.find((a) => a.id === activeId);
    if (!active) return;

    const newStage: Stage = overStage ?? active.stage;
    const siblings = columnItems(newStage, activeId);
    const overIndex = siblings.findIndex((a) => a.id === overId);
    const insertIndex = overIndex === -1 ? siblings.length : overIndex;

    const newPosition = computePosition(
      siblings[insertIndex - 1]?.position,
      siblings[insertIndex]?.position,
    );

    if (newStage === active.stage && newPosition === active.position) return;

    const previous = applications;
    setApplications((prev) =>
      prev.map((a) => (a.id === activeId ? { ...a, stage: newStage, position: newPosition } : a)),
    );

    moveApplication({ id: activeId, stage: newStage, position: newPosition }).then((result) => {
      if (!result.success) setApplications(previous);
    });
  }

  const isEmpty = applications.length === 0;

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line bg-ground-raised px-6 py-16 text-center">
            <KanboMark className="h-10 w-10 opacity-70" />
            <div>
              <h2 className="text-lg font-semibold text-ink">Your board is empty</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-dim">
                Track applications as they move from Applied to Interviewing to Offer — drag
                cards between columns as things progress.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <ApplicationForm
                trigger={
                  <Button type="button" data-tour="add-application">
                    Add your first application
                  </Button>
                }
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSeedDemo}
                disabled={isSeeding}
              >
                {isSeeding ? "Loading…" : "Load example cards"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <BoardStats applications={visibleApplications} />
              <ApplicationForm
                trigger={
                  <Button type="button" data-tour="add-application">
                    Add application
                  </Button>
                }
              />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2">
              {applicationStages.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  applications={columnItems(stage).filter(matchesQuery)}
                  emptyMessage={normalizedQuery ? "No matches" : "No applications yet"}
                  onDeleteRequest={requestDelete}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {pendingDelete && (
        <Toast
          message={`Deleted ${pendingDelete.company}`}
          actionLabel="Undo"
          onAction={undoDelete}
        />
      )}
    </DragDropProvider>
  );
}
