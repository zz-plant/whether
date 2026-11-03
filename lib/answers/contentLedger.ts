import { z } from "zod";
import ledgerData from "../../content/answers/ledger.json";

/**
 * The append-only record of when each answer's enduring content last changed.
 *
 * `updatedAt` on the page was hand-maintained, and the sitemap bumped weekly
 * whether or not the body moved. This ledger is the source of truth: a review
 * appends a row, and the page's "Answer last reviewed" line and the sitemap's
 * editorial date derive from it. Rows are never edited or deleted; a later
 * `changedAt` for the same slug wins.
 */
const ledgerEntrySchema = z.object({
  slug: z.string().min(1),
  /** ISO date the enduring answer changed. */
  changedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().min(1),
});

const ledgerSchema = z.object({
  answers: z.array(ledgerEntrySchema),
});

type ContentLedgerEntry = z.infer<typeof ledgerEntrySchema>;

export const contentLedger = ledgerSchema.parse(ledgerData);

const latestBySlug = new Map<string, ContentLedgerEntry>();
for (const entry of contentLedger.answers) {
  const current = latestBySlug.get(entry.slug);
  if (!current || entry.changedAt > current.changedAt) latestBySlug.set(entry.slug, entry);
}

export const latestReviewForSlug = (slug: string): ContentLedgerEntry | undefined =>
  latestBySlug.get(slug);

/**
 * The date a page was last reviewed: the ledger's newest row, falling back to
 * the page's own `updatedAt` for a page the ledger does not cover yet.
 */
export const resolveAnswerUpdatedAt = (slug: string, fallback?: string): string | undefined =>
  latestReviewForSlug(slug)?.changedAt ?? fallback;

/** Slugs the ledger names that no answer page serves — a rename or a delete. */
export const orphanedLedgerSlugs = (knownSlugs: readonly string[]): string[] => {
  const known = new Set(knownSlugs);
  return [...latestBySlug.keys()].filter((slug) => !known.has(slug));
};
