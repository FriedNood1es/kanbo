"use client";

import { useDroppable } from "@dnd-kit/react";
import type { Application } from "@/generated/prisma";
import ApplicationCard from "@/components/board/ApplicationCard";

export default function KanbanColumn({
  stage,
  title,
  applications,
}: {
  stage: string;
  title: string;
  applications: Application[];
}) {
  const { ref, isDropTarget } = useDroppable({
    id: stage,
    data: { stage },
  });

  return (
    <div
      ref={ref}
      className={`flex min-w-64 flex-1 flex-col gap-3 rounded-lg border-2 p-3 transition-colors ${
        isDropTarget
          ? "border-dashed border-neutral-400 bg-neutral-200"
          : "border-transparent bg-neutral-100"
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
        <span className="text-xs text-neutral-500">{applications.length}</span>
      </div>

      {applications.length === 0 && (
        <p className="px-1 text-sm text-neutral-400">No applications yet</p>
      )}

      <div className="flex flex-col gap-2">
        {applications.map((application, index) => (
          <ApplicationCard key={application.id} application={application} index={index} />
        ))}
      </div>
    </div>
  );
}
