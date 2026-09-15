type CanonicalTimestampSource = "source-ingested-at" | "record-date-midnight" | "request-received-at";

export type DurableLineage = {
  eventId: string;
  sourceVersion: string;
  canonicalTimestampSource: CanonicalTimestampSource;
};

const DEFAULT_SOURCE_VERSION = "whether-v1";

export const buildLineage = (
  canonicalTimestampSource: CanonicalTimestampSource,
  sourceVersion = DEFAULT_SOURCE_VERSION,
): DurableLineage => ({
  eventId: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  sourceVersion,
  canonicalTimestampSource,
});
