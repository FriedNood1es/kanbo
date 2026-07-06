// Three tiny versions of the actual application card — same rounded shape,
// same stage-colored left stripe, same tilt — fanned like a spread hand of
// cards. The mark and the product are meant to visually rhyme.
export default function KanboMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <g transform="rotate(-12 12 13)">
        <rect
          x="7"
          y="6"
          width="10"
          height="13"
          rx="1.5"
          fill="var(--card)"
          stroke="var(--ink)"
          strokeWidth="1.25"
        />
        <rect x="7" y="6" width="2.2" height="13" rx="1" fill="var(--stage-applied)" />
      </g>
      <g transform="rotate(12 12 13)">
        <rect
          x="7"
          y="6"
          width="10"
          height="13"
          rx="1.5"
          fill="var(--card)"
          stroke="var(--ink)"
          strokeWidth="1.25"
        />
        <rect x="7" y="6" width="2.2" height="13" rx="1" fill="var(--stage-offer)" />
      </g>
      <g>
        <rect
          x="7"
          y="6"
          width="10"
          height="13"
          rx="1.5"
          fill="var(--card)"
          stroke="var(--ink)"
          strokeWidth="1.25"
        />
        <rect x="7" y="6" width="2.2" height="13" rx="1" fill="var(--stage-interviewing)" />
      </g>
    </svg>
  );
}
