import { loadCanonicalReportInputs, ingestCanonicalSignals } from "../ingestion/materialized";
import { loadRegimeMachineSnapshot, saveRegimeMachineSnapshot } from "../storage/regimeMachineSnapshotStore";
import { getPostureTransitionEventRepository, buildPostureTransitionEvent } from "../storage/postureTransitionEventRepository";
import { refreshMonthlyRegimeHistory } from "../summary/refreshMonthlyRegimeHistory";
import { revalidateReportDataCaches } from "../report/cacheTags";
import { writeAnalytics } from "../telemetry/analyticsEngine";
import { scoreShadowRamps } from "../research/shadowRamps";
import { buildOperatingSnapshot } from "./snapshot";
import { getOperatingSnapshotStore } from "./snapshotStore";
import type { RefreshOperatingStateOptions, RefreshOperatingStateResult } from "./types";

export const refreshOperatingState = async (
  options: RefreshOperatingStateOptions = {},
): Promise<RefreshOperatingStateResult> => {
  const startTime = Date.now();
  const now = options.now ?? new Date();

  try {
    if (options.forceIngest) {
      await ingestCanonicalSignals({ fetcher: options.fetcher });
    }

    const canonicalInputs = await loadCanonicalReportInputs({
      fetcher: options.fetcher,
      refresh: "inline",
    });

    if (!canonicalInputs) {
      const durationMs = Date.now() - startTime;
      return {
        ok: false,
        error: "Canonical report inputs could not be loaded or ingested.",
        durationMs,
      };
    }

    const previousMachineState = await loadRegimeMachineSnapshot();
    const snapshotStore = getOperatingSnapshotStore();
    const previousSnapshot = await snapshotStore.readLatest();

    const reading = buildOperatingSnapshot({
      treasury: canonicalInputs.treasury,
      macroSeries: canonicalInputs.macroSeries,
      previousMachineState,
      now,
    });
    // The candidate ramps under test, scored after the reading is complete and stored beside it.
    // Nothing that publishes reads `shadowRamps`; a failure there drops the field, not the reading.
    const shadowRamps = scoreShadowRamps({
      treasury: canonicalInputs.treasury,
      macroSeries: canonicalInputs.macroSeries,
      previous: previousSnapshot?.shadowRamps ?? null,
    });
    const snapshot = shadowRamps ? { ...reading, shadowRamps } : reading;

    // 1. Persist immutable snapshot
    await snapshotStore.write(snapshot);

    // 2. Persist state machine snapshot
    await saveRegimeMachineSnapshot(snapshot.machineState);

    // 3. If a committed regime transition occurred, record the transition event
    let transitionEvent = null;
    const isCommittedTransition =
      snapshot.assessment.regimeTransition?.committed === true &&
      previousSnapshot !== null &&
      snapshot.assessment.regime !== previousSnapshot.assessment.regime;

    if (isCommittedTransition) {
      transitionEvent = buildPostureTransitionEvent({
        effectiveRecordDate: snapshot.recordDate,
        fromState: previousSnapshot.assessment.regime,
        toState: snapshot.assessment.regime,
        reason: snapshot.assessment.regimeTransition?.transitionReason ?? "Transition committed.",
        triggerMetrics: {
          tightness: snapshot.assessment.scores.tightness,
          riskAppetite: snapshot.assessment.scores.riskAppetite,
          thresholds: snapshot.assessment.thresholds,
          nearestThresholdDelta: snapshot.assessment.diagnostics.nearestThresholdDelta,
          transitionWatch: snapshot.assessment.diagnostics.transitionWatch,
          pendingCount: snapshot.assessment.regimeTransition?.transitionPendingCount ?? 1,
        },
      });

      const eventRepo = getPostureTransitionEventRepository();
      await eventRepo.append(transitionEvent);
    }

    // 4. Prime / refresh monthly regime history
    await refreshMonthlyRegimeHistory();

    // 5. Invalidate tag-cached report data
    await revalidateReportDataCaches();

    const durationMs = Date.now() - startTime;

    writeAnalytics(
      "ingest-pipeline",
      {
        pipeline: "refresh-operating-state",
        ok: true,
        recordDate: snapshot.recordDate,
        regime: snapshot.assessment.regime,
        inputHash: snapshot.inputHash,
        transitionCommitted: isCommittedTransition,
        durationMs,
      },
      { doubles: [durationMs] },
    );

    return {
      ok: true,
      snapshot,
      weeklyCall: snapshot.weeklyCall,
      previousSnapshot,
      transition: transitionEvent,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    writeAnalytics(
      "ingest-pipeline",
      { pipeline: "refresh-operating-state", ok: false, error: errorMessage, durationMs },
      { doubles: [0, durationMs] },
    );
    return {
      ok: false,
      error: errorMessage,
      durationMs,
    };
  }
};
