import type { AlertChannel } from "../signalOps";

export type AlertPreferences = Record<AlertChannel, boolean>;

type KvNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export interface AlertPreferenceRepository {
  get(clientId: string): Promise<AlertPreferences | null>;
  upsert(clientId: string, preferences: AlertPreferences): Promise<AlertPreferences>;
  backendStatus(): "durable" | "local-fallback";
}

const PREF_PREFIX = "alert-pref:";

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  slack: true,
  email: true,
  webhook: false,
};

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

class InMemoryAlertPreferenceRepository implements AlertPreferenceRepository {
  private readonly map = new Map<string, AlertPreferences>();

  async get(clientId: string) {
    return clone(this.map.get(clientId) ?? null);
  }

  async upsert(clientId: string, preferences: AlertPreferences) {
    this.map.set(clientId, clone(preferences));
    return clone(preferences);
  }

  backendStatus() {
    return "local-fallback" as const;
  }
}

class KvAlertPreferenceRepository implements AlertPreferenceRepository {
  private readonly fallback = new InMemoryAlertPreferenceRepository();

  constructor(private readonly kv: KvNamespaceLike) {}

  async get(clientId: string) {
    const raw = await this.kv.get(PREF_PREFIX + clientId);
    if (!raw) {
      return this.fallback.get(clientId);
    }
    return clone(JSON.parse(raw) as AlertPreferences);
  }

  async upsert(clientId: string, preferences: AlertPreferences) {
    await this.fallback.upsert(clientId, preferences);
    await this.kv.put(PREF_PREFIX + clientId, JSON.stringify(preferences)).catch(() => undefined);
    return clone(preferences);
  }

  backendStatus() {
    return "durable" as const;
  }
}

const getKvBinding = () => {
  const binding = (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike; ALERT_PREFERENCES_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV
    ?? (globalThis as { ALERT_PREFERENCES_KV?: KvNamespaceLike }).ALERT_PREFERENCES_KV;

  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function") {
    return null;
  }

  return binding;
};

let sharedRepository: AlertPreferenceRepository | null = null;

export const getAlertPreferenceRepository = () => {
  if (!sharedRepository) {
    const kv = getKvBinding();
    sharedRepository = kv ? new KvAlertPreferenceRepository(kv) : new InMemoryAlertPreferenceRepository();
  }

  return sharedRepository;
};

export const resetAlertPreferenceRepository = () => {
  sharedRepository = new InMemoryAlertPreferenceRepository();
  return sharedRepository;
};
