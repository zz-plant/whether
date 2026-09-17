/**
 * Where a browser's push subscription is kept, and what is kept of it.
 *
 * Exactly the three fields the push protocol needs to wake that browser — the
 * endpoint the service assigned it, and the two keys the user agent generated —
 * plus the client id that owns it so a reader can unsubscribe the way they
 * subscribed. No email address, no reading, no history of what was sent: the
 * whole record is a routing slip, and /privacy says so.
 *
 * Keyed by client id so re-subscribing replaces rather than accumulates. A
 * browser that re-registers its worker gets a new endpoint for the same id, and
 * without this the old one would sit in the list until the push service 410'd
 * it, which is a notification sent into nothing every time.
 */
import { getWhetherKv } from "../runtime/kv";

const PREFIX = "push:subscription:";

export type StoredPushSubscription = {
  clientId: string;
  endpoint: string;
  /** The user agent's P-256 public key, base64url. */
  p256dh: string;
  auth: string;
  createdAt: string;
};

type PushSubscriptionInput = Omit<StoredPushSubscription, "createdAt">;

const isHttpsEndpoint = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * A subscription this server is willing to store.
 *
 * The endpoint is a URL this server will later make a request to, supplied by
 * whoever calls the route: refusing anything but https keeps an intake for
 * routing slips from doubling as a way to point our own fetches at an arbitrary
 * scheme.
 */
export const parsePushSubscription = (value: unknown, clientId: string): PushSubscriptionInput | null => {
  if (!value || typeof value !== "object") return null;
  const endpoint = Reflect.get(value, "endpoint");
  const keys = Reflect.get(value, "keys");
  if (typeof endpoint !== "string" || !isHttpsEndpoint(endpoint)) return null;
  if (!keys || typeof keys !== "object") return null;

  const p256dh = Reflect.get(keys, "p256dh");
  const auth = Reflect.get(keys, "auth");
  if (typeof p256dh !== "string" || p256dh === "") return null;
  if (typeof auth !== "string" || auth === "") return null;

  return { clientId, endpoint, p256dh, auth };
};

export const savePushSubscription = async (input: PushSubscriptionInput): Promise<boolean> => {
  const kv = getWhetherKv();
  if (!kv) return false;

  const record: StoredPushSubscription = { ...input, createdAt: new Date().toISOString() };
  await kv.put(`${PREFIX}${input.clientId}`, JSON.stringify(record));
  return true;
};

/*
 * `delete` is optional on the KV shape this repo models, because the in-memory
 * doubles do not all carry one. Unsubscribing that silently did nothing would
 * keep sending notifications to someone who asked them to stop, so a store
 * without it reports failure rather than success.
 */
export const deletePushSubscription = async (clientId: string): Promise<boolean> => {
  const kv = getWhetherKv();
  if (!kv?.delete) return false;
  await kv.delete(`${PREFIX}${clientId}`);
  return true;
};

const parseStored = (raw: string | null): StoredPushSubscription | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const clientId = Reflect.get(parsed, "clientId");
    const endpoint = Reflect.get(parsed, "endpoint");
    const p256dh = Reflect.get(parsed, "p256dh");
    const auth = Reflect.get(parsed, "auth");
    const createdAt = Reflect.get(parsed, "createdAt");
    if (typeof clientId !== "string" || typeof endpoint !== "string") return null;
    if (typeof p256dh !== "string" || typeof auth !== "string") return null;
    return { clientId, endpoint, p256dh, auth, createdAt: typeof createdAt === "string" ? createdAt : "" };
  } catch {
    return null;
  }
};

export const readPushSubscription = async (clientId: string): Promise<StoredPushSubscription | null> => {
  const kv = getWhetherKv();
  if (!kv) return null;
  return parseStored(await kv.get(`${PREFIX}${clientId}`));
};

/** Every stored subscription, paged through KV's cursor rather than assuming one page. */
export const listPushSubscriptions = async (): Promise<StoredPushSubscription[]> => {
  const kv = getWhetherKv();
  if (!kv) return [];

  const found: StoredPushSubscription[] = [];
  let cursor: string | undefined;

  do {
    const page = await kv.list({ prefix: PREFIX, cursor });
    for (const key of page.keys) {
      const record = parseStored(await kv.get(key.name));
      if (record) found.push(record);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return found;
};
