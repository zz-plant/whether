import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { buildWeeklyOperatorBriefCopyText } from "../lib/report/home/artifactPayload";
import { buildPostureStateContract, type PostureStateContract } from "../lib/report/postureStateContract";
import type { LoadReportDataSafeResult } from "../lib/report/reportData";
import { buildAssessmentFixture, buildReportDataFixture, buildTreasuryFixture } from "./fixtures/reportFixtures";

const assessment = buildAssessmentFixture();
const treasury = buildTreasuryFixture();
const reportData = buildReportDataFixture();

const postureState = buildPostureStateContract({
  assessment,
  recordDate: treasury.record_date,
  postureLabel: "Contraction",
  decisionEventStore: [],
});

const buildReportResult = (): LoadReportDataSafeResult => ({
  ok: true,
  data: reportData,
});

describe("assembleHomePage streaming contract", () => {
  it("returns the weekly call before deferred posture-state work settles", async () => {
    let releasePostureState: ((value: PostureStateContract) => void) | undefined;
    const postureStatePromise = new Promise<PostureStateContract>((resolve) => {
      releasePostureState = resolve;
    });

    const homepage = await assembleHomePage(
      { searchParams: undefined },
      {
        loadHomePageReportData: async () => buildReportResult(),
        buildPostureState: async () => postureStatePromise,
      },
    );

    assert.match(homepage.weeklyDecisionCardModel.decision.immediateDecision, /stage|revise|hold/i);
    assert.ok(homepage.reportShell.commandBar.doNow.length > 0);
    assert.equal(homepage.fallbackActive, false);

    let diagnosticsSettled = false;
    let artifactSettled = false;
    let workspaceSettled = false;
    void homepage.diagnosticsLanePromise.then(() => {
      diagnosticsSettled = true;
    });
    void homepage.leadershipArtifactPayloadPromise.then(() => {
      artifactSettled = true;
    });
    void homepage.workspaceModelPromise.then(() => {
      workspaceSettled = true;
    });

    await Promise.resolve();
    await Promise.resolve();

    assert.equal(diagnosticsSettled, false);
    assert.equal(artifactSettled, false);
    assert.equal(workspaceSettled, false);

    releasePostureState?.(postureState);

    const diagnosticsLane = await homepage.diagnosticsLanePromise;
    const artifactPayload = await homepage.leadershipArtifactPayloadPromise;
    const workspaceModel = await homepage.workspaceModelPromise;
    const reportDataForCopy = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
    assert.ok(diagnosticsLane.immediateDecision.length > 0);
    assert.ok(artifactPayload);
    assert.match(artifactPayload?.weeklyCallSnapshotText ?? "", /avoid|hiring|threshold|flip/i);
    assert.match(artifactPayload?.deltaOnlyBriefText ?? "", /DELTA-ONLY BRIEF/);
    assert.match(artifactPayload?.deltaOnlyBriefText ?? "", /Revisit now/);
    const headerOperatorBriefCopy = buildWeeklyOperatorBriefCopyText({
      assessment: reportDataForCopy.assessment,
      treasury: reportDataForCopy.treasury,
      date: reportDataForCopy.weeklyRecordDate,
      postureWithStageLabel: homepage.weeklyDecisionCardModel.status.postureWithStageLabel,
      confidenceLabel: homepage.weeklyDecisionCardModel.status.confidenceLabel,
      actionStripItems: homepage.weeklyDecisionCardModel.decision.actionStripItems,
      flipConditionLabels: homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels,
      weeklyCall: homepage.weeklyCall,
    });

    assert.match(headerOperatorBriefCopy, /Weekly Operator Brief/);
    assert.match(headerOperatorBriefCopy, /Current call:/);
    assert.match(headerOperatorBriefCopy, /Action now:/);
    assert.match(headerOperatorBriefCopy, /Pause if:/);
    assert.match(headerOperatorBriefCopy, /Why this could be wrong:/);
    assert.match(headerOperatorBriefCopy, /Change course if:/);
    assert.equal(artifactPayload?.weeklyOperatorBriefText, headerOperatorBriefCopy);
    assert.equal(workspaceModel.workspaceActions.auditHref, "#audit-this-call");
    assert.equal(workspaceModel.operations.continueHref, "/operations#ops-monthly-action-summary");
    assert.match(workspaceModel.translate.primaryPath.href, /^\/decide\//);
    assert.match(workspaceModel.translate.fallbackUtility.href, /^\/decide\//);
    assert.ok(workspaceModel.translate.toolkitShortcuts.length > 0);
  });

  it("parses interpretation view from search params without changing the canonical weekly call", async () => {
    const homepage = await assembleHomePage(
      { searchParams: { view: "forecast", month: "3", year: "2026" } },
      {
        loadHomePageReportData: async () => buildReportResult(),
        buildPostureState: async () => postureState,
      },
    );

    assert.equal(homepage.interpretationLayer.view, "forecast");
    assert.equal(homepage.interpretationSearchParams?.view, "forecast");
    assert.equal(homepage.interpretationSearchParams?.month, "3");
    assert.match(homepage.interpretationLayer.summary, /boundary|flip|momentum/i);
    assert.match(homepage.weeklyDecisionCardModel.decision.immediateDecision, /stage|revise|hold/i);
  });
});
