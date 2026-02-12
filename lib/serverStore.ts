import type { DecisionMemoryEntry } from "../app/operations/components/decisionMemoryUtils";
import type { RegimeAlertEvent } from "./signalOps";

type Store = {
  regimeAlerts: RegimeAlertEvent[];
  decisionMemoryByClient: Record<string, DecisionMemoryEntry[]>;
};

declare global {
  // eslint-disable-next-line no-var
  var __whetherServerStore: Store | undefined;
}

const createStore = (): Store => ({
  regimeAlerts: [],
  decisionMemoryByClient: {},
});

export const serverStore = globalThis.__whetherServerStore ?? createStore();

if (!globalThis.__whetherServerStore) {
  globalThis.__whetherServerStore = serverStore;
}
