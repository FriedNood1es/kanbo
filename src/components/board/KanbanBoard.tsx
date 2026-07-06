"use client";

import { useEffect, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import type { DragEndEvent } from "@dnd-kit/react";
import type { Application } from "@/generated/prisma";
import { applicationStages } from "@/lib/validation";
import KanbanColumn from "@/components/board/KanbanColumn";
import ApplicationForm from "@/components/applications/ApplicationForm";
import { moveApplication } from "@/actions/board";
import type { Stage } from "@/lib/stages";
import Button from "@/components/ui/Button";

// Fractional midpoint indexing — reordering one card only ever rewrites that
// card's position, never its neighbors'.
function computePosition(prev: number | undefined, next: number | undefined) {
  if (prev === undefined && next === undefined) return 0;
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}

export default function KanbanBoard({ applications: initial }: { applications: Application[] }) {
  const [applications, setApplications] = useState(initial);

  // KanbanBoard keeps its own copy of applications so drag-and-drop can update
  // it optimistically — but that means it also has to resync whenever the
  // server sends fresh data (e.g. after adding/editing/deleting an
  // application via revalidatePath), or the local copy just goes stale.
  useEffect(() => {
    setApplications(initial);
  }, [initial]);

  function columnItems(stage: Stage, excludeId?: string) {
    return applications
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

    const active = applications.find((a) => a.id === activeId);
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
        <div className="flex justify-end">
          <ApplicationForm
            trigger={<Button type="button">Add application</Button>}
          />
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {applicationStages.map((stage) => (
            <KanbanColumn key={stage} stage={stage} applications={columnItems(stage)} />
          ))}
        </div>
      </div>
    </DragDropProvider>
  );
}
