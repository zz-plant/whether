import type { AlertChannel, AlertDeliveryEvent, RegimeAlertEvent } from "./signalOps";

export type AlertDeliveryPreferences = Record<AlertChannel, boolean>;

type Store = {
  regimeAlerts: RegimeAlertEvent[];
  alertPreferencesByClient: Record<string, AlertDeliveryPreferences>;
  alertDeliveries: AlertDeliveryEvent[];
};

const defaultPreferences: AlertDeliveryPreferences = {
  slack: true,
  email: true,
  webhook: false,
};

const createStore = (): Store => ({
  regimeAlerts: [],
  alertPreferencesByClient: {},
  alertDeliveries: [],
});

declare global {
  // eslint-disable-next-line no-var
  var __whetherServerStore: Store | undefined;
}

const initialStore = globalThis.__whetherServerStore ?? createStore();
if (!globalThis.__whetherServerStore) {
  globalThis.__whetherServerStore = initialStore;
}

export const serverStore = {
  get snapshot() {
    return globalThis.__whetherServerStore ?? initialStore;
  },
  save(nextStore: Store) {
    globalThis.__whetherServerStore = nextStore;
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
