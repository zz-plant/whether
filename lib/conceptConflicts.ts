import conflictData from "../data/concept_conflicts.json";
import { findProductConceptArticle } from "./productCanon";
import type { RegimeKey } from "./regimeEngine";

export type ConceptConflict = {
  id: string;
  leftSlug: string;
  rightSlug: string;
  conflict: string;
  winnerByRegime: Record<RegimeKey, string>;
};

const conflicts = conflictData as ConceptConflict[];

export const getConceptConflicts = () => {
  return conflicts
    .map((entry) => {
      const left = findProductConceptArticle(entry.leftSlug);
      const right = findProductConceptArticle(entry.rightSlug);
      if (!left || !right) {
        return null;
      }
      return { ...entry, left, right };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
};
