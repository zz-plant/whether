export type CanonicalSignalEntity = "rates" | "spreads" | "labor" | "credit" | "volatility";

export type CanonicalSignalPoint = {
  entity: CanonicalSignalEntity;
  value: number;
  observedAt: string;
  source: string;
};

export type IngestionMode = "stream" | "micro-batch";

const signalBuffer = new Map<CanonicalSignalEntity, CanonicalSignalPoint[]>();

const sortByObservedAt = (items: CanonicalSignalPoint[]) =>
  [...items].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());

export const ingestCanonicalSignals = ({
  mode,
  batch,
}: {
  mode: IngestionMode;
  batch: CanonicalSignalPoint[];
}) => {
  for (const point of batch) {
    const existing = signalBuffer.get(point.entity) ?? [];
    const next = [...existing, point];
    signalBuffer.set(point.entity, sortByObservedAt(next).slice(-96));
  }

  return {
    mode,
    accepted: batch.length,
    updatedEntities: Array.from(new Set(batch.map((point) => point.entity))),
    latest: getLatestCanonicalSignals(),
  };
};

export const getLatestCanonicalSignals = () => {
  return {
    rates: signalBuffer.get("rates")?.at(-1) ?? null,
    spreads: signalBuffer.get("spreads")?.at(-1) ?? null,
    labor: signalBuffer.get("labor")?.at(-1) ?? null,
    credit: signalBuffer.get("credit")?.at(-1) ?? null,
    volatility: signalBuffer.get("volatility")?.at(-1) ?? null,
  };
};
