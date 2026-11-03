/**
 * Every archive run stamps each period with the run's fetch time, so a run that
 * brings no new data still rewrites every record. An incoming entry that differs
 * from the stored one only by those stamps is the stored entry: keep it, so the
 * diff a refresh produces is the data that changed.
 *
 * The stored entries are whatever the file held, read as loosely as the key needs,
 * so their type may differ from the incoming one; a kept entry is the stored value
 * as it was read, which is what keeps its bytes.
 */
const RUN_STAMP_PATTERNS = [
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g,
  /[A-Z][a-z]{2} \d{1,2}, \d{4}(?:,| at) \d{1,2}:\d{2}[\s ]?[AP]M/g,
  /\b\d+h\./g,
];

const withoutRunStamps = (entry: unknown) =>
  RUN_STAMP_PATTERNS.reduce((text, pattern) => text.replace(pattern, ""), JSON.stringify(entry));

export const carryUnchangedEntries = <Stored, Incoming>(
  existing: readonly Stored[],
  incoming: readonly Incoming[],
  getKey: (entry: Stored | Incoming) => string,
): (Stored | Incoming)[] => {
  const stored = new Map(existing.map((entry) => [getKey(entry), entry]));
  return incoming.map((entry) => {
    const previous = stored.get(getKey(entry));
    return previous !== undefined && withoutRunStamps(previous) === withoutRunStamps(entry) ? previous : entry;
  });
};
