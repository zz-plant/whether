type SourceLineInput = {
  sourceLabel: string;
  sourceUrl?: string;
};

export const formatSourceLine = ({ sourceLabel, sourceUrl }: SourceLineInput) =>
  sourceUrl ? `${sourceLabel} (${sourceUrl})` : sourceLabel;

export const parseIsoDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
};

export const formatQuarterLabel = (value: string) => {
  const date = parseIsoDateLabel(value);
  if (!date) {
    return null;
  }

  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${year}`;
};

export const formatYearLabel = (value: string) => {
  const date = parseIsoDateLabel(value);
  if (!date) {
    return null;
  }

  return String(date.getUTCFullYear());
};
