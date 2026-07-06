"use client";

import { useEffect, useRef, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import type { DragEndEvent } from "@dnd-kit/react";
import type { Application } from "@/generated/prisma";
import { applicationStages } from "@/lib/validation";
import KanbanColumn from "@/components/board/KanbanColumn";
import BoardStats from "@/components/board/BoardStats";
import ApplicationForm from "@/components/applications/ApplicationForm";
import { moveApplication } from "@/actions/board";
import { deleteApplication } from "@/actions/applications";
import type { Stage } from "@/lib/stages";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

const DELETE_UNDO_MS = 5000;

// Fractional midpoint indexing — reordering one card only ever rewrites that
// card's position, never its neighbors'.
function computePosition(prev: number | undefined, next: number | undefined) {
  if (prev === undefined && next === undefined) return 0;
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
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
  // server sends fresh data (e.g. after adding/editing/deleting an
  // application via revalidatePath), or the local copy just goes stale.
  useEffect(() => {
    setApplications(initial);
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

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BoardStats applications={visibleApplications} />
          <ApplicationForm
            trigger={<Button type="button">Add application</Button>}
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
