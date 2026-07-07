"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

type Step = {
  target: string;
  title: string;
  body: string;
};

const steps: Step[] = [
  {
    target: "add-application",
    title: "Add an application",
    body: "Log a new job application here — company, role, and a link to the posting.",
  },
  {
    target: "search",
    title: "Search your board",
    body: "Filter by company or role, or just press / from anywhere on the page.",
  },
  {
    target: "column-applied",
    title: "Drag cards between stages",
    body: "Move a card to Interviewing, Offer, or Rejected as things progress.",
  },
];

const STORAGE_KEY = "kanbo-walkthrough-seen";
// Demo visitors get the tour every fresh session, keyed on sessionStorage so a
// mid-demo refresh doesn't re-nag: a recruiter who previously dismissed the
// tour (setting the localStorage flag) should still see it when they demo.
const DEMO_STORAGE_KEY = "kanbo-demo-tour-seen";

export default function Walkthrough({ isDemo = false }: { isDemo?: boolean }) {
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const store = isDemo ? "sessionStorage" : "localStorage";
  const storageKey = isDemo ? DEMO_STORAGE_KEY : STORAGE_KEY;

  useEffect(() => {
    if (!window[store].getItem(storageKey)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- web storage is browser-only and can't be read during render/SSR, so checking whether the walkthrough was already seen genuinely belongs in a one-time mount effect.
      setStepIndex(0);
    }
  }, [store, storageKey]);

  useEffect(() => {
    if (stepIndex === null) return;

    function measure() {
      const el = document.querySelector(`[data-tour="${steps[stepIndex!].target}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        // Target isn't on screen (e.g. an empty board hides the column) —
        // don't get stuck pointing at nothing.
        setStepIndex((i) => (i === null ? null : i + 1 >= steps.length ? null : i + 1));
      }
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [stepIndex]);

  function finish() {
    window[store].setItem(storageKey, "1");
    setStepIndex(null);
    setRect(null);
  }

  function next() {
    if (stepIndex === null) return;
    if (stepIndex + 1 >= steps.length) {
      finish();
    } else {
      setStepIndex(stepIndex + 1);
    }
  }

  if (stepIndex === null || !rect) return null;

  const step = steps[stepIndex];
  const calloutWidth = 288;
  const calloutHeight = 160;
  // For a short target (a button, the search bar) anchor below its real
  // bottom edge; for a tall one (a whole column) that would push the
  // callout off-screen, so anchor just below its top instead.
  const anchorBottom = Math.min(rect.bottom, rect.top + 200);
  const top = Math.min(anchorBottom + 12, window.innerHeight - calloutHeight - 12);
  const left = Math.min(Math.max(rect.left, 12), window.innerWidth - calloutWidth - 12);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40" onClick={finish} aria-hidden="true" />

      <div
        className="pointer-events-none fixed z-40 rounded-md"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: "0 0 0 3px var(--accent), 0 0 0 9999px rgba(0,0,0,0.4)",
        }}
      />

      <div
        role="dialog"
        aria-label={step.title}
        className="fixed z-50 rounded-lg border border-line bg-card p-4 shadow-lg"
        style={{ top, left, width: calloutWidth }}
      >
        <p className="label-stamp text-xs text-ink-faint">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-ink">{step.title}</h3>
        <p className="mt-1 text-sm text-ink-dim">{step.body}</p>
        <div className="mt-3 flex justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={finish}>
            Skip
          </Button>
          <Button type="button" size="sm" onClick={next}>
            {stepIndex + 1 >= steps.length ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </>
  );
}
