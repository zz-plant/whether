import { getOperatingSnapshotStore } from "../operatingState/snapshotStore";
import { loadCanonicalReportInputs } from "../ingestion/materialized";
import { buildOperatingSnapshot } from "../operatingState/snapshot";
import type { OperatingSnapshot } from "../operatingState/types";
import type { StartupVariantMode } from "../report/boundedDecisionRules";
import { briefArtifactToSlidePayload } from "../report/briefArtifact";
import { briefSourceFromSnapshot, buildBriefDocument } from "../report/briefDocument";
import type { MeetingSlidePayload } from "./meetingSlideExport";

/**
 * The snapshot an export route draws from: the stored one, or one built from
 * the materialized inputs when nothing has been stored yet. Shared by the SVG
 * slide and the board slide files so the two cannot read different weeks.
 * `refresh: "none"` keeps an export off the ingest path, per AGENTS.md.
 */
export const loadExportSnapshot = async (): Promise<OperatingSnapshot | null> => {
  const stored = await getOperatingSnapshotStore().readLatest();
  if (stored) return stored;

  const inputs = await loadCanonicalReportInputs({ refresh: "none" });
  if (!inputs) return null;
  return buildOperatingSnapshot({ treasury: inputs.treasury, macroSeries: inputs.macroSeries });
};

/**
 * The slide the SVG, PPTX and PDF routes draw: the snapshot's brief document,
 * laid over the reader's stage, through the same adapter the share panel's
 * "Slide" format uses.
 *
 * `stage` is null when the reader chose none. It used to default to "seed", so
 * every slide, PPTX and PDF reached without a `?stage=` was titled as a
 * seed-stage company's — a fact about the reader the site never asked for. No
 * stage means no stage on the slide.
 */
export const buildExportSlidePayload = (
  snapshot: OperatingSnapshot,
  stage: StartupVariantMode | null,
): MeetingSlidePayload =>
  briefArtifactToSlidePayload(buildBriefDocument(briefSourceFromSnapshot(snapshot), snapshot.weeklyCall, { stage }));
