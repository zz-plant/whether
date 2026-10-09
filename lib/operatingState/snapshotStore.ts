import type { OperatingSnapshot } from "./types";
import { getWhetherKv, type KvNamespace } from "../runtime/kv";
import { selectStoreByBinding } from "../runtime/storeSelection";
import { parseTreasuryData } from "../treasury/treasurySchema";

const LATEST_KEY = "snapshot:latest";
const SNAPSHOT_KEY_PREFIX = "snapshot:";

const REGIME_KEYS = new Set(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]);
const BASE_RATE_SOURCES = new Set(["FED", "1M", "3M", "MISSING"]);
const CONFIDENCE_BANDS = new Set(["LOW", "MEDIUM", "HIGH"]);
const INTENSITY_BANDS = new Set(["MILD", "STANDARD", "STRONG"]);
const FRESHNESS_STATES = new Set(["fresh", "stale", "fallback"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isNumberOrNull = (value: unknown): value is number | null =>
  typeof value === "number" || value === null;

const isRegimeKey = (value: unknown): boolean =>
  typeof value === "string" && REGIME_KEYS.has(value);

const isMacroSeriesReading = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.label === "string"
    && isNumberOrNull(value.value)
    && typeof value.unit === "string"
    && typeof value.explanation === "string"
    && typeof value.sourceLabel === "string"
    && typeof value.sourceUrl === "string"
    && typeof value.formulaUrl === "string"
    && typeof value.record_date === "string"
    && typeof value.fetched_at === "string"
    && typeof value.isLive === "boolean";
};

const isMachineState = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  const pendingStateIsValid = value.pendingState === null || isRegimeKey(value.pendingState);
  const lastSignalsAreValid = value.lastSignals === undefined
    || (isRecord(value.lastSignals)
      && typeof value.lastSignals.tightness === "number"
      && typeof value.lastSignals.riskAppetite === "number");
  return isRegimeKey(value.committedState)
    && pendingStateIsValid
    && typeof value.pendingCount === "number"
    && lastSignalsAreValid;
};

const isRegimeAssessment = (value: unknown): boolean => {
  if (!isRecord(value) || !isRecord(value.scores) || !isRecord(value.diagnostics) || !isRecord(value.thresholds)) {
    return false;
  }

  return isRegimeKey(value.regime)
    && typeof value.scores.tightness === "number"
    && typeof value.scores.riskAppetite === "number"
    && typeof value.scores.baseRateUsed === "string"
    && BASE_RATE_SOURCES.has(value.scores.baseRateUsed)
    && typeof value.scores.baseRate === "number"
    && isNumberOrNull(value.scores.curveSlope)
    && typeof value.diagnostics.tightnessVsThreshold === "number"
    && typeof value.diagnostics.riskAppetiteVsThreshold === "number"
    && typeof value.diagnostics.nearestThresholdDelta === "number"
    && typeof value.diagnostics.confidence === "string"
    && CONFIDENCE_BANDS.has(value.diagnostics.confidence)
    && typeof value.diagnostics.transitionWatch === "boolean"
    && typeof value.diagnostics.intensity === "string"
    && INTENSITY_BANDS.has(value.diagnostics.intensity)
    && isStringArray(value.diagnostics.boundaryContributors)
    && typeof value.diagnostics.weakReadCount === "number"
    && typeof value.diagnostics.twoWeakReadsWarning === "boolean"
    && typeof value.thresholds.baseRateTightness === "number"
    && typeof value.thresholds.tightnessRegime === "number"
    && typeof value.thresholds.riskAppetiteRegime === "number"
    && typeof value.description === "string"
    && isStringArray(value.constraints)
    && typeof value.tightnessExplanation === "string"
    && typeof value.riskAppetiteExplanation === "string"
    && isStringArray(value.dataWarnings)
    && Array.isArray(value.inputs)
    && isRecord(value.policyAssessment);
};

const isWeeklyCall = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return typeof value.regimeStage === "string"
    && typeof value.currentCall === "string"
    && typeof value.actionNow === "string"
    && typeof value.pauseIf === "string"
    && typeof value.callChangesIf === "string"
    && (value.resumeWhen === undefined || typeof value.resumeWhen === "string")
    && isStringArray(value.doNowBullets)
    && isStringArray(value.flipConditionLabels)
    && typeof value.whyCouldBeWrong === "string"
    && typeof value.policyOverrideActive === "boolean"
    && (typeof value.policyOverrideReason === "string" || value.policyOverrideReason === null);
};

