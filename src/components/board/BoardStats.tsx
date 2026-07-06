import type { Application } from "@/generated/prisma";
import { applicationStages, stageMeta } from "@/lib/stages";

export default function BoardStats({ applications }: { applications: Application[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="label-stamp text-sm text-ink-dim">
        {applications.length} {applications.length === 1 ? "application" : "applications"}
      </span>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {applicationStages.map((stage) => {
          const count = applications.filter((a) => a.stage === stage).length;
          if (count === 0) return null;
          const meta = stageMeta[stage];
          return (
            <span key={stage} className="label-stamp flex items-center gap-1.5 text-xs text-ink-dim">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden
              />
              {count} {meta.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
