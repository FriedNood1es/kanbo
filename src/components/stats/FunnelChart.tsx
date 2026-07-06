import { applicationStages, stageMeta, type Stage } from "@/lib/stages";

// The 4 stage colors failed strict CVD-safety validation as a categorical
// set (steel blue and dusty rose both read low-chroma, and rose/green sit
// too close together for deuteranopia). Per the dataviz skill's own
// allowance, that's only legal with mandatory direct labels — so every bar
// here carries its stage name and count as real text, never color alone.
export default function FunnelChart({ counts }: { counts: Record<Stage, number> }) {
  const max = Math.max(1, ...applicationStages.map((s) => counts[s] ?? 0));

  return (
    <div className="flex flex-col gap-3">
      {applicationStages.map((stage) => {
        const meta = stageMeta[stage];
        const count = counts[stage] ?? 0;
        const widthPct = (count / max) * 100;

        return (
          <div key={stage} className="flex items-center gap-3">
            <span className="label-stamp w-28 shrink-0 text-xs text-ink-dim">{meta.label}</span>
            <div className="h-5 flex-1 rounded-r-[4px] bg-ground-raised">
              <div
                className="h-5 rounded-r-[4px] transition-[width] duration-300"
                style={{ width: `${widthPct}%`, backgroundColor: meta.color }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-sm font-semibold text-ink">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
