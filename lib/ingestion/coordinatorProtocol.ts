/**
 * The wire contract between the Worker-side `IngestCoordinatorStore` (lib/ingestion/
 * coordinatorStore.ts) and the `IngestCoordinator` Durable Object (worker/ingestCoordinator.ts).
 *
 * The object speaks plain HTTP over its stub so that neither side needs `cloudflare:workers`
 * types: the client is ordinary library code that bun tests can drive, and the object is a
 * classic fetch-handler class that a test can instantiate with a Map-backed storage.
 */
import type { MaterializedSignalReadModel, SignalEntitySnapshot } from "./types";

/** Origin is nominal: a Durable Object stub ignores the host and routes on the path. */
export const COORDINATOR_ORIGIN = "https://ingest-coordinator.internal";

/** One object per deployment. Every isolate names the same id, so every isolate sees one model. */
export const COORDINATOR_OBJECT_NAME = "whether";

export const COORDINATOR_ROUTES = {
  materialized: "/materialized",
  snapshots: "/snapshots",
  refreshLock: "/refresh-lock",
  refresh: "/refresh",
  status: "/status",
} as const;

export type MaterializedResponse = { model: MaterializedSignalReadModel | null };
export type SnapshotsResponse = { snapshots: SignalEntitySnapshot[] };
export type RefreshLockRequest = { ttlSeconds: number };
export type RefreshLockResponse = { acquired: boolean };
export type RefreshResponse = { refreshed: string[] };
export type CoordinatorStatus = {
  backend: "durable-object";
  hasModel: boolean;
  latestSnapshotSequence: number;
  nextAlarmAt: string | null;
};

/** The binding as installed on globalThis by worker/index.ts: enough of a DurableObjectNamespace to reach one stub. */
export type CoordinatorStub = { fetch(request: Request): Promise<Response> };
export type CoordinatorNamespace = {
  idFromName(name: string): unknown;
  get(id: unknown): CoordinatorStub;
};

export const isCoordinatorNamespace = (value: unknown): value is CoordinatorNamespace =>
  typeof value === "object"
  && value !== null
  && typeof Reflect.get(value, "idFromName") === "function"
  && typeof Reflect.get(value, "get") === "function";
