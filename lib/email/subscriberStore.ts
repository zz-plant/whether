import { readKvValues, type KvNamespace } from "../runtime/kv";
/**
 * Subscriber storage using Cloudflare KV.
 * Stores individual subscriber records keyed by email
 * and verification/unsubscribe tokens for one-click links.
 *
 * Follows the same KV binding pattern as lib/storage/alertPreferenceRepository.ts.
 */

export type Subscriber = {
  email: string;
  verified: boolean;
  subscribedAt: string;
  token: string;
  active: boolean;
  /**
   * Opt-in to regime-change alert mail, separate from the weekly brief.
   *
   * It lives here rather than in a device-keyed `alert-pref:` record because that
   * keyspace could never route: the browser keys those on a random client UUID, and
   * `resolveRecipientEmail` only accepted a subscriber token — a value that reaches
   * nobody but the subscriber's own inbox. Every record written from the panel was
   * therefore skipped at delivery. Consent belongs where the verified address does.
   *
   * Absent on records written before 2026-09-07; `hydrateSubscriber` reads those as
   * false, so nobody is enrolled by the migration.
   */
  alerts: boolean;
};

export type SubscribeOptions = {
  /** Omitted leaves an existing subscriber's choice alone; a new record defaults to false. */
  alerts?: boolean;
};

type KvNamespaceLike = Omit<KvNamespace, "list"> & { list?: KvNamespace["list"] };

export interface SubscriberStore {
  subscribe(email: string, options?: SubscribeOptions): Promise<Subscriber>;
  unsubscribe(token: string): Promise<boolean>;
  verifyEmail(token: string): Promise<boolean>;
  getActiveSubscriptions(): Promise<string[]>;
  /** Active, verified subscribers. Carries the token, which the unsubscribe link needs. */
  listActiveSubscribers(): Promise<Subscriber[]>;
  /** The subset of those who opted into alert mail. */
  listAlertSubscribers(): Promise<Subscriber[]>;
  getSubscriberByEmail(email: string): Promise<Subscriber | null>;
  getSubscriberByToken(token: string): Promise<Subscriber | null>;
  backendStatus(): "durable" | "local-fallback";
}

const SUB_PREFIX = "email:sub:";
const TOKEN_PREFIX = "email:token:";
const ACTIVE_PREFIX = "email:active:";

const generateToken = (): string => crypto.randomUUID();

const readStoredString = (source: object, key: string): string | undefined => {
  const value: unknown = Reflect.get(source, key);
  return typeof value === "string" ? value : undefined;
};

/** `=== true`, so a missing or non-boolean field reads as false rather than as consent. */
const readStoredFlag = (source: object, key: string): boolean => Reflect.get(source, key) === true;

/**
 * Builds a Subscriber out of a stored record, field by field.
 *
 * Stored records predate the `alerts` field, and every one of them reads as opted out —
 * the migration enrolls nobody. Read rather than asserted because this is JSON out of KV:
 * a record missing an email or a token is no record at all, and `verified` and `active`
 * default to false, so a malformed one cannot become a recipient.
 */
const hydrateSubscriber = (raw: unknown): Subscriber | null => {
  if (typeof raw !== "object" || raw === null) return null;

  const email = readStoredString(raw, "email");
  const token = readStoredString(raw, "token");
  if (!email || !token) return null;

  return {
    email,
    token,
    verified: readStoredFlag(raw, "verified"),
    active: readStoredFlag(raw, "active"),
    subscribedAt: readStoredString(raw, "subscribedAt") ?? new Date().toISOString(),
    alerts: readStoredFlag(raw, "alerts"),
  };
};

const normalizeEmail = (raw: string): string | null => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed.includes("@") || trimmed.length < 5 || trimmed.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return null;
  return trimmed;
};

class KvSubscriberStore implements SubscriberStore {
  private readonly fallback = new InMemorySubscriberStore();

  constructor(private readonly kv: KvNamespaceLike) {}

  async subscribe(email: string, options?: SubscribeOptions): Promise<Subscriber> {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      throw new Error("Invalid email address");
    }

