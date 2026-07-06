"use client";

import { useDroppable } from "@dnd-kit/react";
import type { Application } from "@/generated/prisma";
import { stageMeta, type Stage } from "@/lib/stages";
import ApplicationCard from "@/components/board/ApplicationCard";

export default function KanbanColumn({
  stage,
  applications,
  emptyMessage = "No applications yet",
  onDeleteRequest,
  newCardIds,
}: {
  stage: Stage;
  applications: Application[];
  emptyMessage?: string;
  onDeleteRequest: (application: Application) => void;
  newCardIds: Set<string>;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: stage,
    data: { stage },
  });
  const meta = stageMeta[stage];

  return (
    <div
      ref={ref}
      data-tour={stage === "APPLIED" ? "column-applied" : undefined}
      className={`flex min-w-64 flex-1 flex-col gap-3 rounded-lg border-2 bg-ground-raised p-3 shadow-[inset_0_1px_3px_rgba(43,38,34,0.06)] transition-colors ${
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

      <div className="flex flex-col gap-2">
        {applications.map((application, index) => (
          <ApplicationCard
            key={application.id}
            application={application}
            index={index}
            onDeleteRequest={onDeleteRequest}
            isNew={newCardIds.has(application.id)}
          />
        ))}
      </div>
    </div>
  );
}
