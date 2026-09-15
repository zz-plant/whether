/**
 * Worker-side `IngestionStore` that delegates to the `IngestCoordinator` Durable Object over
 * its stub. Selected by `getDefaultIngestionStore()` only when the deployment opts in
 * (`WHETHER_INGEST_COORDINATOR=1`) and the binding is present, so the KV store stays the
 * default everywhere the trial has not been switched on.
 */
import {
  COORDINATOR_OBJECT_NAME,
  COORDINATOR_ORIGIN,
  COORDINATOR_ROUTES,
  isCoordinatorNamespace,
  type CoordinatorNamespace,
  type CoordinatorStub,
  type MaterializedResponse,
  type RefreshLockRequest,
  type RefreshLockResponse,
  type SnapshotsResponse,
} from "./coordinatorProtocol";
import type { IngestionStore } from "./store";
import type { MaterializedSignalReadModel, SignalEntitySnapshot } from "./types";

const INGEST_COORDINATOR_FLAG = "WHETHER_INGEST_COORDINATOR";
const INGEST_COORDINATOR_BINDING = "INGEST_COORDINATOR";

const readFlag = (): boolean => {
  const fromBinding: unknown = Reflect.get(globalThis, INGEST_COORDINATOR_FLAG);
  if (typeof fromBinding === "string") return fromBinding === "1";
  return typeof process !== "undefined" && process.env?.[INGEST_COORDINATOR_FLAG] === "1";
};

/** The namespace, when this deployment has opted in and the binding is installed; otherwise null. */
export const resolveIngestCoordinatorNamespace = (): CoordinatorNamespace | null => {
  if (!readFlag()) return null;
  const binding: unknown = Reflect.get(globalThis, INGEST_COORDINATOR_BINDING);
  return isCoordinatorNamespace(binding) ? binding : null;
};

export const coordinatorStubFor = (namespace: CoordinatorNamespace): CoordinatorStub =>
  namespace.get(namespace.idFromName(COORDINATOR_OBJECT_NAME));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isMaterializedModel = (value: unknown): value is MaterializedSignalReadModel =>
  isRecord(value) && typeof value.asOf === "string" && isRecord(value.signals);

const isSnapshotList = (value: unknown): value is SignalEntitySnapshot[] =>
  Array.isArray(value) && value.every((entry) => isRecord(entry) && typeof entry.signalKey === "string");

const parseMaterializedResponse = (body: unknown): MaterializedResponse["model"] => {
  if (!isRecord(body) || !("model" in body)) throw new Error("ingest coordinator returned no model field");
  if (body.model === null) return null;
  if (!isMaterializedModel(body.model)) throw new Error("ingest coordinator returned a malformed model");
  return body.model;
};

const parseSnapshotsResponse = (body: unknown): SnapshotsResponse["snapshots"] => {
  if (!isRecord(body) || !isSnapshotList(body.snapshots)) throw new Error("ingest coordinator returned malformed snapshots");
  return body.snapshots;
};

const parseRefreshLockResponse = (body: unknown): RefreshLockResponse["acquired"] => {
  if (!isRecord(body) || typeof body.acquired !== "boolean") throw new Error("ingest coordinator returned a malformed lock reply");
  return body.acquired;
};

export class IngestCoordinatorStore implements IngestionStore {
  constructor(private readonly stub: CoordinatorStub) {}

  private async send(path: string, init?: RequestInit): Promise<Response> {
    const response = await this.stub.fetch(new Request(`${COORDINATOR_ORIGIN}${path}`, init));
    if (!response.ok) {
      throw new Error(`ingest coordinator ${init?.method ?? "GET"} ${path} failed (HTTP ${response.status})`);
    }
    return response;
  }

  /** Every body is parsed by a narrowing function rather than asserted; a malformed reply is an error, not a lie. */
  private async read<T>(path: string, parse: (body: unknown) => T, init?: RequestInit): Promise<T> {
    const response = await this.send(path, init);
    return parse(await response.json());
  }

  private json(body: unknown, method: string): RequestInit {
    return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
  }

  async appendSnapshots(snapshots: SignalEntitySnapshot[]) {
    if (snapshots.length === 0) return;
    await this.send(COORDINATOR_ROUTES.snapshots, this.json({ snapshots }, "POST"));
  }

  async readSnapshots(options?: { cursor?: string | null; limit?: number }) {
    const query = new URLSearchParams();
    if (options?.cursor) query.set("cursor", options.cursor);
    if (options?.limit !== undefined) query.set("limit", String(options.limit));
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return this.read(`${COORDINATOR_ROUTES.snapshots}${suffix}`, parseSnapshotsResponse);
  }

  async readLatestMaterialized() {
    return this.read(COORDINATOR_ROUTES.materialized, parseMaterializedResponse);
  }

  async writeLatestMaterialized(model: MaterializedSignalReadModel) {
    await this.send(COORDINATOR_ROUTES.materialized, this.json({ model }, "PUT"));
  }

  backendStatus() {
    return "durable" as const;
  }

  async acquireRefreshLock(ttlSeconds: number) {
    const body: RefreshLockRequest = { ttlSeconds };
    return this.read(COORDINATOR_ROUTES.refreshLock, parseRefreshLockResponse, this.json(body, "POST"));
  }
}
