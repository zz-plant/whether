import type { AlertChannel } from "./signalOps";

export type DeliveryPreferences = Record<AlertChannel, boolean>;

export const defaultDeliveryPreferences = (): DeliveryPreferences => ({
  slack: true,
  email: true,
  webhook: false,
});

declare global {
  // eslint-disable-next-line no-var
  var __whetherAlertPreferences: Map<string, DeliveryPreferences> | undefined;
}

const getStore = () => {
  if (!globalThis.__whetherAlertPreferences) {
    globalThis.__whetherAlertPreferences = new Map<string, DeliveryPreferences>();
  }
  return globalThis.__whetherAlertPreferences;
};

export const getDeliveryPreferences = (clientId: string): DeliveryPreferences =>
  getStore().get(clientId) ?? defaultDeliveryPreferences();

export const setDeliveryPreferences = (clientId: string, preferences: DeliveryPreferences) => {
  getStore().set(clientId, preferences);
};