const isOperatingSnapshot = (value: unknown): value is OperatingSnapshot => {
  if (!isRecord(value) || !isRecord(value.provenance) || !isRecord(value.freshness)) {
    return false;
  }

  return typeof value.id === "string"
    && value.schemaVersion === 2
    && typeof value.epoch === "string"
    && (value.engineVersion === undefined || typeof value.engineVersion === "string")
    && typeof value.recordDate === "string"
    && typeof value.inputHash === "string"
    && isStringArray(value.sourceSnapshotIds)
    && parseTreasuryData(value.treasury) !== null
    && Array.isArray(value.macroSeries)
    && value.macroSeries.every(isMacroSeriesReading)
    && isRegimeAssessment(value.assessment)
    && isWeeklyCall(value.weeklyCall)
    && isMachineState(value.machineState)
    && typeof value.provenance.sourceLabel === "string"
    && typeof value.provenance.sourceUrl === "string"
    && typeof value.provenance.recordDateLabel === "string"
    && typeof value.provenance.timestampLabel === "string"
    && typeof value.provenance.ageLabel === "string"
    && typeof value.provenance.statusLabel === "string"
    && typeof value.provenance.isLive === "boolean"
    && typeof value.freshness.treasuryAgeHours === "number"
    && typeof value.freshness.macroAgeHours === "number"
    && typeof value.freshness.status === "string"
    && FRESHNESS_STATES.has(value.freshness.status);
};

/**
 * A snapshot written before the contract split carries the call-change line as
 * `changeCourseIf`. That is already the right value: snapshots are built with
 * no stage, and the stage's resume line was the only thing that ever replaced
 * the flip trigger there. So the old field is read as the new one rather than
 * discarding every stored snapshot over a rename.
 */
const upgradeLegacyWeeklyCall = (value: unknown): unknown => {
  if (!isRecord(value) || !isRecord(value.weeklyCall)) return value;
  const { changeCourseIf, ...weeklyCall } = value.weeklyCall;
  if (typeof weeklyCall.callChangesIf === "string" || typeof changeCourseIf !== "string") return value;
  return { ...value, weeklyCall: { ...weeklyCall, callChangesIf: changeCourseIf } };
};

const parseOperatingSnapshot = (raw: string): OperatingSnapshot | null => {
  try {
    const value: unknown = upgradeLegacyWeeklyCall(JSON.parse(raw));
    return isOperatingSnapshot(value) ? value : null;
  } catch {
    return null;
  }
};

interface OperatingSnapshotStore {
  write(snapshot: OperatingSnapshot): Promise<void>;
  readLatest(): Promise<OperatingSnapshot | null>;
  readByRecordDateAndHash(recordDate: string, inputHash: string): Promise<OperatingSnapshot | null>;
  clear?(): void;
}

class InMemoryOperatingSnapshotStore implements OperatingSnapshotStore {
  private latestSnapshot: OperatingSnapshot | null = null;
  private readonly snapshots = new Map<string, OperatingSnapshot>();

  async write(snapshot: OperatingSnapshot): Promise<void> {
    const cloned = structuredClone(snapshot);
    this.latestSnapshot = cloned;
    this.snapshots.set(`${snapshot.recordDate}:${snapshot.inputHash}`, cloned);
  }

  async readLatest(): Promise<OperatingSnapshot | null> {
    return this.latestSnapshot ? structuredClone(this.latestSnapshot) : null;
  }

  async readByRecordDateAndHash(recordDate: string, inputHash: string): Promise<OperatingSnapshot | null> {
    const found = this.snapshots.get(`${recordDate}:${inputHash}`);
    return found ? structuredClone(found) : null;
  }

  clear(): void {
    this.latestSnapshot = null;
    this.snapshots.clear();
  }
}

export class KvOperatingSnapshotStore implements OperatingSnapshotStore {
  constructor(private readonly kv: KvNamespace) {}

  private toKey(recordDate: string, inputHash: string): string {
    return `${SNAPSHOT_KEY_PREFIX}${recordDate}:${inputHash}`;
  }

  async write(snapshot: OperatingSnapshot): Promise<void> {
    const json = JSON.stringify(snapshot);
    const key = this.toKey(snapshot.recordDate, snapshot.inputHash);
    await Promise.all([
      this.kv.put(key, json),
      this.kv.put(LATEST_KEY, json),
    ]);
  }

  async readLatest(): Promise<OperatingSnapshot | null> {
    const raw = await this.kv.get(LATEST_KEY);
    if (!raw) return null;
    return parseOperatingSnapshot(raw);
  }

  async readByRecordDateAndHash(recordDate: string, inputHash: string): Promise<OperatingSnapshot | null> {
    const key = this.toKey(recordDate, inputHash);
    const raw = await this.kv.get(key, { cacheTtl: 3600 });
    if (!raw) return null;
    return parseOperatingSnapshot(raw);
  }
}

const snapshotStoreSelection = selectStoreByBinding(
  getWhetherKv,
  (kv): OperatingSnapshotStore => (kv ? new KvOperatingSnapshotStore(kv) : new InMemoryOperatingSnapshotStore()),
);

export const getOperatingSnapshotStore = (): OperatingSnapshotStore => snapshotStoreSelection.get();

/** Test hook: an empty in-memory store, held until the next reset whatever the binding does. */
export const resetOperatingSnapshotStore = (): OperatingSnapshotStore =>
  snapshotStoreSelection.reset(new InMemoryOperatingSnapshotStore());
