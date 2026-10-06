import { getWhetherKv, readKvValues, type KvNamespace } from "../runtime/kv";
import { isSlackWebhookUrl } from "./deliverSlackBrief";

type SlackSubscription = {
  webhookUrl: string;
  channelName?: string;
  teamName?: string;
  token: string;
  active: boolean;
  subscribedAt: string;
};

type SlackSubscribeOptions = {
  channelName?: string;
  teamName?: string;
};

export interface SlackWebhookStore {
  subscribe(webhookUrl: string, options?: SlackSubscribeOptions): Promise<SlackSubscription>;
  unsubscribe(token: string): Promise<boolean>;
  deactivateByUrl(webhookUrl: string): Promise<boolean>;
  listActiveWebhooks(): Promise<string[]>;
  listActiveSubscriptions(): Promise<SlackSubscription[]>;
  getSubscriptionByToken(token: string): Promise<SlackSubscription | null>;
  getSubscriptionByUrl(webhookUrl: string): Promise<SlackSubscription | null>;
  backendStatus(): "durable" | "local-fallback";
}

const SUB_PREFIX = "slack:sub:";
const TOKEN_PREFIX = "slack:token:";
const ACTIVE_PREFIX = "slack:active:";

const generateToken = (): string => crypto.randomUUID();

