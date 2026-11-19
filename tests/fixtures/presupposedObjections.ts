import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copy that presupposes an objection the reader may not have (2026-11-17). The rule and the
 * ledger of objections visitors actually raised are in docs/objections.md; this is the one list
 * of patterns, and the reader-copy guards apply it: tests/readerVocabulary.test.tsx (routes and
 * share artifacts), tests/readerClauseShapes.test.tsx (descriptions, golden formats, frozen
 * records, llms.txt) and tests/contentVocabulary.test.ts (`content/`, `public/downloads/`).
 *
 * The patterns are the presupposing senses, not the bare words. "It is not a probability" is a
 * disclosure a reader needs and stays; "which renewals are we worried about" is a company's
 * question, not the reader's mind being read, so "worried" counts only with "you" before it.
 */
export const PRESUPPOSING: ReadonlyArray<{ kind: string; pattern: RegExp }> = [
  {
    kind: "mind-reading",
    pattern:
      /\byou (?:might|may|could) (?:be )?(?:wondering|thinking|think|wonder|worry|ask)\b|\b(?:you(?:['’]re| are| might be| may be)|if you['’]re) (?:(?:probably|likely|perhaps) )?(?:thinking|wondering|worried|concerned|skeptical|sceptical)\b|\bbefore you ask\b/i,
  },
  {
    kind: "reassurance",
    pattern: /\b(?:don['’]t|do not|no need to) worry\b|\brest assured\b|\bno catch\b|\bno strings\b|\bno hidden \w+/i,
  },
  {
    kind: "motive denial",
    pattern:
      /\b(?:this|it|whether) (?:is not|isn['’]t) (?:a |an )?(?:sales )?(?:pitch|sales|ad|advert|advertisement)\b|\bwe (?:won['’]t|will not|never|don['’]t|do not) (?:sell|spam|share) (?:you|your)\b|\bnot (?:just )?another\b|\bwe(?:['’]re| are) not (?:trying|here) to\b/i,
  },
  /* "Not a dashboard. A weekly brief." The fragment opener only: "It is not a probability" is a
     data limit the reader needs, and a full sentence that rules a reading out is a disclosure. */
  { kind: "negation opener", pattern: /^not (?:a|an|just|only|another)\b/i },
  { kind: "comparison to an unraised doubt", pattern: /\bunlike (?:other|most|many|typical|traditional|existing|legacy|the rest)\b/i },
  { kind: "unasked self-justification", pattern: /^we (?:don['’]t|do not|never|won['’]t|will not) [^.]*\bbecause\b/i },
];

/**
 * A sentence that answers an objection a visitor raised, with the ledger id it answers.
 * `surface` is the guard's surface name or the content file's path; `text` is part of the
 * sentence. Rendered HTML drops comments and JSON has none, so an allowance lives here rather
 * than as a marker in the copy.
 */
export type ObjectionAllowance = { surface: string; text: string; objection: string };

export const OBJECTION_ALLOWANCES: ObjectionAllowance[] = [];

/** Sentences of visible text: one per line or sentence end, list and heading markers dropped. */
export const sentencesIn = (text: string): string[] =>
  text
    .split(/\n+/)
    .flatMap((line) => line.replace(/^[-*•>#\s]+/, "").split(/(?<=[.!?])\s+(?=[A-Z0-9"“‘'])/))
    .map((sentence) => sentence.trim().replace(/^["“‘']+/, ""))
    .filter(Boolean);

const LEDGER_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "objections.md");

/** The ids in the ledger table: a row whose first cell is a backticked id. */
export const readObjectionLedger = (markdown = readFileSync(LEDGER_PATH, "utf8")): Set<string> =>
  new Set([...markdown.matchAll(/^\|\s*`([a-z0-9][a-z0-9-]*)`\s*\|/gm)].map((match) => match[1]));

const LEDGER = readObjectionLedger();

/**
 * Why a sentence fails the rule, or nothing. A hit passes only when an allowance names the
 * surface, a part of the sentence and an id the ledger has; an allowance naming an unknown id is
 * a failure of its own.
 */
export const presupposedObjections = (
  surface: string,
  sentence: string,
  { allowances = OBJECTION_ALLOWANCES, ledger = LEDGER }: { allowances?: ObjectionAllowance[]; ledger?: Set<string> } = {},
): string[] => {
  const trimmed = sentence.trim();
  const hits = PRESUPPOSING.flatMap(({ kind, pattern }) => {
    const found = pattern.exec(trimmed);
    return found ? [`${kind} "${found[0]}"`] : [];
  });
  if (hits.length === 0) return [];
  const allowance = allowances.find((entry) => entry.surface === surface && trimmed.includes(entry.text));
  if (!allowance) return hits.map((hit) => `presupposes an objection: ${hit} (docs/objections.md)`);
  if (!ledger.has(allowance.objection)) return [`allowance names "${allowance.objection}", which docs/objections.md does not list`];
  return [];
};
