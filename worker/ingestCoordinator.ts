/**
 * IngestCoordinator — the Durable Object that owns the materialized signal model for one
 * deployment: its snapshots, its refresh lock, and its refresh schedule.
 *
 * Production since 2026-10-09 (docs/agents/data-and-platform.md, "Ingest coordinator"):
 * declared in every environment, switched on where WHETHER_INGEST_COORDINATOR=1. Five
 * stable weeks on the preview lane preceded the promotion. Everything
 * the object does goes through `DurableStorageIngestionStore`, so the store's tests are the
 * object's tests; this class is the fetch router plus the alarm.
 *
 * Written as a classic fetch-handler class rather than `extends DurableObject` from
 * `cloudflare:workers`, so the file has no Workers-only import and a bun test can build one
 * with a Map-backed storage.
 */
import { COORDINATOR_ROUTES, type CoordinatorStatus, type RefreshResponse } from "../lib/ingestion/coordinatorProtocol";
import { DurableStorageIngestionStore, type CoordinatorStorage } from "../lib/ingestion/durableStorageStore";
import { ingestCanonicalSignals, resolveSignalFamiliesToRefresh } from "../lib/ingestion/materialized";
import type { MaterializedSignalReadModel, SignalEntitySnapshot } from "../lib/ingestion/types";

/**
 * How often the object checks for due families. Each check ingests only what
 * `resolveSignalFamiliesToRefresh` says is due (the shortest poll window is two hours), so an
 * hourly alarm costs one storage read most of the time and keeps the model current enough
 * that the read path never has to refresh anything itself.
 */
export const REFRESH_ALARM_INTERVAL_MS = 60 * 60 * 1000;

type CoordinatorAlarmStorage = CoordinatorStorage & {
  getAlarm(): Promise<number | null>;
  setAlarm(scheduledTime: number): Promise<void>;
};

type CoordinatorState = {
  storage: CoordinatorAlarmStorage;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/* The bodies come from this codebase's own client, so the checks establish the shape rather
   than validate every field; a malformed body is a 400, not a stored corruption. */
const isMaterializedModel = (value: unknown): value is MaterializedSignalReadModel =>
  isRecord(value) && typeof value.asOf === "string" && isRecord(value.signals);

const isSnapshotList = (value: unknown): value is SignalEntitySnapshot[] =>
  Array.isArray(value) && value.every((entry) => isRecord(entry) && typeof entry.signalKey === "string");

type CoordinatorOptions = {
  /** Upstream fetch, injectable for tests. Defaults to the global fetch. */
  fetcher?: typeof fetch;
  now?: () => number;
};

export class IngestCoordinator {
  private readonly store: DurableStorageIngestionStore;
  private readonly fetcher: typeof fetch;

  /**
   * The runtime constructs a Durable Object as `(state, env)`. The env is unused here (the
   * object reads nothing from bindings), but the slot must stay so a test-only option never
   * lands where the runtime puts the environment.
   */
  constructor(
    private readonly state: CoordinatorState,
    _env?: unknown,
    options: CoordinatorOptions = {},
  ) {
    this.fetcher = options.fetcher ?? fetch;
    this.store = new DurableStorageIngestionStore(state.storage, options.now);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const route = `${request.method} ${url.pathname}`;

    try {
      switch (route) {
        case `GET ${COORDINATOR_ROUTES.materialized}`:
          return json({ model: await this.store.readLatestMaterialized() });

        case `PUT ${COORDINATOR_ROUTES.materialized}`: {
          const body: unknown = await request.json();
          if (!isRecord(body) || !isMaterializedModel(body.model)) {
            return json({ error: "expected { model }" }, 400);
          }
          await this.store.writeLatestMaterialized(body.model);
          await this.ensureAlarm();
          return new Response(null, { status: 204 });
        }

        case `POST ${COORDINATOR_ROUTES.snapshots}`: {
          const body: unknown = await request.json();
          if (!isRecord(body) || !isSnapshotList(body.snapshots)) {
            return json({ error: "expected { snapshots: [] }" }, 400);
          }
          await this.store.appendSnapshots(body.snapshots);
          return new Response(null, { status: 204 });
        }

        case `GET ${COORDINATOR_ROUTES.snapshots}`: {
          const limitParam = url.searchParams.get("limit");
          const limit = limitParam === null ? undefined : Number.parseInt(limitParam, 10);
          const snapshots = await this.store.readSnapshots({
            cursor: url.searchParams.get("cursor"),
            limit: limit !== undefined && Number.isFinite(limit) ? limit : undefined,
          });
          return json({ snapshots });
        }

        case `POST ${COORDINATOR_ROUTES.refreshLock}`: {
          const body: unknown = await request.json();
          const ttlSeconds = isRecord(body) && typeof body.ttlSeconds === "number" ? body.ttlSeconds : 120;
          return json({ acquired: await this.store.acquireRefreshLock(ttlSeconds) });
        }

        case `POST ${COORDINATOR_ROUTES.refresh}`: {
          const refreshed = await this.refreshDueFamilies();
          await this.ensureAlarm();
          return json(refreshed);
        }

        case `GET ${COORDINATOR_ROUTES.status}`: {
          const nextAlarm = await this.state.storage.getAlarm();
          const status: CoordinatorStatus = {
            backend: "durable-object",
            hasModel: (await this.store.readLatestMaterialized()) !== null,
            latestSnapshotSequence: await this.store.latestSnapshotSequence(),
            nextAlarmAt: nextAlarm === null ? null : new Date(nextAlarm).toISOString(),
          };
          return json(status);
        }

        default:
          return json({ error: `no route for ${route}` }, 404);
      }
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  /** The alarm is the object's own schedule: refresh what is due, then arm the next check. */
  async alarm(): Promise<void> {
    try {
      await this.refreshDueFamilies();
    } finally {
      await this.state.storage.setAlarm(Date.now() + REFRESH_ALARM_INTERVAL_MS);
    }
  }

  private async ensureAlarm() {
    if ((await this.state.storage.getAlarm()) === null) {
      await this.state.storage.setAlarm(Date.now() + REFRESH_ALARM_INTERVAL_MS);
    }
  }

  private async refreshDueFamilies(): Promise<RefreshResponse> {
    const model = await this.store.readLatestMaterialized();
    const families = resolveSignalFamiliesToRefresh(model);
    if (families.length === 0) {
      return { refreshed: [] };
    }
    await ingestCanonicalSignals({ fetcher: this.fetcher, store: this.store, families });
    return { refreshed: [...families] };
  }
}
