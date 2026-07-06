import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Same visual as src/components/ui/KanboMark.tsx, reimplemented with plain
// divs + literal colors — next/og's renderer (satori) doesn't have access to
// the page's CSS custom properties, and doesn't honor SVG <g transform>
// rotation on nested groups (verified directly: it rendered all three
// groups stacked at an identical, unrotated position). Positional offset
// (not rotation alone) is what actually separates the three cards visually.
const CARD_BG = "#fffdf8";
const INK = "#2b2622";

function MiniCard({
  left,
  top,
  rotate,
  stripe,
}: {
  left: number;
  top: number;
  rotate: number;
  stripe: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        left,
        top,
        width: 14,
        height: 18,
        borderRadius: 3,
        border: `2px solid ${INK}`,
        background: CARD_BG,
        overflow: "hidden",
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div style={{ display: "flex", width: 3.5, height: "100%", background: stripe }} />
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        <MiniCard left={4} top={6} rotate={-14} stripe="#4c8fa6" />
        <MiniCard left={14} top={6} rotate={14} stripe="#4c9a6a" />
        <MiniCard left={9} top={6} rotate={0} stripe="#d9a441" />
      </div>
    ),
    { ...size },
  );
}
