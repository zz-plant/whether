type SummaryRange = {
  startYear: number;
  endYear: number;
  isPartial: boolean;
};

const parseYearOverride = (value: string | undefined, label: string) => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be an integer year (received "${value}").`);
  }
  return parsed;
};

export const resolveYearRange = ({
  defaultStartYear,
  defaultEndYear,
  minYear = defaultStartYear,
  maxYear = defaultEndYear,
}: {
  defaultStartYear: number;
  defaultEndYear: number;
  minYear?: number;
  maxYear?: number;
}): SummaryRange => {
  const startYearOverride = parseYearOverride(
    process.env.HISTORY_START_YEAR,
    "HISTORY_START_YEAR"
  );
  const endYearOverride = parseYearOverride(process.env.HISTORY_END_YEAR, "HISTORY_END_YEAR");
  const startYear = startYearOverride ?? defaultStartYear;
  const endYear = endYearOverride ?? defaultEndYear;

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