const hashUrl = async (url: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(url.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const readStoredString = (source: object, key: string): string | undefined => {
  const value: unknown = Reflect.get(source, key);
  return typeof value === "string" ? value : undefined;
};

const readStoredFlag = (source: object, key: string): boolean => Reflect.get(source, key) === true;

const hydrateSubscription = (raw: unknown): SlackSubscription | null => {
  if (typeof raw !== "object" || raw === null) return null;

  const webhookUrl = readStoredString(raw, "webhookUrl");
  const token = readStoredString(raw, "token");
  if (!webhookUrl || !token || !isSlackWebhookUrl(webhookUrl)) return null;

  return {
    webhookUrl,
    token,
    channelName: readStoredString(raw, "channelName"),
    teamName: readStoredString(raw, "teamName"),
    active: readStoredFlag(raw, "active"),
    subscribedAt: readStoredString(raw, "subscribedAt") ?? new Date().toISOString(),
  };
};

class KvSlackWebhookStore implements SlackWebhookStore {
  private readonly fallback = new InMemorySlackWebhookStore();

  constructor(private readonly kv: KvNamespace) {}

  async subscribe(webhookUrl: string, options?: SlackSubscribeOptions): Promise<SlackSubscription> {
    const trimmed = webhookUrl.trim();
    if (!isSlackWebhookUrl(trimmed)) {
      throw new Error("Invalid Slack webhook URL");
    }

    const key = await hashUrl(trimmed);
    const existing = await this.getSubscriptionByUrl(trimmed);
    if (existing) {
      const updated: SlackSubscription = {
        ...existing,
        active: true,
        channelName: options?.channelName ?? existing.channelName,
        teamName: options?.teamName ?? existing.teamName,
        subscribedAt: existing.subscribedAt || new Date().toISOString(),
      };
      await this.kv.put(SUB_PREFIX + key, JSON.stringify(updated)).catch(() => undefined);
      await this.kv.put(TOKEN_PREFIX + updated.token, key).catch(() => undefined);
      await this.kv.put(ACTIVE_PREFIX + key, key).catch(() => undefined);
      this.fallback.saveToMemory(updated);
      return updated;
    }

    const token = generateToken();
    const sub: SlackSubscription = {
      webhookUrl: trimmed,
      token,
      channelName: options?.channelName?.trim() || undefined,
      teamName: options?.teamName?.trim() || undefined,
      active: true,
      subscribedAt: new Date().toISOString(),
    };

    await this.kv.put(SUB_PREFIX + key, JSON.stringify(sub)).catch(() => undefined);
    await this.kv.put(TOKEN_PREFIX + token, key).catch(() => undefined);
    await this.kv.put(ACTIVE_PREFIX + key, key).catch(() => undefined);
    this.fallback.saveToMemory(sub);

    return sub;
  }

  async unsubscribe(token: string): Promise<boolean> {
    const key = await this.kv.get(TOKEN_PREFIX + token);
    if (!key) return false;

    const raw = await this.kv.get(SUB_PREFIX + key);
    if (!raw) return false;

    const sub = hydrateSubscription(JSON.parse(raw));
    if (!sub) return false;
    sub.active = false;

    await this.kv.put(SUB_PREFIX + key, JSON.stringify(sub)).catch(() => undefined);
    await this.kv.delete?.(ACTIVE_PREFIX + key).catch(() => undefined);
    this.fallback.saveToMemory(sub);
    return true;
  }

  async deactivateByUrl(webhookUrl: string): Promise<boolean> {
    const key = await hashUrl(webhookUrl);
    const raw = await this.kv.get(SUB_PREFIX + key);
    if (!raw) return false;

    const sub = hydrateSubscription(JSON.parse(raw));
    if (!sub) return false;
    sub.active = false;

    await this.kv.put(SUB_PREFIX + key, JSON.stringify(sub)).catch(() => undefined);
    await this.kv.delete?.(ACTIVE_PREFIX + key).catch(() => undefined);
    this.fallback.saveToMemory(sub);
    return true;
  }

  async listActiveWebhooks(): Promise<string[]> {
    const subscriptions = await this.listActiveSubscriptions();
    return subscriptions.map((sub) => sub.webhookUrl);
  }

  async listActiveSubscriptions(): Promise<SlackSubscription[]> {
    const subscriptions: SlackSubscription[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.kv.list({ prefix: ACTIVE_PREFIX, cursor, limit: 1000 });
      const candidateKeys = page.keys
        .map((k) => k.name.slice(ACTIVE_PREFIX.length))
        .filter(Boolean);

      const raws = await readKvValues(this.kv, candidateKeys.map((k) => SUB_PREFIX + k));

      for (const raw of raws) {
        if (!raw) continue;
        let sub: SlackSubscription | null = null;
        try {
          sub = hydrateSubscription(JSON.parse(raw));
        } catch {
          continue;
        }
        if (sub?.active) {
          this.fallback.saveToMemory(sub);
          subscriptions.push(sub);
        }
      }
      cursor = page.cursor;
      if (page.list_complete) break;
    } while (cursor);

    return subscriptions;
  }

  async getSubscriptionByUrl(webhookUrl: string): Promise<SlackSubscription | null> {
    const key = await hashUrl(webhookUrl);
    const raw = await this.kv.get(SUB_PREFIX + key);
    if (raw) {
      const sub = hydrateSubscription(JSON.parse(raw));
      if (!sub) return this.fallback.getByUrl(webhookUrl);
      this.fallback.saveToMemory(sub);
      return sub;
    }
    return this.fallback.getByUrl(webhookUrl);
  }

  async getSubscriptionByToken(token: string): Promise<SlackSubscription | null> {
    const key = await this.kv.get(TOKEN_PREFIX + token);
    if (!key) return this.fallback.getByToken(token);
    const raw = await this.kv.get(SUB_PREFIX + key);
    if (raw) {
      const sub = hydrateSubscription(JSON.parse(raw));
      if (!sub) return this.fallback.getByToken(token);
      this.fallback.saveToMemory(sub);
      return sub;
    }
    return this.fallback.getByToken(token);
  }

  backendStatus(): "durable" {
    return "durable";
  }
}

class InMemorySlackWebhookStore implements SlackWebhookStore {
  private readonly byUrl = new Map<string, SlackSubscription>();
  private readonly byToken = new Map<string, string>();

  saveToMemory(sub: SlackSubscription): void {
    this.byUrl.set(sub.webhookUrl, sub);
    this.byToken.set(sub.token, sub.webhookUrl);
  }

  getByUrl(url: string): SlackSubscription | null {
    return this.byUrl.get(url) ?? null;
  }

  getByToken(token: string): SlackSubscription | null {
    const url = this.byToken.get(token);
    if (!url) return null;
    return this.byUrl.get(url) ?? null;
  }

  async listActiveWebhooks(): Promise<string[]> {
    const subs = await this.listActiveSubscriptions();
    return subs.map((s) => s.webhookUrl);
  }

  async listActiveSubscriptions(): Promise<SlackSubscription[]> {
    const active: SlackSubscription[] = [];
    for (const sub of this.byUrl.values()) {
      if (sub.active) active.push(sub);
    }
    return active;
  }

  async subscribe(webhookUrl: string, options?: SlackSubscribeOptions): Promise<SlackSubscription> {
    const trimmed = webhookUrl.trim();
    if (!isSlackWebhookUrl(trimmed)) throw new Error("Invalid Slack webhook URL");

    const existing = this.byUrl.get(trimmed);
    if (existing) {
      existing.active = true;
      existing.channelName = options?.channelName ?? existing.channelName;
      existing.teamName = options?.teamName ?? existing.teamName;
      return existing;
    }

    const token = generateToken();
    const sub: SlackSubscription = {
      webhookUrl: trimmed,
      token,
      channelName: options?.channelName?.trim() || undefined,
      teamName: options?.teamName?.trim() || undefined,
      active: true,
      subscribedAt: new Date().toISOString(),
    };
    this.saveToMemory(sub);
    return sub;
  }

  async unsubscribe(token: string): Promise<boolean> {
    const url = this.byToken.get(token);
    if (!url) return false;
    const sub = this.byUrl.get(url);
    if (!sub) return false;
    sub.active = false;
    return true;
  }

  async deactivateByUrl(webhookUrl: string): Promise<boolean> {
    const sub = this.byUrl.get(webhookUrl);
    if (!sub) return false;
    sub.active = false;
    return true;
  }

  async getSubscriptionByUrl(webhookUrl: string): Promise<SlackSubscription | null> {
    return this.getByUrl(webhookUrl);
  }

  async getSubscriptionByToken(token: string): Promise<SlackSubscription | null> {
    return this.getByToken(token);
  }

  backendStatus(): "local-fallback" {
    return "local-fallback";
  }
}

let sharedSlackStore: SlackWebhookStore | null = null;

export const getSlackWebhookStore = (): SlackWebhookStore => {
  if (!sharedSlackStore) {
    const kv = getWhetherKv();
    sharedSlackStore = kv ? new KvSlackWebhookStore(kv) : new InMemorySlackWebhookStore();
  }
  return sharedSlackStore;
};

export const resetSlackWebhookStore = (): SlackWebhookStore => {
  const kv = getWhetherKv();
  sharedSlackStore = kv ? new KvSlackWebhookStore(kv) : new InMemorySlackWebhookStore();
  return sharedSlackStore;
};
