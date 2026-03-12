import type { AlertDeliveryEvent, RegimeAlertEvent } from "./signalOps";
import type { DecisionMemoryEntry } from "./decisionMemory";
import type { RegimeKey } from "./regimeEngine";

export type PostureDecisionEvent = {
  id: string;
  recordedAt: string;
  effectiveRecordDate: string;
  idempotencyKey: string;
  fromState: RegimeKey | null;
  toState: RegimeKey;
  reason: string;
};

type Store = {
  regimeAlerts: RegimeAlertEvent[];
  alertDeliveries: AlertDeliveryEvent[];
  decisionMemory: DecisionMemoryEntry[];
  postureDecisionEvents: PostureDecisionEvent[];
};

const createStore = (): Store => ({
  regimeAlerts: [],
  alertDeliveries: [],
  decisionMemory: [],
  postureDecisionEvents: [],
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