    const existing = await this.getSubscriberByEmail(normalized);
    if (existing) {
      const updated: Subscriber = {
        ...existing,
        active: true,
        subscribedAt: existing.subscribedAt || new Date().toISOString(),
        // An omitted option keeps the standing choice: re-subscribing from a form that
        // does not ask about alerts must not silently switch them off.
        alerts: options?.alerts ?? existing.alerts,
      };
      await this.kv.put(SUB_PREFIX + normalized, JSON.stringify(updated)).catch(() => { /* non-fatal: in-memory fallback already saved */ });
      await this.kv.put(TOKEN_PREFIX + updated.token, normalized).catch(() => { /* non-fatal: token index repaired when KV is available */ });
      if (updated.verified && updated.active) {
        await this.kv.put(ACTIVE_PREFIX + normalized, normalized).catch(() => { /* non-fatal: active index repaired when KV is available */ });
      }
      this.fallback.saveToMemory(updated);
      return updated;
    }

    const token = generateToken();
    const subscriber: Subscriber = {
      email: normalized,
      verified: false,
      subscribedAt: new Date().toISOString(),
      token,
      active: true,
      alerts: options?.alerts === true,
    };

    await this.kv.put(SUB_PREFIX + normalized, JSON.stringify(subscriber)).catch(() => { /* non-fatal: in-memory fallback already saved */ });
    await this.kv.put(TOKEN_PREFIX + token, normalized).catch(() => { /* non-fatal: in-memory fallback already saved */ });
    this.fallback.saveToMemory(subscriber);

    return subscriber;
  }

  async unsubscribe(token: string): Promise<boolean> {
    const email = await this.kv.get(TOKEN_PREFIX + token);
    if (!email) return false;

    const raw = await this.kv.get(SUB_PREFIX + email);
    if (!raw) return false;

    const sub = hydrateSubscriber(JSON.parse(raw));
    if (!sub) return false;
    sub.active = false;
    await this.kv.put(SUB_PREFIX + email, JSON.stringify(sub)).catch(() => { /* non-fatal: in-memory fallback already saved */ });
    await this.kv.delete?.(ACTIVE_PREFIX + email).catch(() => undefined);
    this.fallback.saveToMemory(sub);
    return true;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const email = await this.kv.get(TOKEN_PREFIX + token);
    if (!email) return false;

    const raw = await this.kv.get(SUB_PREFIX + email);
    if (!raw) return false;

    const sub = hydrateSubscriber(JSON.parse(raw));
    if (!sub) return false;
    sub.verified = true;
    await this.kv.put(SUB_PREFIX + email, JSON.stringify(sub)).catch(() => { /* non-fatal: in-memory fallback already saved */ });
    if (sub.active) {
      await this.kv.put(ACTIVE_PREFIX + email, email).catch(() => undefined);
    }
    this.fallback.saveToMemory(sub);
    return true;
  }

  async getActiveSubscriptions(): Promise<string[]> {
    const subscribers = await this.listActiveSubscribers();
    return subscribers.map((sub) => sub.email);
  }

  async listAlertSubscribers(): Promise<Subscriber[]> {
    const subscribers = await this.listActiveSubscribers();
    return subscribers.filter((sub) => sub.alerts);
  }

  async listActiveSubscribers(): Promise<Subscriber[]> {
    if (!this.kv.list) {
      return this.fallback.listActiveSubscribers();
    }

    const subscribers: Subscriber[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.kv.list({ prefix: ACTIVE_PREFIX, cursor, limit: 1000 });
      const candidateEmails = page.keys
        .map((key) => key.name.slice(ACTIVE_PREFIX.length))
        .filter(Boolean);

      /* One bulk read per hundred records. The per-email read this replaced also rewrote
         each subscriber's token and active index keys on every listing — a repair that
         belongs to the single-record read, not to the weekly fan-out. */
      const raws = await readKvValues(this.kv, candidateEmails.map((email) => SUB_PREFIX + email));

      for (const raw of raws) {
        if (!raw) continue;
        let sub: Subscriber | null = null;
        try {
          sub = hydrateSubscriber(JSON.parse(raw));
        } catch {
          continue;
        }
        if (sub?.active && sub.verified) {
          this.fallback.saveToMemory(sub);
          subscribers.push(sub);
        }
      }
      cursor = page.cursor;
      if (page.list_complete) break;
    } while (cursor);

    return subscribers;
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | null> {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const raw = await this.kv.get(SUB_PREFIX + normalized);
    if (raw) {
      const sub = hydrateSubscriber(JSON.parse(raw));
      // A record with no email or token is unusable; fall through to the in-memory copy
      // rather than reindexing junk into the token and active keyspaces.
      if (!sub) return this.fallback.getByEmail(normalized);
      await this.kv.put(TOKEN_PREFIX + sub.token, normalized).catch(() => undefined);
      if (sub.active && sub.verified) {
        await this.kv.put(ACTIVE_PREFIX + normalized, normalized).catch(() => undefined);
      }
      this.fallback.saveToMemory(sub);
      return sub;
    }
    return this.fallback.getByEmail(normalized);
  }

  async getSubscriberByToken(token: string): Promise<Subscriber | null> {
    const email = await this.kv.get(TOKEN_PREFIX + token);
    if (!email) return this.fallback.getByToken(token);
    return this.getSubscriberByEmail(email);
  }

  backendStatus(): "durable" {
    return "durable";
  }
}

