export type SummaryProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: string;
};

export type WeeklyStructured = {
  climate: {
    label: string;
    summary: string[];
  };
  recommendedMoves: string[];
  executionPriorities: string[];
  watchouts: string[];
  planningLanguage: string;
  executionConstraints: string[];
};

export type MonthlyStructured = {
  executionConstraints: string[];
  provenance: {
    source: string;
    timestamp: string;
    dataAge: string;
  };
};
