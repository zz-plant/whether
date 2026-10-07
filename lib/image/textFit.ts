/**
 * Word-wrap estimates for the generated images.
 *
 * Satori cannot measure text, so a block that wraps further than planned does
 * not push the rest down -- it draws over it. Every card with variable copy
 * sizes and cuts that copy by estimating the wrap first (the weekly card in
 * `app/api/og/reportImageTemplate.tsx`, the brief card in `briefImageTemplate`).
 *
 * The estimate is a greedy word wrap at a per-character width a little above
 * what the faces measure on this copy (Archivo semi-condensed 700, the call's
 * face, averages 0.42em; Archivo 400 and 600 average 0.44 and 0.45em), so it
 * over-counts lines rather than under-counts them: a card that leaves a little
 * air is fine, one that overlaps is not. Re-measure when a face changes:
 * scripts/generate-og-fonts.mjs writes the instances these were taken from.
 */
export const DISPLAY_EM = 0.45;
export const SANS_EM = 0.49;

/**
 * Characters a full em wide, counted as two. An average cannot absorb them:
 * → ← ↔ advance 1000 units of 1000 in every card face, and — and ‰ about the
 * same in the text faces (— is 875 in the call's semi-condensed face). Counted
 * at the average, a run of them measures under half its drawn width, and since
 * 2026-10-07 the cards print the arrow as itself instead of "->". Letters stay
 * in the average they were measured in.
 */
const WIDE = /[\u2190\u2192\u2194\u2014\u2030]/g;
const measure = (text: string): number => text.length + (text.match(WIDE)?.length ?? 0);

/** The lines `text` wraps to at `fontSize` in `width`, by greedy word wrap. */
export const wrappedLines = (text: string, fontSize: number, width: number, em: number): string[] => {
  const perLine = Math.max(1, Math.floor(width / (fontSize * em)));
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (measure(next) <= perLine || !current) {
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
