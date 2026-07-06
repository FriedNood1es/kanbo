const stops = [
  { label: "Applied", pct: 0, glowClass: "glow-applied" },
  { label: "Interviewing", pct: 50, glowClass: "glow-interviewing" },
  { label: "Offer", pct: 100, glowClass: "glow-offer" },
];

const TRACK_Y = 10;

// A small ambient preview on the sign-in page: a card travels
// Applied -> Interviewing -> Offer and back, pausing at each stop — a
// glimpse of the board's actual drag mechanic before you've signed in.
export default function StageTravelPreview() {
  return (
    <div className="relative h-16 w-96">
      <div
        className="absolute left-0 right-0 h-px bg-line"
        style={{ top: TRACK_Y }}
        aria-hidden
      />

      {stops.map(({ label, pct }) => (
        <span
          key={`${label}-dot`}
          className="absolute h-2.5 w-2.5 rounded-full bg-line"
          style={{ left: `${pct}%`, top: TRACK_Y, transform: "translate(-50%, -50%)" }}
          aria-hidden
        />
      ))}

      {stops.map(({ label, pct, glowClass }) => (
        <span
          key={label}
          className={`label-stamp absolute whitespace-nowrap text-sm text-ink-faint ${glowClass}`}
          style={{ left: `${pct}%`, top: TRACK_Y + 18, transform: "translateX(-50%)" }}
        >
          {label}
        </span>
      ))}

      <span
        className="stage-travel absolute h-3.5 w-3.5 rounded-full shadow-sm"
        style={{ top: TRACK_Y, transform: "translate(-50%, -50%)" }}
        aria-hidden
      />
    </div>
  );
}
