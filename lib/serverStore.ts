import fs from "node:fs";
import path from "node:path";
import type { DecisionMemoryEntry } from "../app/operations/components/decisionMemoryUtils";
import type { AlertChannel, AlertDeliveryEvent, RegimeAlertEvent } from "./signalOps";

export type AlertDeliveryPreferences = Record<AlertChannel, boolean>;

type Store = {
  regimeAlerts: RegimeAlertEvent[];
  decisionMemoryByClient: Record<string, DecisionMemoryEntry[]>;
  alertPreferencesByClient: Record<string, AlertDeliveryPreferences>;
  alertDeliveries: AlertDeliveryEvent[];
};

const STORE_DIR = path.join(process.cwd(), ".whether");
const STORE_PATH = path.join(STORE_DIR, "server-store.json");

const defaultPreferences: AlertDeliveryPreferences = {
  slack: true,
  email: true,
  webhook: false,
};

const createStore = (): Store => ({
  regimeAlerts: [],
  decisionMemoryByClient: {},
  alertPreferencesByClient: {},
  alertDeliveries: [],
});

const readStore = (): Store => {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return createStore();
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      regimeAlerts: Array.isArray(parsed.regimeAlerts) ? parsed.regimeAlerts : [],
      decisionMemoryByClient: parsed.decisionMemoryByClient ?? {},
      alertPreferencesByClient: parsed.alertPreferencesByClient ?? {},
      alertDeliveries: Array.isArray(parsed.alertDeliveries) ? parsed.alertDeliveries : [],
    };
  } catch {
    return createStore();
  }
};

const writeStore = (store: Store) => {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
};

declare global {
  // eslint-disable-next-line no-var
  var __whetherServerStore: Store | undefined;
}

const initialStore = globalThis.__whetherServerStore ?? readStore();
if (!globalThis.__whetherServerStore) {
  globalThis.__whetherServerStore = initialStore;
}

export const serverStore = {
  get snapshot() {
    return globalThis.__whetherServerStore ?? initialStore;
  },
  save(nextStore: Store) {
    globalThis.__whetherServerStore = nextStore;
    writeStore(nextStore);
  },
  getPreferences(clientId: string): AlertDeliveryPreferences {
    const current = this.snapshot;
    return current.alertPreferencesByClient[clientId] ?? defaultPreferences;
  },
  setPreferences(clientId: string, next: Partial<AlertDeliveryPreferences>): AlertDeliveryPreferences {
    const current = this.snapshot;
    const merged = {
      ...defaultPreferences,
      ...this.getPreferences(clientId),
      ...next,
    };
    this.save({
      ...current,
      alertPreferencesByClient: {
        ...current.alertPreferencesByClient,
        [clientId]: merged,
      },
    });
    return merged;
  },
};

export const pruneDecisionMemoryEntries = (entries: DecisionMemoryEntry[], maxAgeDays: number) => {
  const cutoffMs = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => {
    const loggedAtMs = Date.parse(entry.loggedAt);
    if (Number.isNaN(loggedAtMs)) {
      return true;
    }
    return loggedAtMs >= cutoffMs;
  });
};
