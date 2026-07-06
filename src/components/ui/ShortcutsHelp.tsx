"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";

const shortcuts = [
  { keys: "/", description: "Focus search" },
  { keys: "Esc", description: "Close dialogs and menus" },
  { keys: "?", description: "Show this help" },
];

export default function ShortcutsHelp() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        dialogRef.current?.showModal();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-sm font-semibold text-ink-dim transition-colors hover:border-accent hover:text-ink"
      >
        ?
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-xs rounded-lg border border-line bg-card p-0 text-ink backdrop:bg-ink/30"
      >
        <div className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-semibold text-ink">Keyboard shortcuts</h2>

          <ul className="flex flex-col gap-2.5">
            {shortcuts.map((s) => (
              <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-ink-dim">{s.description}</span>
                <kbd className="label-stamp rounded border border-line bg-ground px-1.5 py-0.5 text-xs text-ink">
                  {s.keys}
                </kbd>
              </li>
            ))}
          </ul>

          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              Close
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
