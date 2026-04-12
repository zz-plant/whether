import type { AlertDeliveryEvent, RegimeAlertEvent } from "../signalOps";
import { buildLineage } from "./lineage";

type Cursor = string | null;

type KvListResult = { keys: Array<{ name: string }>; list_complete: boolean; cursor?: string };
type KvNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<KvListResult>;
};

export interface RegimeAlertRepository {
  appendAlert(event: RegimeAlertEvent): Promise<void>;
  listAlerts(options?: { cursor?: Cursor; limit?: number }): Promise<{ alerts: RegimeAlertEvent[]; nextCursor: Cursor }>;
  latestAlert(): Promise<RegimeAlertEvent | null>;
  appendDelivery(event: AlertDeliveryEvent): Promise<void>;
  listDeliveries(options?: { cursor?: Cursor; limit?: number; clientId?: string }): Promise<{ deliveries: AlertDeliveryEvent[]; nextCursor: Cursor }>;
  backendStatus(): "durable" | "local-fallback";
}

const ALERT_PREFIX = "regime-alert:";
const ALERT_INDEX_KEY = "regime-alert:index";
const DELIVERY_PREFIX = "regime-alert-delivery:";
const DELIVERY_INDEX_KEY = "regime-alert-delivery:index";

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const parseCursor = (cursor: Cursor) => {
  if (!cursor) return -1;
  const parsed = Number.parseInt(cursor, 10);
  return Number.isNaN(parsed) ? -1 : parsed;
};

