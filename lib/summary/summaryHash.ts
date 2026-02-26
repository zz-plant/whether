type SummaryHashInput = {
  title: string;
  summary: string;
  regime: string;
  regimeLabel: string;
  guidance: string;
  constraints: string[];
  recordDateLabel: string | null;
  provenance: {
    sourceLabel: string;
    sourceUrl?: string;
  };
};

type StableSummaryPayload = {
  title: string;
  summary: string;
  regime: string;
  regimeLabel: string;
  guidance: string;
  constraints: string[];
  recordDateLabel: string | null;
  provenance: {
    sourceLabel: string;
    sourceUrl?: string;
  };
};

const buildStableSummaryPayload = (summary: SummaryHashInput): StableSummaryPayload => ({
  title: summary.title,
  summary: summary.summary,
  regime: summary.regime,
  regimeLabel: summary.regimeLabel,
  guidance: summary.guidance,
  constraints: summary.constraints,
  recordDateLabel: summary.recordDateLabel,
  provenance: {
    sourceLabel: summary.provenance.sourceLabel,
    sourceUrl: summary.provenance.sourceUrl,
  },
});

const buildDeterministicHash = (value: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const buildSummaryHash = (summary: SummaryHashInput) =>
  buildDeterministicHash(JSON.stringify(buildStableSummaryPayload(summary)));
