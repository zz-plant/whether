/**
 * The pages the production smoke reads, and the words each must still say.
 *
 * `scripts/prod-synthetic-smoke.mjs` asks them of production after a deploy. The landmark
 * audit (`scripts/check-main-content-landmarks.mjs`) asks them of the worker it serves
 * locally, so the gate fails on the commit that renames a marker instead of the smoke
 * failing on every deploy after it. Until 2026-11-12 only the smoke read them, and a copy
 * change broke it twice: /planning's "decision help" (2026-09-15, found 2026-10-01) and
 * /signals' heading (#1773, 2026-11-07, found 2026-11-12). Each time production was up.
 */
export const SMOKE_PAGE_CHECKS = [
  { path: "/", required: ["weekly brief", "share-ready-artifact", "build this week's plan"] },
  // "Why it changed" is the page's tab and header name since 2026-10-08; the tab
  // that read "Evidence" is gone, so the word is no longer a safe marker. The second
  // marker is `DECISION_CONTRACT_LABELS.watch.flipWatch` (lib/report/reportCopy.ts),
  // the heading over what would move the guidance.
  { path: "/evidence", required: ["why it changed", "what would change our mind"] },
  /* "decision help" was asked of /planning here until 2026-10-01; the page stopped
     rendering it on 2026-09-15, so every run since failed on a page that was up.
     The plan-lines step is what the Monday email and the homepage picker both link
     to. */
  // "weekly plan" was the planning switcher's first tab; the Decide group's tabs
  // replaced it on 2026-10-08.
  { path: "/operate", required: ["decide", "set your own rules"] },
  // Guides took Resolve's direct answers and its toolkit library (2026-10-08).
  { path: "/resources", required: ["more-tools", "toolkit-library"] },
  { path: "/acceptable-use-policy", required: ["acceptable use"] },
  { path: "/terms-of-service", required: ["terms of service"] },
];

/**
 * Fold typographic punctuation to ASCII before comparing markers.
 *
 * The markers above are hand-written with ASCII quotes; the pages render curly
 * ones. On 2026-09-01 the homepage CTA became `Build this week’s plan` (U+2019)
 * while this file still asked for `build this week's plan` (U+0027), and the check
 * reported the marker missing on a page that was rendering it correctly — the one
 * failure mode a post-deploy smoke test cannot afford, because it is indistinguishable
 * from a real outage until someone diffs the bytes.
 *
 * Only quotes are folded. Dashes and ellipses are deliberately left alone: folding
 * widens what counts as a match, and a smoke check earns its keep by being narrow.
 */
const normalizeForMatch = (value) =>
  value
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"');

/** The markers of `check` that `html` does not carry. */
export const missingSmokeMarkers = (html, check) => {
  const page = normalizeForMatch(html);
  return check.required.filter((marker) => !page.includes(normalizeForMatch(marker)));
};
