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
import { buildDecisionRecordView, type CurrentConditions, type DecisionRecordView } from "../../lib/report/decisionRecordView";
import { STORAGE_KEYS } from "../../lib/storage/keys";

const LEDGER_ENDPOINT = "/api/decision-memory";

type LedgerFetchResult =
  | { ok: true; entries: DecisionMemoryEntry[] }
  /** `reason` is for the reader, so it names what they can do, not what broke. */
  | { ok: false; reason: string };

type LedgerWriteResult = { ok: true } | { ok: false; reason: string };

type FetchLike = typeof globalThis.fetch;

type LedgerStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Storage can be absent (no window) or throw on access (blocked); either way there is no hint, and nothing else changes. */
const browserStorage = (): LedgerStorage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

/**
 * How many decisions this browser last knew its record to hold; 0 when it has never
 * recorded one, or cannot say.
 *
 * The brief is the busiest route on the site and nearly every browser on it has an id
 * (the alert toggle mints one) and no decisions. Asking the server for an empty ledger on
 * every one of those visits would cost a request each to learn nothing, so the homepage
 * asks this first. It is a hint, not the record: `fetchDecisionLedger` and
 * `logDecisionToLedger` keep it current, and a browser whose hint is missing just does not
 * see the note until it next opens its record.
 */
const readKnownLedgerSize = (clientId: string, storage: LedgerStorage | null = browserStorage()): number => {
  try {
    const stored = Number(storage?.getItem(STORAGE_KEYS.decisionMemory(clientId)));
    return Number.isInteger(stored) && stored > 0 ? stored : 0;
  } catch {
    return 0;
  }
};

const rememberLedgerSize = (clientId: string, size: number, storage: LedgerStorage | null = browserStorage()) => {
  try {
    if (size > 0) storage?.setItem(STORAGE_KEYS.decisionMemory(clientId), String(size));
    else storage?.removeItem(STORAGE_KEYS.decisionMemory(clientId));
  } catch {
    // Storage blocked: the record is unaffected, and the homepage note waits for a browser that keeps it.
  }
};

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
  storage: LedgerStorage | null = browserStorage(),
): Promise<LedgerFetchResult> => {
  try {
    const response = await fetchImpl(LEDGER_ENDPOINT, {
      headers: { [CLIENT_ID_HEADER]: clientId },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, reason: "The record could not be read just now. Try again in a moment." };
    }

    const entries = parseEntries(await response.json());
    rememberLedgerSize(clientId, entries.length, storage);
    return { ok: true, entries };
  } catch {
    return { ok: false, reason: "The record could not be read just now. Try again in a moment." };
  }
};

/*
 * A failed post is stashed and replayed by the service worker's background
 * sync event (public/sw.js, `decision-ledger-retry`), so a decision recorded
 * on a train survives the tunnel. The stash lives in IndexedDB because the
 * service worker has no localStorage. Mirrored in plain JS over there — two
 * small functions, one keying convention, and a comment on each side pointing
 * at the other.
 */
const RETRY_DB_NAME = "whether-ledger-retry";
const RETRY_STORE = "posts";

const openRetryDb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const request = indexedDB.open(RETRY_DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(RETRY_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

/* One entry per stashed write, keyed uniquely: two decisions recorded offline
   are two records, not one overwriting the other. The key rides inside the
   stored value because the service worker replays with getAll, which returns
   values without keys — public/sw.js mirrors this convention. */
const stashValue = (clientId: string, payload: DecisionMemoryPayload) => {
  let key = `${clientId}:${Date.now()}:${Math.random()}`;
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      key = `${clientId}:${crypto.randomUUID()}`;
    }
  } catch {
    // The timestamp-and-random fallback above is unique enough for a queue.
  }
  return { key, clientId, payload };
};

/** What a stashed entry looks like when read back; `key` is absent on entries stashed before it was stored. */
const stashEntryFields = (value: unknown) => {
  if (typeof value !== "object" || value === null) return null;
  const key: unknown = Reflect.get(value, "key");
  const entryClientId: unknown = Reflect.get(value, "clientId");
  return {
    key: typeof key === "string" ? key : null,
    clientId: typeof entryClientId === "string" ? entryClientId : null,
    payload: Reflect.get(value, "payload"),
  };
};

