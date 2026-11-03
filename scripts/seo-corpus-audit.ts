/**
 * Structural audit of the answer corpus, independent of traffic.
 *
 * The monthly refresh loop (`docs/seo/refresh-loop.md`) only fires for pages in
 * the top quartile of entrances or CTA conversion. On a young corpus that rule
 * never fires for the pages that most need work, so the corpus can rot while
 * the loop reports nothing to do. This audit runs on a schedule instead and
 * checks the things that do not need traffic data:
 *
 * - distinctness: two pages must not share the same enduring answer;
 * - link depth: each page needs at least two onward links;
 * - depth: each page should carry its own watchouts and questions (warn, not
 *   fail, while older pages are backfilled);
 * - review date: each page should carry an `updatedAt`.
 *
 * Exit code is non-zero only for distinctness or link-depth failures, which are
 * structural defects. Warnings are printed and do not fail the run.
 *
 * Run: `bun run seo:corpus-audit`
 */
import { answerPages } from "../app/answers/decisionPages";
import { latestReviewForSlug, orphanedLedgerSlugs, resolveAnswerUpdatedAt } from "../lib/answers/contentLedger";
import { findNearDuplicates } from "../lib/answers/nearDuplicate";

const MIN_SUPPORTING_LINKS = 2;

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const wordCount = (value: string) => value.split(/\s+/).filter(Boolean).length;

type Row = {
  slug: string;
  enduringWords: number;
  watchouts: number;
  faq: number;
  links: number;
  /** The resolved date the page/sitemap prints (ledger first, page fallback). */
  updatedAt?: string;
  /** The page's own field, for the drift check against the ledger. */
  pageUpdatedAt?: string;
};

const rows: Row[] = answerPages.map((page) => {
  const enduring = [
    page.shortAnswer,
    page.directAnswer,
    page.context,
    page.decisionNote,
    ...page.companyInputs,
    ...(page.watchouts ?? []),
    ...(page.faq ?? []).flatMap((item) => [item.question, item.answer]),
  ].join(" ");
  return {
    slug: page.slug,
    enduringWords: wordCount(enduring),
    watchouts: page.watchouts?.length ?? 0,
    faq: page.faq?.length ?? 0,
    links: page.supportingLinks.length,
    updatedAt: resolveAnswerUpdatedAt(page.slug, page.updatedAt),
    pageUpdatedAt: page.updatedAt,
  };
});

const failures: string[] = [];
const warnings: string[] = [];

/* Distinctness: the same enduring answer on two URLs is a duplicate page. */
const byAnswer = new Map<string, string[]>();
for (const page of answerPages) {
  const key = normalize(`${page.shortAnswer}|${page.directAnswer}`);
  byAnswer.set(key, [...(byAnswer.get(key) ?? []), page.slug]);
}
for (const [key, slugs] of byAnswer) {
  if (slugs.length > 1) failures.push(`duplicate enduring answer: ${slugs.join(", ")} — "${key.slice(0, 60)}…"`);
}

/* Paraphrase-level duplication the exact-match check cannot see. */
const enduringBodies = answerPages.map((page) => ({
  id: page.slug,
  text: [
    page.shortAnswer,
    page.directAnswer,
    page.context,
    page.decisionNote,
    ...page.companyInputs,
    ...(page.watchouts ?? []),
    ...(page.faq ?? []).flatMap((item) => [item.question, item.answer]),
  ].join(" "),
}));
for (const pair of findNearDuplicates(enduringBodies)) {
  failures.push(
    `near-duplicate bodies: ${pair.a} and ${pair.b} (${(pair.similarity * 100).toFixed(0)}% similar)`,
  );
}

for (const row of rows) {
  if (row.links < MIN_SUPPORTING_LINKS) {
    failures.push(`${row.slug}: ${row.links} onward link(s), needs ${MIN_SUPPORTING_LINKS}`);
  }
  if (!row.watchouts) warnings.push(`${row.slug}: no watchouts`);
  if (!row.faq) warnings.push(`${row.slug}: no page-specific questions`);
  if (!row.updatedAt) warnings.push(`${row.slug}: no updatedAt`);

  /* The ledger is the source of truth. A page `updatedAt` that disagrees with it
     means the two were edited apart, and the sitemap would date the page wrong. */
  const ledger = latestReviewForSlug(row.slug);
  if (ledger && row.pageUpdatedAt && ledger.changedAt !== row.pageUpdatedAt) {
    failures.push(`${row.slug}: page updatedAt ${row.pageUpdatedAt} disagrees with ledger ${ledger.changedAt}`);
  }
}

/* A ledger row for a slug no page serves is a rename or delete that was not
   followed through. */
for (const slug of orphanedLedgerSlugs(answerPages.map((page) => page.slug))) {
  failures.push(`ledger names a slug no answer page serves: ${slug}`);
}

const sorted = [...rows].sort((a, b) => a.enduringWords - b.enduringWords);
console.log("Answer corpus audit");
console.log(`${rows.length} pages, ${byAnswer.size} distinct enduring answers`);
console.log("");
console.log("Thinnest pages (enduring words):");
for (const row of sorted.slice(0, 8)) {
  console.log(`  ${String(row.enduringWords).padStart(4)}  ${row.slug}  (watchouts ${row.watchouts}, questions ${row.faq}, links ${row.links})`);
}

if (warnings.length > 0) {
  console.log("");
  console.log("Warnings (backfill during the quarterly review):");
  for (const warning of warnings) console.log(`  - ${warning}`);
}

if (failures.length > 0) {
  console.error("");
  console.error("Failures:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("");
console.log("No structural failures.");
