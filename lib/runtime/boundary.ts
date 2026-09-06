import { getWhetherKv, type KvNamespace } from "./kv";
import { runInBackground } from "./backgroundWork";

export interface RuntimeBoundary {
  storage: KvNamespace | null;
  backgroundWork: (taskName: string, work: () => Promise<void>) => void;
  clock: { now(): Date };
  config: {
    cronSecret?: string;
    siteUrl?: string;
    isProduction: boolean;
  };
  ensureDurableStorage(operationName: string): KvNamespace;
}

class DefaultRuntimeBoundary implements RuntimeBoundary {
  get storage(): KvNamespace | null {
    return getWhetherKv();
  }

  backgroundWork(taskName: string, work: () => Promise<void>): void {
    void runInBackground(taskName, work);
  }

  get clock(): { now(): Date } {
    return { now: () => new Date() };
  }

  get config(): { cronSecret?: string; siteUrl?: string; isProduction: boolean } {
    const globalCronSecret: unknown = Reflect.get(globalThis, "WHETHER_CRON_SECRET");
    const globalSiteUrl: unknown = Reflect.get(globalThis, "SITE_URL");
    const cronSecret = typeof globalCronSecret === "string"
      ? globalCronSecret
      : process.env.WHETHER_CRON_SECRET;
    const siteUrl = typeof globalSiteUrl === "string"
      ? globalSiteUrl
      : process.env.SITE_URL ?? "https://whether.work";
    const isProduction = process.env.NODE_ENV === "production";
    return { cronSecret, siteUrl, isProduction };
  }

  ensureDurableStorage(operationName: string): KvNamespace {
    const kv = this.storage;
    if (!kv) {
      const environment = this.config.isProduction ? "production" : "local";
      throw new Error(
        `[runtime] Durable storage unavailable for ${environment} write: ${operationName}. Refusing silent in-memory fallback.`,
      );
    }
    return kv;
  }
}

let sharedBoundary: RuntimeBoundary = new DefaultRuntimeBoundary();

export const getRuntimeBoundary = (): RuntimeBoundary => sharedBoundary;

export const setRuntimeBoundaryForTesting = (boundary: RuntimeBoundary): void => {
  sharedBoundary = boundary;
};

export const resetRuntimeBoundary = (): void => {
  sharedBoundary = new DefaultRuntimeBoundary();
};
