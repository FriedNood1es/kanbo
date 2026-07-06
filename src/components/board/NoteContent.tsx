import type { ReactNode } from "react";

// Renders a plain-text note with a small, safe subset of Markdown:
// bullet lists (`-`/`*`), numbered lists (`1.`), **bold**, *italic* / _italic_,
// and `inline code`. Everything is assembled as React elements — the note text
// is never handed to dangerouslySetInnerHTML — so there is no HTML-injection
// surface even though notes are user-authored free text.

// Matches, in priority order: **bold**, __bold__, *italic*, _italic_, `code`.
// The italic alternatives forbid their own delimiter (and newlines) inside so a
// stray `*` doesn't greedily swallow the rest of the line.
const INLINE_PATTERN = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_|`([^`]+)`/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let tokenIndex = 0;
  INLINE_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const key = `${keyPrefix}-${tokenIndex++}`;
    const [bold, boldAlt, italic, italicAlt, code] = [
      match[1],
      match[2],
      match[3],
      match[4],
      match[5],
    ];

    if (bold ?? boldAlt) {
      nodes.push(
        <strong key={key} className="font-semibold text-ink">
          {bold ?? boldAlt}
        </strong>,
      );
    } else if (italic ?? italicAlt) {
      nodes.push(
        <em key={key} className="italic">
          {italic ?? italicAlt}
        </em>,
      );
    } else if (code) {
      nodes.push(
        <code key={key} className="rounded bg-ink/10 px-1 font-mono text-[0.85em]">
          {code}
        </code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

const BULLET = /^\s*[-*]\s+(.*)$/;
const ORDERED = /^\s*\d+\.\s+(.*)$/;

export default function NoteContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let blockKey = 0;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    const para = paragraph;
    const key = blockKey++;
    blocks.push(
      <p key={`p-${key}`} className="break-words">
        {para.map((line, idx) => (
          <span key={idx}>
            {renderInline(line, `p${key}-${idx}`)}
            {idx < para.length - 1 && <br />}
          </span>
        ))}
      </p>,
    );
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    const { ordered, items } = list;
    const key = blockKey++;
    const Tag: "ol" | "ul" = ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={`l-${key}`}
        className={`${ordered ? "list-decimal" : "list-disc"} space-y-0.5 pl-4`}
      >
        {items.map((item, idx) => (
          <li key={idx} className="break-words">
            {renderInline(item, `l${key}-${idx}`)}
          </li>
        ))}
      </Tag>,
    );
    list = null;
  }

  for (const line of lines) {
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = line.match(BULLET);
    const ordered = line.match(ORDERED);

    if (bullet) {
      flushParagraph();
      if (list?.ordered) flushList();
      if (!list) list = { ordered: false, items: [] };
      list.items.push(bullet[1]);
    } else if (ordered) {
      flushParagraph();
      if (list && !list.ordered) flushList();
      if (!list) list = { ordered: true, items: [] };
      list.items.push(ordered[1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushList();

  return <div className="space-y-1.5">{blocks}</div>;
}
