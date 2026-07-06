import { hashString } from "@/lib/hash";

const MAX_DEGREES = 1.4;

// A tiny fixed rotation per card id — reads as "physically pinned index
// card" rather than a perfectly aligned div. Stable across renders since
// it's derived from the id, not randomness.
export function cardTilt(id: string): number {
  const normalized = (hashString(id) % 200) / 100 - 1; // -1..1
  return normalized * MAX_DEGREES;
}
