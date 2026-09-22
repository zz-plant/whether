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
    assert.match(artifactPayload?.weeklyCallSnapshotText ?? "", /PAUSE IF: /);
    assert.match(artifactPayload?.deltaOnlyBriefText ?? "", /DELTA-ONLY BRIEF/);
    assert.match(artifactPayload?.deltaOnlyBriefText ?? "", /Revisit now/);
    /* The board note is read cold. Every slot uses the page's name and carries
       its meaning; the retired names and a percent confidence must not return. */
    const boardNote = artifactPayload?.boardSnippetText ?? "";
    assert.match(boardNote, /^DATA: (Live, as of|Saved copy from) /m);
    assert.match(boardNote, /^OPERATING LATITUDE: \d+\/100 \(room to hire, spend and commit; higher means more room\) · vs last week: /m);
    assert.match(boardNote, /^CONDITIONS: (Sunny|Cloudy|Stormy|Freezing)[^\n]*\((money|conditions) [^)]+\) · (High|Medium|Low) confidence$/m);
    assert.match(boardNote, /^PAUSE IF: /m);
    assert.match(boardNote, /^CALL CHANGES IF: /m);
    assert.doesNotMatch(boardNote, /BOLDNESS|FLIP:|GUARDRAIL:|POSTURE:|TRUST:|FALLBACK|SNAPSHOT|\d+% confidence|\b(HIGH|MED|LOW)\b/);
    assert.doesNotMatch(boardNote, /PAUSE IF: Pause /);
    assert.doesNotMatch(artifactPayload?.weeklyCallSnapshotText ?? "", /AVOID:|WATCH:|\d+%/);
    const headerOperatorBriefCopy = buildWeeklyOperatorBriefCopyText({
      assessment: reportDataForCopy.assessment,
      treasury: reportDataForCopy.treasury,
      date: reportDataForCopy.weeklyRecordDate,
      postureWithStageLabel: homepage.weeklyDecisionCardModel.status.postureWithStageLabel,
      confidenceLabel: homepage.weeklyDecisionCardModel.status.confidenceLabel,
      actionStripItems: homepage.weeklyDecisionCardModel.decision.actionStripItems,
      flipConditionLabels: homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels,
      weeklyCall: homepage.weeklyCall,
      weeklyLeadershipSummary: homepage.weeklyDecisionCardModel.decision.weeklyLeadershipSummary,
    });

    assert.match(headerOperatorBriefCopy, /Weekly Operator Brief/);
    assert.match(headerOperatorBriefCopy, /Conditions:/);
    assert.match(headerOperatorBriefCopy, /Do now:/);
    assert.match(headerOperatorBriefCopy, /Pause if:/);
    assert.match(headerOperatorBriefCopy, /Why this could be wrong:/);
    assert.match(headerOperatorBriefCopy, /Call changes if:/);
    assert.equal(artifactPayload?.weeklyOperatorBriefText, headerOperatorBriefCopy);
    assert.equal(workspaceModel.workspaceActions.auditHref, "#audit-this-call");
    assert.equal(workspaceModel.operations.continueHref, "/operate#ops-monthly-action-summary");
    assert.match(workspaceModel.translate.primaryPath.href, /^\/resolve\//);
    assert.equal(workspaceModel.translate.fallbackUtility.href, "/resolve#direct-answers");
    assert.ok(workspaceModel.translate.toolkitShortcuts.length > 0);
  });

  it("does no enrichment work for consumers that never read the promises", async () => {
    // Eight routes call this assembler and none of them read these promises.
    // Eagerly built, every one of them paid for a decision-events query and the
    // support-model build, then threw the result away.
    let postureStateCalls = 0;
    const homepage = await assembleHomePage(
      { searchParams: undefined },
      {
        loadHomePageReportData: async () => buildReportResult(),
        buildPostureState: async () => {
          postureStateCalls += 1;
          return postureState;
        },
      },
    );

    assert.ok(homepage.weeklyDecisionCardModel);
    await Promise.resolve();
    assert.equal(postureStateCalls, 0, "enrichment ran for a consumer that never asked for it");
  });

  it("enriches once however many of the deferred models are read", async () => {
    let postureStateCalls = 0;
    const homepage = await assembleHomePage(
      { searchParams: undefined },
      {
        loadHomePageReportData: async () => buildReportResult(),
        buildPostureState: async () => {
          postureStateCalls += 1;
          return postureState;
        },
      },
    );

    const [diagnosticsLane, workspaceModel, artifactPayload] = await Promise.all([
      homepage.diagnosticsLanePromise,
      homepage.workspaceModelPromise,
      homepage.leadershipArtifactPayloadPromise,
    ]);

    assert.ok(diagnosticsLane.immediateDecision.length > 0);
    assert.ok(workspaceModel.workspaceActions.auditHref);
    assert.ok(artifactPayload);
    assert.equal(postureStateCalls, 1, "enrichment ran more than once");
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
    assert.match(homepage.interpretationLayer.summary, /how likely this call is to change/i);
    assert.match(homepage.weeklyDecisionCardModel.decision.immediateDecision, /stage|revise|hold/i);
  });

  it("calibrates the brief to the stage cookie when the URL names none, and lets the URL win", async () => {
    const dependencies = {
      loadHomePageReportData: async () => buildReportResult(),
      buildPostureState: async () => postureState,
    };

    const untouched = await assembleHomePage({ searchParams: undefined }, dependencies);
    assert.equal(untouched.weeklyDecisionCardModel.decision.startupVariantPolicy.selectedMode, "series-a");

    // The settings panel and the hero selector both write this cookie; before
    // this it was parsed on every request and read by nothing.
    const fromCookie = await assembleHomePage(
      { searchParams: undefined, operatorContext: { companyStage: "bootstrapped", companyRunway: null, ticker: null } },
      dependencies,
    );
    assert.equal(fromCookie.weeklyDecisionCardModel.decision.startupVariantPolicy.selectedMode, "bootstrapped");

    const fromUrl = await assembleHomePage(
      { searchParams: { stage: "seed" }, operatorContext: { companyStage: "bootstrapped", companyRunway: null, ticker: null } },
      dependencies,
    );
    assert.equal(fromUrl.weeklyDecisionCardModel.decision.startupVariantPolicy.selectedMode, "seed");
  });
});
