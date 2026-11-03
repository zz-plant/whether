type SummaryRange = {
  startYear: number;
  endYear: number;
  isPartial: boolean;
};

/**
 * Which part of the archive a run writes. Empty is the whole archive, which is what the
 * Worker's rebuild always writes; the scripts read the fields from HISTORY_START_YEAR,
 * HISTORY_END_YEAR and HISTORY_WEEKS (`scripts/archiveScope.ts`).
 */
export type ArchiveScope = {
  startYear?: number;
  endYear?: number;
  /** Write only the last N weeks of the weekly archive; the walk still threads every week. */
  historyWeeks?: number;
};

export const resolveYearRange = ({
  defaultStartYear,
  defaultEndYear,
  minYear = defaultStartYear,
  maxYear = defaultEndYear,
  scope = {},
}: {
  defaultStartYear: number;
  defaultEndYear: number;
  minYear?: number;
  maxYear?: number;
  scope?: ArchiveScope;
}): SummaryRange => {
  const startYear = scope.startYear ?? defaultStartYear;
  const endYear = scope.endYear ?? defaultEndYear;

  if (startYear < minYear || startYear > maxYear) {
    throw new Error(
      `HISTORY_START_YEAR must be between ${minYear} and ${maxYear} (received ${startYear}).`
    );
  }
  if (endYear < minYear || endYear > maxYear) {
    throw new Error(
      `HISTORY_END_YEAR must be between ${minYear} and ${maxYear} (received ${endYear}).`
    );
  }
  if (startYear > endYear) {
    throw new Error(
      `HISTORY_START_YEAR (${startYear}) cannot be after HISTORY_END_YEAR (${endYear}).`
    );
  }

  return {
    startYear,
    endYear,
    isPartial: startYear !== defaultStartYear || endYear !== defaultEndYear,
  };
};