class InMemorySubscriberStore implements SubscriberStore {
  private readonly byEmail = new Map<string, Subscriber>();
  private readonly byToken = new Map<string, string>();

  saveToMemory(sub: Subscriber): void {
    this.byEmail.set(sub.email, sub);
    this.byToken.set(sub.token, sub.email);
  }

  getByEmail(email: string): Subscriber | null {
    return this.byEmail.get(email) ?? null;
  }

  getByToken(token: string): Subscriber | null {
    const email = this.byToken.get(token);
    if (!email) return null;
    return this.byEmail.get(email) ?? null;
  }

  async listActiveSubscribers(): Promise<Subscriber[]> {
    const subscribers: Subscriber[] = [];
    for (const sub of this.byEmail.values()) {
      if (sub.active && sub.verified) subscribers.push(sub);
    }
    return subscribers;
  }

  async listAlertSubscribers(): Promise<Subscriber[]> {
    const subscribers = await this.listActiveSubscribers();
    return subscribers.filter((sub) => sub.alerts);
  }

  async subscribe(email: string, options?: SubscribeOptions): Promise<Subscriber> {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new Error("Invalid email address");

    const existing = this.byEmail.get(normalized);
    if (existing) {
      existing.active = true;
      existing.alerts = options?.alerts ?? existing.alerts;
      return existing;
    }

    const token = generateToken();
    const sub: Subscriber = {
      email: normalized,
      verified: false,
      subscribedAt: new Date().toISOString(),
      token,
      active: true,
      alerts: options?.alerts === true,
    };
    this.saveToMemory(sub);
    return sub;
  }

  async unsubscribe(token: string): Promise<boolean> {
    const email = this.byToken.get(token);
    if (!email) return false;
    const sub = this.byEmail.get(email);
    if (!sub) return false;
    sub.active = false;
    return true;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const email = this.byToken.get(token);
    if (!email) return false;
    const sub = this.byEmail.get(email);
    if (!sub) return false;
    sub.verified = true;
    return true;
  }

  async getActiveSubscriptions(): Promise<string[]> {
    const subscribers = await this.listActiveSubscribers();
    return subscribers.map((sub) => sub.email);
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | null> {
    return this.getByEmail(email);
  }

  async getSubscriberByToken(token: string): Promise<Subscriber | null> {
    return this.getByToken(token);
  }

  backendStatus(): "local-fallback" {
    return "local-fallback";
  }
}

const getKvBinding = (): KvNamespaceLike | null => {
  const binding =
    (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV;

  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function") {
    return null;
  }
  return binding;
};

let sharedStore: SubscriberStore | null = null;

export const getSubscriberStore = (): SubscriberStore => {
  if (!sharedStore) {
    const kv = getKvBinding();
    sharedStore = kv ? new KvSubscriberStore(kv) : new InMemorySubscriberStore();
  }
  return sharedStore;
};

export const resetSubscriberStore = (): SubscriberStore => {
  const kv = getKvBinding();
  sharedStore = kv ? new KvSubscriberStore(kv) : new InMemorySubscriberStore();
  return sharedStore;
};
