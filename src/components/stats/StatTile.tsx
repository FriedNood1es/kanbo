export default function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-card p-4 shadow-sm">
      <span className="label-stamp text-xs text-ink-dim">{label}</span>
      <span className="text-2xl font-semibold text-ink">{value}</span>
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </div>
  );
}
