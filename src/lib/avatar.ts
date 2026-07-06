import { hashString } from "@/lib/hash";

// A small fixed palette (not random HSL) so avatar colors stay within the
// warm, muted feel of the rest of the palette instead of clashing with it.
const avatarPalette = [
  "#4C8FA6", // steel blue
  "#4C9A6A", // green
  "#D9A441", // amber
  "#8C6E96", // plum
  "#4C9A93", // teal
  "#B98B3D", // mustard
  "#7A8C4C", // olive
  "#B5786F", // dusty rose
];

export function avatarColor(name: string): string {
  return avatarPalette[hashString(name) % avatarPalette.length];
}

export function avatarInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
