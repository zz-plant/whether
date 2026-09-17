/**
 * The browser's two ends of the decision ledger.
 *
 * `/api/decision-memory` has always required `x-whether-client-id`, which is
 * why it could only ever be called by something that set it deliberately — a
 * CLI, an agent, a curl from the docs. Nothing in the app did, in either
 * direction: the Decision Shield produced a verdict and dropped it, and no page
 * read one back. These are the two calls that close that loop.
 *
 * `fetchImpl` is injectable so the suite can exercise both without a DOM and
 * without the network, which the preloaded guard forbids anyway.
 */
import { CLIENT_ID_HEADER } from "../../lib/api/clientIdHeader";
import { parseDecisionMemoryEntry, type DecisionMemoryEntry, type DecisionMemoryPayload } from "../../lib/decisionMemory";

const LEDGER_ENDPOINT = "/api/decision-memory";

type LedgerFetchResult =
  | { ok: true; entries: DecisionMemoryEntry[] }
  /** `reason` is for the reader, so it names what they can do, not what broke. */
  | { ok: false; reason: string };

type LedgerWriteResult = { ok: true } | { ok: false; reason: string };

type FetchLike = typeof globalThis.fetch;

/*
 * A malformed row is dropped rather than failing the whole read.
 *
 * The ledger is append-only and spans schema versions by design — entries
 * predate the assumption snapshot, and older ones predate `kind`. One
 * unparseable record from an older writer must not take a reader's whole
 * history off the page, so `parseDecisionMemoryEntry` decides per row.
 */
const parseEntries = (value: unknown): DecisionMemoryEntry[] => {
  if (!value || typeof value !== "object") return [];
  const listed = Reflect.get(value, "entries");
  if (!Array.isArray(listed)) return [];

  const entries: DecisionMemoryEntry[] = [];
  for (const candidate of listed) {
    const parsed = parseDecisionMemoryEntry(candidate);
    if (parsed) entries.push(parsed);
  }
  return entries;
};

export const fetchDecisionLedger = async (
  clientId: string,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<LedgerFetchResult> => {
  try {
    const response = await fetchImpl(LEDGER_ENDPOINT, {
      headers: { [CLIENT_ID_HEADER]: clientId },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, reason: "The record could not be read just now. Try again in a moment." };
    }

    return { ok: true, entries: parseEntries(await response.json()) };
  } catch {
    return { ok: false, reason: "The record could not be read just now. Try again in a moment." };
  }
};

export const logDecisionToLedger = async (
  clientId: string,
  payload: DecisionMemoryPayload,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<LedgerWriteResult> => {
  try {
    const response = await fetchImpl(LEDGER_ENDPOINT, {
      method: "POST",
      headers: { [CLIENT_ID_HEADER]: clientId, "content-type": "application/json" },
      body: JSON.stringify({ ...payload, clientId }),
    });

    if (!response.ok) {
      return { ok: false, reason: "That decision was not recorded. Try again in a moment." };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "That decision was not recorded. Try again in a moment." };
  }
};

export type LedgerDownloadFormat = "csv" | "records";

const DOWNLOAD_FILENAMES: Record<LedgerDownloadFormat, string> = {
  csv: "decision-memory.csv",
  records: "decision-memory.records.ndjson",
};

/**
 * Save the ledger to a file the reader keeps.
 *
 * This is a fetch and a blob rather than an `<a href>` for a reason that would
 * have shipped as a dead affordance: the endpoint authorises on
 * `x-whether-client-id`, and a plain link cannot send a header, so a download
 * link would have handed every reader a 401 for their own record. The same
 * constraint is why these are buttons and not links — nothing here is a URL a
 * reader could paste anywhere and have work.
 */
export const downloadDecisionLedger = async (
  clientId: string,
  format: LedgerDownloadFormat,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<LedgerWriteResult> => {
  try {
    const response = await fetchImpl(`${LEDGER_ENDPOINT}?format=${format}`, {
      headers: { [CLIENT_ID_HEADER]: clientId },
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, reason: "That download could not be prepared. Try again in a moment." };
    }

    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = DOWNLOAD_FILENAMES[format];
    anchor.click();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, reason: "That download could not be prepared. Try again in a moment." };
  }
};