const stashFailedPost = async (clientId: string, payload: DecisionMemoryPayload): Promise<void> => {
  const db = await openRetryDb();
  if (!db) return;
  const entry = stashValue(clientId, payload);
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(RETRY_STORE, "readwrite");
      tx.objectStore(RETRY_STORE).put(entry, entry.key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
};

const clearStashedPost = async (clientId: string, payload: DecisionMemoryPayload): Promise<void> => {
  const db = await openRetryDb();
  if (!db) return;
  /* A successful post clears only the stashed copy of the same decision — the
     re-tap after "that decision was not recorded". Decisions recorded offline
     that differ from this one are separate records and stay queued for the
     service worker's replay. */
  const postedBody = JSON.stringify(payload);
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(RETRY_STORE, "readwrite");
      const cursorRequest = tx.objectStore(RETRY_STORE).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const entry = stashEntryFields(cursor.value);
        if (entry && entry.clientId === clientId && entry.payload && JSON.stringify(entry.payload) === postedBody) {
          cursor.delete();
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
};

/** Register the service worker's sync event for the stashed post, where the platform supports it. */
const requestBackgroundRetry = (): void => {
  try {
    /* A controller means an active service worker owns this page; without one,
       `ready` would wait on a registration that may never come. */
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    if (!sw?.controller) return;
    void sw.ready
      .then((registration) => {
        /* Background Sync is not in the DOM typings; read it off the
           registration through an unknown and narrow by shape, so a browser
           that lacks it skips the registration without a cast. */
        const sync: unknown = Reflect.get(registration, "sync");
        if (sync && typeof sync === "object" && "register" in sync && typeof sync.register === "function") {
          return sync.register("decision-ledger-retry");
        }
        return undefined;
      })
      .catch(() => {
        // No sync support, or the registration was refused: the reader was
        // told the record did not happen and can tap again.
      });
  } catch {
    // Same story, for a browser that throws on the lookup.
  }
};

export const logDecisionToLedger = async (
  clientId: string,
  payload: DecisionMemoryPayload,
  fetchImpl: FetchLike = globalThis.fetch,
  storage: LedgerStorage | null = browserStorage(),
): Promise<LedgerWriteResult> => {
  /* One write at a time per browser, held with the Web Locks API: two tabs on
     the same record could otherwise both post a decision, and the ledger is
     append-only (2026-10-22). Browsers without locks skip the guard — the
     button already disables itself while a write is in flight. */
  const post = async (): Promise<LedgerWriteResult> => {
    try {
      const response = await fetchImpl(LEDGER_ENDPOINT, {
        method: "POST",
        headers: { [CLIENT_ID_HEADER]: clientId, "content-type": "application/json" },
        body: JSON.stringify({ ...payload, clientId }),
      });

      if (!response.ok) {
        return { ok: false, reason: "That decision was not recorded. Try again in a moment." };
      }

      rememberLedgerSize(clientId, readKnownLedgerSize(clientId, storage) + 1, storage);
      await clearStashedPost(clientId, payload);
      return { ok: true };
    } catch {
      /* A network failure is worth one automatic retry: the payload is stashed
         and the service worker's sync event replays it when connectivity
         returns. An HTTP error is not — the server answered, and repeating it
         would just fail again. */
      await stashFailedPost(clientId, payload);
      requestBackgroundRetry();
      return { ok: false, reason: "That decision was not recorded. Try again in a moment." };
    }
  };

  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks?.request) return post();
  try {
    return await locks.request(`whether-decision-ledger:${clientId}`, post);
  } catch {
    return { ok: false, reason: "That decision was not recorded. Try again in a moment." };
  }
};

/**
 * The reader's record against this week's reading, for the homepage: null unless this
 * browser has recorded something, the read worked, and there is at least one row.
 *
 * Every "nothing to say" case is the same null, because the homepage note is an addition
 * to the brief and not part of it: an unreachable ledger must not put an error under the
 * call, and an empty one is not news (`buildDecisionRecordView` says nothing for it).
 */
export const loadRecordNoteView = async (
  clientId: string,
  current: CurrentConditions,
  fetchImpl: FetchLike = globalThis.fetch,
  storage: LedgerStorage | null = browserStorage(),
): Promise<DecisionRecordView | null> => {
  if (readKnownLedgerSize(clientId, storage) === 0) return null;
  const result = await fetchDecisionLedger(clientId, fetchImpl, storage);
  if (!result.ok) return null;
  const view = buildDecisionRecordView(result.entries, current);
  return view.rows.length > 0 ? view : null;
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
