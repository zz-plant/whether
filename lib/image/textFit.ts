/**
 * Word-wrap estimates for the generated images.
 *
 * Satori cannot measure text, so a block that wraps further than planned does
 * not push the rest down -- it draws over it. Every card with variable copy
 * sizes and cuts that copy by estimating the wrap first (the weekly card in
 * `app/api/og/reportImageTemplate.tsx`, the brief card in `briefImageTemplate`).
 *
 * The estimate is a greedy word wrap at a per-character width a little above
 * what the faces measure (Plex Serif 600 averages 0.51em on this copy, Plex
 * Sans 0.47em), so it over-counts lines rather than under-counts them: a card
 * that leaves a little air is fine, one that overlaps is not.
 */
export const SERIF_EM = 0.54;
export const SANS_EM = 0.5;

/** The lines `text` wraps to at `fontSize` in `width`, by greedy word wrap. */
export const wrappedLines = (text: string, fontSize: number, width: number, em: number): string[] => {
  const perLine = Math.max(1, Math.floor(width / (fontSize * em)));
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= perLine || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
};

/** `text` cut to `maxLines` at a word, with an ellipsis when anything was cut. */
export const fitLines = (text: string, fontSize: number, width: number, em: number, maxLines: number): string => {
  const lines = wrappedLines(text, fontSize, width, em);
  if (lines.length <= maxLines) return text;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s.,;:\u2014-]+$/, "")}\u2026`;
  return kept.join(" ");
};
