import { readFile, writeFile } from "node:fs/promises";
import { carryUnchangedEntries } from "./carryUnchangedEntries";

type SummaryFileMode = "replace" | "merge";

const readExistingEntries = async <T>(path: string): Promise<T[]> => {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const sortByAsOf = <T extends { asOf: string }>(entries: T[]) => {
  return [...entries].sort(
    (a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime()
  );
};

export const writeSummaryFile = async <T extends { asOf: string }>({
  path,
  entries,
  mode = "replace",
  getKey,
}: {
  path: string;
  entries: T[];
  mode?: SummaryFileMode;
  getKey: (entry: T) => string;
}) => {
  const existing = await readExistingEntries<T>(path);
  let nextEntries = carryUnchangedEntries(existing, entries, getKey);

  if (mode === "merge") {
    const incomingKeys = new Set(entries.map(getKey));
    const merged = existing.filter((entry) => !incomingKeys.has(getKey(entry)));
    nextEntries = [...merged, ...nextEntries];
  }

  const sorted = sortByAsOf(nextEntries);
  await writeFile(path, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
};
