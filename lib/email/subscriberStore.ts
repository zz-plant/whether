import type { KvNamespace } from "../runtime/kv";
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
};

type KvNamespaceLike = Omit<KvNamespace, "list"> & { list?: KvNamespace["list"] };

export interface SubscriberStore {
  subscribe(email: string): Promise<Subscriber>;
  unsubscribe(token: string): Promise<boolean>;
  verifyEmail(token: string): Promise<boolean>;
  getActiveSubscriptions(): Promise<string[]>;
  getSubscriberByEmail(email: string): Promise<Subscriber | null>;
  getSubscriberByToken(token: string): Promise<Subscriber | null>;
  backendStatus(): "durable" | "local-fallback";
}

const SUB_PREFIX = "email:sub:";
const TOKEN_PREFIX = "email:token:";
const ACTIVE_PREFIX = "email:active:";

/** Bound on concurrent KV reads while scanning the subscriber list. */
const SUBSCRIBER_READ_CONCURRENCY = 32;

const generateToken = (): string => crypto.randomUUID();

const normalizeEmail = (raw: string): string | null => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed.includes("@") || trimmed.length < 5 || trimmed.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return null;
  return trimmed;
};

class KvSubscriberStore implements SubscriberStore {
  private readonly fallback = new InMemorySubscriberStore();

  constructor(private readonly kv: KvNamespaceLike) {}

  async subscribe(email: string): Promise<Subscriber> {
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

    const sub: Subscriber = JSON.parse(raw);
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

    const sub: Subscriber = JSON.parse(raw);
    sub.verified = true;
    await this.kv.put(SUB_PREFIX + email, JSON.stringify(sub)).catch(() => { /* non-fatal: in-memory fallback already saved */ });
    if (sub.active) {
      await this.kv.put(ACTIVE_PREFIX + email, email).catch(() => undefined);
    }
    this.fallback.saveToMemory(sub);
    return true;
  }

  async getActiveSubscriptions(): Promise<string[]> {
    if (!this.kv.list) {
      return this.fallback.listActive();
    }

    const emails: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.kv.list({ prefix: ACTIVE_PREFIX, cursor, limit: 1000 });
      const candidateEmails = page.keys
        .map((key) => key.name.slice(ACTIVE_PREFIX.length))
        .filter(Boolean);

      // Batched rather than one Promise.all over the whole page: a full page is 1000 keys,
      // and Workers caps simultaneous subrequests well below that.
      for (let offset = 0; offset < candidateEmails.length; offset += SUBSCRIBER_READ_CONCURRENCY) {
        const batch = candidateEmails.slice(offset, offset + SUBSCRIBER_READ_CONCURRENCY);
        const subs = await Promise.all(batch.map((email) => this.getSubscriberByEmail(email)));

        for (const sub of subs) {
          if (sub?.active && sub.verified) {
            emails.push(sub.email);
          }
        }
      }
      cursor = page.cursor;
      if (page.list_complete) break;
    } while (cursor);

    return emails;
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | null> {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const raw = await this.kv.get(SUB_PREFIX + normalized);
    if (raw) {
      const sub = JSON.parse(raw) as Subscriber;
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

  listActive(): string[] {
    const emails: string[] = [];
    for (const [email, sub] of this.byEmail) {
      if (sub.active && sub.verified) emails.push(email);
    }
    return emails;
  }

  async subscribe(email: string): Promise<Subscriber> {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new Error("Invalid email address");

    const existing = this.byEmail.get(normalized);
    if (existing) {
      existing.active = true;
      return existing;
    }

    const token = generateToken();
    const sub: Subscriber = {
      email: normalized,
      verified: false,
      subscribedAt: new Date().toISOString(),
      token,
      active: true,
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
    return this.listActive();
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
