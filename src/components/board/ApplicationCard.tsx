"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import type { Application } from "@/generated/prisma";
import { stageMeta } from "@/lib/stages";
import { avatarColor, avatarInitial } from "@/lib/avatar";
import { cardTilt } from "@/lib/tilt";
import { daysSince, isStale } from "@/lib/staleness";
import ApplicationForm from "@/components/applications/ApplicationForm";
import Button from "@/components/ui/Button";

export default function ApplicationCard({
  application,
  index,
  onDeleteRequest,
}: {
  application: Application;
  index: number;
  onDeleteRequest: (application: Application) => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: application.id,
    index,
    group: application.stage,
    data: { stage: application.stage },
  });
  const meta = stageMeta[application.stage];
  const tilt = cardTilt(application.id);
  const stale = isStale(application.stage, application.updatedAt);

  return (
    // card-enter (plays once on mount) wraps a bare dnd-kit-owned element —
    // dnd-kit fully owns *its* transform for drag positioning, so the tilt
    // instead lives one level deeper, on a plain child it never touches.
    <div className="card-enter">
      <div ref={ref}>
        <div
          style={{ transform: isDragging ? `rotate(${tilt}deg)` : undefined }}
          className={`flex overflow-hidden rounded-md border bg-card shadow-sm transition-all duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            stale ? "border-warn/50" : "border-line"
          } ${isDragging ? "scale-105 opacity-90 shadow-lg" : "hover:shadow-md"}`}
        >
          <span className="w-1.5 shrink-0" style={{ backgroundColor: meta.color }} aria-hidden />

          <div className="flex flex-1 flex-col gap-2 p-3">
            <div className="flex items-start gap-2">
              <button
                ref={handleRef}
                className="-ml-1 mt-0.5 flex h-6 w-6 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-ink-faint hover:bg-ground hover:text-ink-dim active:cursor-grabbing"
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
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-accent-ink"
                style={{ backgroundColor: avatarColor(application.company) }}
                aria-hidden
              >
                {avatarInitial(application.company)}
              </span>
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

            {stale && (
              <p className="label-stamp flex items-center gap-1.5 text-xs text-warn">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
                No update in {daysSince(application.updatedAt)}d — follow up?
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <ApplicationForm
                application={application}
                trigger={
                  <Button type="button" variant="ghost" size="sm">
                    Edit
                  </Button>
                }
              />
              <Button variant="danger" size="sm" onClick={() => onDeleteRequest(application)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
