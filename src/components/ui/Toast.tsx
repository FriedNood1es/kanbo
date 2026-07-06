export default function Toast({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-md border border-line bg-ink px-4 py-2.5 text-sm text-card shadow-lg">
      <span>{message}</span>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="font-semibold text-accent hover:underline">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