const toKey = (prefix: string, index: number) => `${prefix}${String(index).padStart(12, "0")}`;
const parseIndex = (prefix: string, key: string) => {
  if (!key.startsWith(prefix)) return null;
  const parsed = Number.parseInt(key.slice(prefix.length), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

class InMemoryRegimeAlertRepository implements RegimeAlertRepository {
  private readonly alerts: RegimeAlertEvent[] = [];
  private readonly deliveries: AlertDeliveryEvent[] = [];

  async appendAlert(event: RegimeAlertEvent) {
    this.alerts.unshift(clone(event));
    this.alerts.splice(64);
  }

  async listAlerts(options?: { cursor?: Cursor; limit?: number }) {
    const cursor = options?.cursor ?? null;
    const limit = options?.limit ?? 64;
    const threshold = parseCursor(cursor);
    const ascending = [...this.alerts].reverse();
    const from = ascending.slice(Math.max(0, threshold + 1), Math.max(0, threshold + 1) + limit);
    const alerts = from.reverse().map((event) => clone(event));
    const nextCursor = alerts.length > 0 ? `${threshold + alerts.length}` : cursor;
    return { alerts, nextCursor };
  }

  async latestAlert() {
    return clone(this.alerts[0] ?? null);
  }

  async appendDelivery(event: AlertDeliveryEvent) {
    this.deliveries.unshift(clone(event));
    this.deliveries.splice(128);
  }

  async listDeliveries(options?: { cursor?: Cursor; limit?: number; clientId?: string }) {
    const cursor = options?.cursor ?? null;
    const limit = options?.limit ?? 128;
    const threshold = parseCursor(cursor);
    const filtered = options?.clientId
      ? this.deliveries.filter((event) => event.clientId === options.clientId)
      : this.deliveries;
    const ascending = [...filtered].reverse();
    const from = ascending.slice(Math.max(0, threshold + 1), Math.max(0, threshold + 1) + limit);
    const deliveries = from.reverse().map((event) => clone(event));
    const nextCursor = deliveries.length > 0 ? `${threshold + deliveries.length}` : cursor;
    return { deliveries, nextCursor };
  }

  backendStatus() {
    return "local-fallback" as const;
  }
}

class KvRegimeAlertRepository implements RegimeAlertRepository {
  private readonly fallback = new InMemoryRegimeAlertRepository();
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly kv: KvNamespaceLike) {}

  async appendAlert(event: RegimeAlertEvent) {
    await this.fallback.appendAlert(event);
    this.queue = this.queue.then(async () => {
      const currentRaw = await this.kv.get(ALERT_INDEX_KEY);
      const current = currentRaw ? Number.parseInt(currentRaw, 10) : -1;
      const next = Number.isNaN(current) ? 0 : current + 1;
      await this.kv.put(toKey(ALERT_PREFIX, next), JSON.stringify(event));
      await this.kv.put(ALERT_INDEX_KEY, String(next));
    }).catch(() => undefined);
    await this.queue;
  }

  async listAlerts(options?: { cursor?: Cursor; limit?: number }) {
    await this.queue;
    return this.listFromKv<RegimeAlertEvent>(ALERT_PREFIX, options?.cursor ?? null, options?.limit ?? 64).then((result) => ({
      alerts: result.items,
      nextCursor: result.nextCursor,
    }));
  }

  async latestAlert() {
    await this.queue;
    const currentRaw = await this.kv.get(ALERT_INDEX_KEY);
    const current = currentRaw ? Number.parseInt(currentRaw, 10) : -1;
    if (current < 0 || Number.isNaN(current)) {
      return null;
    }
    const raw = await this.kv.get(toKey(ALERT_PREFIX, current));
    return raw ? (JSON.parse(raw) as RegimeAlertEvent) : null;
  }

  async appendDelivery(event: AlertDeliveryEvent) {
    await this.fallback.appendDelivery(event);
    this.queue = this.queue.then(async () => {
      const currentRaw = await this.kv.get(DELIVERY_INDEX_KEY);
      const current = currentRaw ? Number.parseInt(currentRaw, 10) : -1;
      const next = Number.isNaN(current) ? 0 : current + 1;
      await this.kv.put(toKey(DELIVERY_PREFIX, next), JSON.stringify(event));
      await this.kv.put(DELIVERY_INDEX_KEY, String(next));
    }).catch(() => undefined);
    await this.queue;
  }

  async listDeliveries(options?: { cursor?: Cursor; limit?: number; clientId?: string }) {
    await this.queue;
    return this.listFromKv<AlertDeliveryEvent>(DELIVERY_PREFIX, options?.cursor ?? null, options?.limit ?? 128, (item) =>
      options?.clientId ? item.clientId === options.clientId : true,
    ).then((result) => ({
      deliveries: result.items,
      nextCursor: result.nextCursor,
    }));
  }

  backendStatus() {
    return "durable" as const;
  }

  private async listFromKv<T>(prefix: string, cursor: Cursor, limit: number, predicate?: (item: T) => boolean) {
    const threshold = parseCursor(cursor);
    const collected: Array<{ index: number; item: T }> = [];
    let listCursor: string | undefined;

    do {
      const page = await this.kv.list({ prefix, cursor: listCursor, limit: 1000 });
      for (const key of page.keys) {
        const index = parseIndex(prefix, key.name);
        if (index === null || index <= threshold) {
          continue;
        }
        const raw = await this.kv.get(key.name);
        if (!raw) {
          continue;
        }
        const item = JSON.parse(raw) as T;
        if (predicate && !predicate(item)) {
          continue;
        }
        collected.push({ index, item });
      }
      listCursor = page.cursor;
      if (page.list_complete) break;
    } while (listCursor);

    collected.sort((a, b) => a.index - b.index);
    const limited = collected.slice(0, limit);
    return {
      items: limited.map((entry) => clone(entry.item)).reverse(),
      nextCursor: limited.length > 0 ? `${limited[limited.length - 1]?.index ?? threshold}` : cursor,
    };
  }
}

const getKvBinding = () => {
  const binding = (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike; REGIME_ALERTS_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV
    ?? (globalThis as { REGIME_ALERTS_KV?: KvNamespaceLike }).REGIME_ALERTS_KV;

  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function" || typeof binding.list !== "function") {
    return null;
  }
  return binding;
};

let sharedRepository: RegimeAlertRepository | null = null;

export const getRegimeAlertRepository = () => {
  if (!sharedRepository) {
    const kv = getKvBinding();
    sharedRepository = kv ? new KvRegimeAlertRepository(kv) : new InMemoryRegimeAlertRepository();
  }
  return sharedRepository;
};

export const resetRegimeAlertRepository = () => {
  sharedRepository = new InMemoryRegimeAlertRepository();
  return sharedRepository;
};

export const buildRegimeAlertLineage = () => buildLineage("request-received-at");
