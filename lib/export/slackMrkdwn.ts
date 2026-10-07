/**
 * Slack's message markup, read for display — the subset the brief's chat formats
 * write (`formatBriefArtifact(document, "slack")`): `*bold*`, `_italic_`, a `>`
 * quote line, and bare `http(s)` URLs, which Slack links on its own.
 *
 * `/share` previewed the Slack post as its raw markup in a monospace block —
 * asterisks, `> •` prefixes and all — which is the text a reader copies but not
 * what anyone in the channel sees. This turns the same text into blocks the
 * page can draw as Slack draws them. It returns data, never markup: the
 * component builds React nodes from it, so nothing here is ever parsed as HTML,
 * and a link is only ever an `http(s)` URL taken whole from the text.
 *
 * Deliberately small. Anything it does not recognise stays text, exactly as
 * typed, which is the honest failure for a preview: it shows the characters.
 */

export type SlackInline =
  | { kind: "text" | "bold" | "italic"; text: string }
  | { kind: "link"; href: string };

/** Consecutive lines that are all quoted or all not; Slack draws one bar per quoted run. */
export type SlackBlock = { quote: boolean; lines: SlackInline[][] };

/*
 * A URL runs to the next space or angle bracket and does not take trailing
 * sentence punctuation. Emphasis needs a boundary on both sides and a non-space
 * just inside each marker, as Slack's does, so "5 * 3" and snake_case stay text.
 */
const INLINE_PATTERN =
  /(https?:\/\/[^\s<>]*[^\s<>.,;:!?)\]'"])|(?<=^|[\s(])\*(?=\S)([^*\n]*?\S)\*(?=$|[\s.,;:!?)])|(?<=^|[\s(])_(?=\S)([^_\n]*?\S)_(?=$|[\s.,;:!?)])/g;

const parseInline = (line: string): SlackInline[] => {
  const inlines: SlackInline[] = [];
  let cursor = 0;
  for (const match of line.matchAll(INLINE_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) inlines.push({ kind: "text", text: line.slice(cursor, start) });
    const [whole, url, bold, italic] = match;
    if (url) inlines.push({ kind: "link", href: url });
    else if (bold) inlines.push({ kind: "bold", text: bold });
    else if (italic) inlines.push({ kind: "italic", text: italic });
    cursor = start + whole.length;
  }
  if (cursor < line.length) inlines.push({ kind: "text", text: line.slice(cursor) });
  return inlines;
};

const QUOTE_PREFIX = /^>\s?/;

export const parseSlackMrkdwn = (text: string): SlackBlock[] => {
  const blocks: SlackBlock[] = [];
  for (const raw of text.split("\n")) {
    const quote = QUOTE_PREFIX.test(raw);
    const inlines = parseInline(quote ? raw.replace(QUOTE_PREFIX, "") : raw);
    const last = blocks.at(-1);
    if (last && last.quote === quote) last.lines.push(inlines);
    else blocks.push({ quote, lines: [inlines] });
  }
  return blocks;
};

/**
 * Whether Slack would draw the text differently from how it reads as typed — a
 * quote bar or emphasis. Links do not count: they read the same either way. The
 * preview offers the raw text beside the drawing only when the two differ.
 */
export const slackMrkdwnHasFormatting = (blocks: readonly SlackBlock[]): boolean =>
  blocks.some(
    (block) => block.quote || block.lines.some((line) => line.some((inline) => inline.kind === "bold" || inline.kind === "italic")),
  );
