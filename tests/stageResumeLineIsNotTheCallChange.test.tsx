import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { WhatWouldChangeSection } from "../app/components/home/WhatWouldChangeSection";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { KvOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { buildScopedVariantDecisionAdjustment } from "../lib/report/boundedDecisionRules";
import { deriveBriefCallFields } from "../lib/report/homeBrief/briefArtifactBuilder";
import { buildPostureStateContract } from "../lib/report/postureStateContract";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";
import { buildWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { weeklyCallChangeLines } from "../lib/report/weeklyCallContract";
import { snapshotData } from "../lib/snapshot";
import type { KvNamespace } from "../lib/runtime/kv";
import { buildReportDataFixture } from "./fixtures/reportFixtures";

/*
 * `WeeklyCallContract.changeCourseIf` used to carry two meanings. With no stage
 * it was the regime flip trigger — where the call itself changes — and every
 * surface labelled it "Call changes if". With a stage set, the stage's resume
 * discipline ("Reverse the hold only after two improving readings…") replaced
 * it, under the same label: the reader was told the call would change on a
 * condition that only lifts their own hold, and lost the line where it does
 * change. The two are separate fields now, printed under separate labels.
 */

const mockAny: any = mock;
// The section renders a descendant that reads the app router; see
// `tests/whatWouldChangeConsequence.test.tsx` for why this file installs its own.
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

const reportData = buildReportDataFixture({ fetchedAtLabel: "2026-03-01T00:00:00Z" });
const postureState = buildPostureStateContract({
  assessment: reportData.assessment,
  record: reportData.treasury,
  postureLabel: "Cloudy",
  decisionEventStore: [],
});
const flipTrigger = postureState.whatFlipsNext.flipTrigger.trim();

const snapshotFor = (startupVariantMode?: "seed") =>
  buildWeeklyBriefSnapshot({ reportData, degraded: false, postureState, startupVariantMode });

/** Each `<dt>` label in the rendered section, mapped to the text of its `<dd>`. */
const renderedConditions = (html: string) => {
  const text = (fragment: string) => fragment.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").trim();
  return new Map(
    [...html.matchAll(/<dt[^>]*>(.*?)<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/g)].map(([, label, value]) => [
      text(label).replace(/:$/, ""),
      text(value),
    ]),
  );
};

const renderSection = (snapshot: ReturnType<typeof snapshotFor>) => {
  const fields = deriveBriefCallFields(snapshot.weeklyDecisionCardModel, snapshot.weeklyCall);
  return renderToStaticMarkup(
    <WhatWouldChangeSection
      ladders={[]}
      flipProximity={[]}
      reversalTrigger={fields.reversalTriggerLabel}
      resumeWhen={fields.resumeWhenLabel}
      guardrail={fields.guardrailLabel}
      callChangeLines={{ tightness: 70, riskAppetite: 50 }}
    />,
  );
};

describe("a stage's resume line is not where the call changes", () => {
  const seedDiscipline = buildScopedVariantDecisionAdjustment({
    mode: "seed",
    thresholds: reportData.assessment.thresholds,
    scores: reportData.assessment.scores,
  }).reversalTriggerDiscipline;

  it("keeps the flip trigger under 'Call changes if' and puts the stage discipline under 'Resume when'", () => {
    const staged = snapshotFor("seed");
    assert.equal(staged.weeklyCall.callChangesIf, flipTrigger);
    assert.equal(staged.weeklyCall.resumeWhen, seedDiscipline);

    const conditions = renderedConditions(renderSection(staged));
    assert.equal(conditions.get(DECISION_CONTRACT_LABELS.watch.postureFlips), flipTrigger);
    assert.equal(conditions.get(DECISION_CONTRACT_LABELS.reversal.resumeWhen), seedDiscipline);
  });

  it("prints the same split in the copy formats", () => {
    const staged = snapshotFor("seed");
    const { briefShareLines } = deriveBriefCallFields(staged.weeklyDecisionCardModel, staged.weeklyCall);
    assert.ok(briefShareLines.includes(`${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${flipTrigger}`));
    assert.ok(briefShareLines.includes(`${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${seedDiscipline}`));
    assert.deepEqual(weeklyCallChangeLines(staged.weeklyCall), [
      { label: DECISION_CONTRACT_LABELS.watch.postureFlips, value: flipTrigger },
      { label: DECISION_CONTRACT_LABELS.reversal.resumeWhen, value: seedDiscipline },
    ]);
  });

  it("leaves the call-change line unchanged by the stage, and prints no resume line without one", () => {
    const unstaged = snapshotFor();
    assert.equal(unstaged.weeklyCall.callChangesIf, snapshotFor("seed").weeklyCall.callChangesIf);
    assert.equal(unstaged.weeklyCall.resumeWhen, undefined);

    const conditions = renderedConditions(renderSection(unstaged));
    assert.equal(conditions.get(DECISION_CONTRACT_LABELS.watch.postureFlips), flipTrigger);
    assert.equal(conditions.has(DECISION_CONTRACT_LABELS.reversal.resumeWhen), false);
  });
});

describe("a snapshot stored before the split", () => {
  it("reads its changeCourseIf as the call-change line instead of discarding the snapshot", async () => {
    const snapshot = buildOperatingSnapshot({ treasury: snapshotData, macroSeries });
    const { callChangesIf, ...rest } = snapshot.weeklyCall;
    const legacy = { ...snapshot, weeklyCall: { ...rest, changeCourseIf: callChangesIf } };
    const kv: KvNamespace = {
      get: async () => JSON.stringify(legacy),
      put: async () => {},
      list: async () => ({ keys: [], list_complete: true }),
    };

    const read = await new KvOperatingSnapshotStore(kv).readLatest();
    assert.ok(read, "a pre-split snapshot still reads");
    assert.equal(read.weeklyCall.callChangesIf, callChangesIf);
    assert.equal("changeCourseIf" in read.weeklyCall, false);
    assert.equal(read.weeklyCall.resumeWhen, undefined);
  });
});

describe("a stage on a read that projects the stored snapshot", () => {
  // The live path: the store has a snapshot, so the call is read rather than
  // built — and the stored call is stage-agnostic, because the cron has no reader.
  const stored = buildOperatingSnapshot({ treasury: snapshotData, macroSeries });
  const projected = buildReportDataFixture({
    operatingSnapshot: stored,
    projectsOperatingSnapshot: true,
  });
  const read = (startupVariantMode?: "seed") =>
    buildWeeklyBriefSnapshot({ reportData: projected, degraded: false, startupVariantMode }).weeklyCall;

  it("applies the reader's stage over the stored call and keeps the stored call-change line", () => {
    const seed = stored.weeklyCall.stageScopedAdjustments?.seed;
    assert.ok(seed);
    const staged = read("seed");
    assert.equal(staged.callChangesIf, stored.weeklyCall.callChangesIf);
    assert.equal(stored.weeklyCall.policyOverrideActive, false, "an overridden call takes no stage copy");
    assert.equal(staged.resumeWhen, seed.resumeWhen);
    assert.equal(staged.actionNow, seed.actionNow);
    assert.equal(staged.pauseIf, seed.pauseIf);
  });

  it("returns the stored call unchanged when the reader chose nothing", () => {
    assert.deepEqual(read(), stored.weeklyCall);
  });
});
