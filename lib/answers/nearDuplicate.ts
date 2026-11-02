/**
 * Near-duplicate detection for the answer corpus.
 *
 * The reader-vocabulary and clause-shape tests catch words and sentence shapes;
 * they cannot see two pages that say the same thing in different words. An
 * embedding model would, but it needs a credential and a network call in CI.
 * Token shingles and Jaccard similarity are deterministic, offline, and good
 * enough to catch the failure that matters: a new page that is a paraphrase of
 * a sibling rather than a distinct answer.
 */
const SHINGLE_SIZE = 5;

/** Default similarity at which two enduring bodies count as the same page. */
const NEAR_DUPLICATE_THRESHOLD = 0.62;

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const shingles = (text: string, size = SHINGLE_SIZE): Set<string> => {
  const tokens = tokenize(text);
  const set = new Set<string>();
  for (let index = 0; index + size <= tokens.length; index += 1) {
    set.add(tokens.slice(index, index + size).join(" "));
  }
  /* A body shorter than one shingle is compared as its whole token set. */
  if (set.size === 0) for (const token of tokens) set.add(token);
  return set;
};

export const jaccardSimilarity = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

type NearDuplicatePair = { a: string; b: string; similarity: number };

export const findNearDuplicates = (
  documents: ReadonlyArray<{ id: string; text: string }>,
  threshold = NEAR_DUPLICATE_THRESHOLD,
): NearDuplicatePair[] => {
  const shingled = documents.map((document) => ({ id: document.id, set: shingles(document.text) }));
  const pairs: NearDuplicatePair[] = [];

  for (let i = 0; i < shingled.length; i += 1) {
    for (let j = i + 1; j < shingled.length; j += 1) {
      const similarity = jaccardSimilarity(shingled[i]!.set, shingled[j]!.set);
      if (similarity >= threshold) {
        pairs.push({ a: shingled[i]!.id, b: shingled[j]!.id, similarity });
      }
    }
  }

  return pairs;
};
