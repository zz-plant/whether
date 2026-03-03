import type { AlertDeliveryEvent, RegimeAlertEvent } from "./signalOps";
import type { DecisionMemoryEntry } from "./decisionMemory";

type Store = {
  regimeAlerts: RegimeAlertEvent[];
  alertDeliveries: AlertDeliveryEvent[];
  decisionMemory: DecisionMemoryEntry[];
};

const createStore = (): Store => ({
  regimeAlerts: [],
  alertDeliveries: [],
  decisionMemory: [],
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
};
