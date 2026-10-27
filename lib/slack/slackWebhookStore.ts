import { getWhetherKv, parseStoredJson, readKvValues, type KvNamespace } from "../runtime/kv";
import { selectStoreByBinding } from "../runtime/storeSelection";
import { sha256Hex } from "../crypto";
import { isSlackWebhookUrl } from "./deliverSlackBrief";

/* No token. One was minted for `/api/slack/unsubscribe` (deleted 2026-10-27), and no
   screen ever showed it, so no reader could call that route. The off-ramp is the
   webhook: deleting it in Slack makes the next post 404, and `deactivateByUrl` drops
   the subscription. Older records still carry a `token`; hydration ignores it. */
type SlackSubscription = {
  webhookUrl: string;
  channelName?: string;
  teamName?: string;
  active: boolean;
  subscribedAt: string;
};

type SlackSubscribeOptions = {
  channelName?: string;
  teamName?: string;
};

export interface SlackWebhookStore {
  subscribe(webhookUrl: string, options?: SlackSubscribeOptions): Promise<SlackSubscription>;
  deactivateByUrl(webhookUrl: string): Promise<boolean>;
  listActiveWebhooks(): Promise<string[]>;
  listActiveSubscriptions(): Promise<SlackSubscription[]>;
  getSubscriptionByUrl(webhookUrl: string): Promise<SlackSubscription | null>;
  backendStatus(): "durable" | "local-fallback";
}

const SUB_PREFIX = "slack:sub:";
const ACTIVE_PREFIX = "slack:active:";

const hashUrl = (url: string): Promise<string> => sha256Hex(url.trim());

const readStoredString = (source: object, key: string): string | undefined => {
  const value: unknown = Reflect.get(source, key);
  return typeof value === "string" ? value : undefined;
};

const readStoredFlag = (source: object, key: string): boolean => Reflect.get(source, key) === true;

const hydrateSubscription = (raw: unknown): SlackSubscription | null => {
  if (typeof raw !== "object" || raw === null) return null;

  const webhookUrl = readStoredString(raw, "webhookUrl");
  if (!webhookUrl || !isSlackWebhookUrl(webhookUrl)) return null;

  return {
    webhookUrl,
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
      await this.kv.put(ACTIVE_PREFIX + key, key).catch(() => undefined);
      this.fallback.saveToMemory(updated);
      return updated;
    }

    const sub: SlackSubscription = {
      webhookUrl: trimmed,
      channelName: options?.channelName?.trim() || undefined,
      teamName: options?.teamName?.trim() || undefined,
      active: true,
      subscribedAt: new Date().toISOString(),
    };

    await this.kv.put(SUB_PREFIX + key, JSON.stringify(sub)).catch(() => undefined);
    await this.kv.put(ACTIVE_PREFIX + key, key).catch(() => undefined);
    this.fallback.saveToMemory(sub);

    return sub;
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
        const sub = parseStoredJson(raw, hydrateSubscription);
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

  backendStatus(): "durable" {
    return "durable";
  }
}

class InMemorySlackWebhookStore implements SlackWebhookStore {
  private readonly byUrl = new Map<string, SlackSubscription>();

  saveToMemory(sub: SlackSubscription): void {
    this.byUrl.set(sub.webhookUrl, sub);
  }

  getByUrl(url: string): SlackSubscription | null {
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

    const sub: SlackSubscription = {
      webhookUrl: trimmed,
      channelName: options?.channelName?.trim() || undefined,
      teamName: options?.teamName?.trim() || undefined,
      active: true,
      subscribedAt: new Date().toISOString(),
    };
    this.saveToMemory(sub);
    return sub;
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

  backendStatus(): "local-fallback" {
    return "local-fallback";
  }
}

const slackStoreSelection = selectStoreByBinding(
  getWhetherKv,
  (kv): SlackWebhookStore => (kv ? new KvSlackWebhookStore(kv) : new InMemorySlackWebhookStore()),
);

export const getSlackWebhookStore = (): SlackWebhookStore => slackStoreSelection.get();

export const resetSlackWebhookStore = (): SlackWebhookStore => slackStoreSelection.reset();
