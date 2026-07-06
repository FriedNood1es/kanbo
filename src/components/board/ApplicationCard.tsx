"use client";

import { useTransition } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import type { Application } from "@/generated/prisma";
import { applicationStages } from "@/lib/validation";
import { deleteApplication } from "@/actions/applications";
import ApplicationForm from "@/components/applications/ApplicationForm";

const stageLabels: Record<(typeof applicationStages)[number], string> = {
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export default function ApplicationCard({
  application,
  index,
}: {
  application: Application;
  index: number;
}) {
  const [isPending, startTransition] = useTransition();
  const { ref, handleRef, isDragging } = useSortable({
    id: application.id,
    index,
    group: application.stage,
    data: { stage: application.stage },
  });

  function handleDelete() {
    if (!confirm(`Delete the application for ${application.company}?`)) return;
    startTransition(async () => {
      await deleteApplication(application.id);
    });
  }

  return (
    <div
      ref={ref}
      className={`flex flex-col gap-2 rounded-md border bg-white p-3 shadow-sm transition-all duration-150 ${
        isDragging ? "scale-105 rotate-1 opacity-90 shadow-lg" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          ref={handleRef}
          className="-ml-1 mt-0.5 flex h-6 w-6 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 active:cursor-grabbing"
          aria-label="Drag to reorder or change stage"
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
        <div className="flex-1">
          <p className="font-medium">{application.company}</p>
          <p className="text-sm text-neutral-600">{application.role}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
          {stageLabels[application.stage]}
        </span>
      </div>

      {application.jobUrl && (
        <a
          href={application.jobUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 underline"
        >
          Job posting ↗
        </a>
      )}

      <div className="flex justify-end gap-3 text-sm">
        <ApplicationForm
          application={application}
          trigger={<button className="underline">Edit</button>}
        />
        <button onClick={handleDelete} disabled={isPending} className="text-red-600 underline">
          Delete
        </button>
      </div>
    </div>
  );
}
