"use client";

import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";

// useFormStatus only sees pending state from inside the <form> it belongs
// to — a plain submit button gave zero feedback while startDemoSession's
// seed + redirect was in flight, so a slow connection just looked like a
// dead click (and invited double-clicks that minted duplicate demo users).
export default function DemoButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      className="w-full gap-3 py-4 text-lg"
      disabled={pending}
    >
      {pending && (
        <svg
          className="h-5 w-5 shrink-0 animate-spin"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" opacity="0.25" />
          <path
            d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
      {pending ? "Loading your demo board…" : "Explore a live demo"}
    </Button>
  );
}
