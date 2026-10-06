import type { AlertDeliveryEvent, RegimeAlertEvent } from "../signalOps";
import { getWhetherKv } from "../runtime/kv";
import { DurableEventLog, type KvNamespaceLike } from "./eventLog";

type Cursor = string | null;

interface RegimeAlertRepository {
  appendAlert(event: RegimeAlertEvent): Promise<void>;
  listAlerts(options?: { cursor?: Cursor; limit?: number }): Promise<{ alerts: RegimeAlertEvent[]; nextCursor: Cursor }>;
  latestAlert(): Promise<RegimeAlertEvent | null>;
  appendDelivery(event: AlertDeliveryEvent): Promise<void>;
  listDeliveries(options?: { cursor?: Cursor; limit?: number; clientId?: string }): Promise<{ deliveries: AlertDeliveryEvent[]; nextCursor: Cursor }>;
  backendStatus(): "durable" | "local-fallback";
}

class InMemoryRegimeAlertRepository implements RegimeAlertRepository {
  private readonly alertsLog = new DurableEventLog<RegimeAlertEvent>("regime-alert", null);
  private readonly deliveriesLog = new DurableEventLog<AlertDeliveryEvent>("regime-alert-delivery", null);

  async appendAlert(event: RegimeAlertEvent) {
    await this.alertsLog.append(event);
  }

  async listAlerts(options?: { cursor?: Cursor; limit?: number }) {
    const res = await this.alertsLog.list({ cursor: options?.cursor, limit: options?.limit });
    return { alerts: res.items, nextCursor: res.nextCursor };
  }

  async latestAlert() {
    return this.alertsLog.latest();
  }

  async appendDelivery(event: AlertDeliveryEvent) {
    await this.deliveriesLog.append(event);
  }

  async listDeliveries(options?: { cursor?: Cursor; limit?: number; clientId?: string }) {
    const res = await this.deliveriesLog.list({
      cursor: options?.cursor,
      limit: options?.limit,
      filter: options?.clientId ? (item) => item.clientId === options.clientId : undefined,
    });
    return { deliveries: res.items, nextCursor: res.nextCursor };
  }

  backendStatus() {
    return "local-fallback" as const;
  }
}

class KvRegimeAlertRepository implements RegimeAlertRepository {
  private readonly alertsLog: DurableEventLog<RegimeAlertEvent>;
  private readonly deliveriesLog: DurableEventLog<AlertDeliveryEvent>;

  constructor(kv: KvNamespaceLike) {
    this.alertsLog = new DurableEventLog("regime-alert", kv);
    this.deliveriesLog = new DurableEventLog("regime-alert-delivery", kv);
  }

  async appendAlert(event: RegimeAlertEvent) {
    await this.alertsLog.append(event);
  }

  async listAlerts(options?: { cursor?: Cursor; limit?: number }) {
    const res = await this.alertsLog.list({ cursor: options?.cursor, limit: options?.limit });
    return { alerts: res.items, nextCursor: res.nextCursor };
  }

  async latestAlert() {
    return this.alertsLog.latest();
  }

  async appendDelivery(event: AlertDeliveryEvent) {
    await this.deliveriesLog.append(event);
  }

  async listDeliveries(options?: { cursor?: Cursor; limit?: number; clientId?: string }) {
    const res = await this.deliveriesLog.list({
      cursor: options?.cursor,
      limit: options?.limit,
      filter: options?.clientId ? (item) => item.clientId === options.clientId : undefined,
    });
    return { deliveries: res.items, nextCursor: res.nextCursor };
  }

  backendStatus() {
    return "durable" as const;
  }
}

const getKvBinding = (): KvNamespaceLike | null => getWhetherKv();

let sharedRepository: RegimeAlertRepository | null = null;

export const getRegimeAlertRepository = (): RegimeAlertRepository => {
  if (!sharedRepository) {
    const kv = getKvBinding();
    sharedRepository = kv ? new KvRegimeAlertRepository(kv) : new InMemoryRegimeAlertRepository();
  }
  return sharedRepository;
};

export const resetRegimeAlertRepository = (): RegimeAlertRepository => {
  sharedRepository = new InMemoryRegimeAlertRepository();
  return sharedRepository;
};
