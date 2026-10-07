import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { buildWeeklyOperatorBriefPayload, buildWeeklyOperatorBriefPlainText } from "../lib/export/weeklyOperatorBrief";
import { briefSourceFromReportData, buildBriefDocument } from "../lib/report/briefDocument";
import { buildPostureStateContract, type PostureStateContract } from "../lib/report/postureStateContract";
import type { LoadReportDataSafeResult } from "../lib/report/reportData";
import { buildAssessmentFixture, buildReportDataFixture, buildTreasuryFixture } from "./fixtures/reportFixtures";

const assessment = buildAssessmentFixture();
const treasury = buildTreasuryFixture();
const reportData = buildReportDataFixture();

const postureState = buildPostureStateContract({
  assessment,
  record: treasury,
  postureLabel: "Contraction",
  decisionEventStore: [],
});

const buildReportResult = (): LoadReportDataSafeResult => ({
  ok: true,
  data: reportData,
});

describe("assembleHomePage streaming contract", () => {
  it("uses the same degradation rules in the shell and audit workspace", async () => {
    const data = buildReportDataFixture({
      sourceHealth: [
        { sourceName: "Treasury", cadenceLabel: "Intraday rates", freshnessStatus: "stale", freshnessSlaHours: 6, lastSuccessfulFetchAt: "2026-09-22T13:07:00Z", ageLabel: "2d", activeFallbackReason: null, mode: "live", expectsLive: true },
        { sourceName: "Startup/private markets", cadenceLabel: "Curated snapshot", freshnessStatus: "fresh", freshnessSlaHours: 1080, lastSuccessfulFetchAt: "2026-09-01T00:00:00Z", ageLabel: "23d", activeFallbackReason: null, mode: "snapshot", expectsLive: false },
      ],
    });
    const homepage = await assembleHomePage({ searchParams: undefined }, {
      loadHomePageReportData: async () => ({ ok: true, data }),
      buildPostureState: async () => postureState,
    });
    const workspace = await homepage.workspaceModelPromise;
    assert.deepEqual(workspace.audit.degradedSourceRows.map((row) => row.sourceName), ["Treasury"]);
  });
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
    let workspaceSettled = false;
    void homepage.diagnosticsLanePromise.then(() => {
      diagnosticsSettled = true;
    });
    void homepage.workspaceModelPromise.then(() => {
      workspaceSettled = true;
    });

    await Promise.resolve();
    await Promise.resolve();

    assert.equal(diagnosticsSettled, false);
    assert.equal(workspaceSettled, false);

    releasePostureState?.(postureState);

    const diagnosticsLane = await homepage.diagnosticsLanePromise;
    const workspaceModel = await homepage.workspaceModelPromise;
    const reportDataForCopy = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
    assert.ok(diagnosticsLane.immediateDecision.length > 0);
    const headerOperatorBriefCopy = buildWeeklyOperatorBriefPlainText(buildWeeklyOperatorBriefPayload(
      buildBriefDocument(briefSourceFromReportData(reportDataForCopy), homepage.weeklyCall),
      {
        weeklyLeadershipSummary: homepage.weeklyDecisionCardModel.decision.weeklyLeadershipSummary,
      },
    ));

    assert.ok(
      headerOperatorBriefCopy.startsWith(`Weekly Operator Brief — ${reportDataForCopy.treasury.record_date}`),
      "headed with the reading's date, not the Friday of its week",
    );
    assert.match(headerOperatorBriefCopy, /Conditions:/);
    assert.match(headerOperatorBriefCopy, /^Guidance: /m);
    assert.doesNotMatch(headerOperatorBriefCopy, /^Do now:/m, "the guidance is not repeated under a second label");
    assert.match(headerOperatorBriefCopy, /Pause if:/);
    assert.match(headerOperatorBriefCopy, /Why this could be wrong:/);
    assert.match(headerOperatorBriefCopy, /Conditions change if:/);
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

    const [diagnosticsLane, workspaceModel] = await Promise.all([
      homepage.diagnosticsLanePromise,
      homepage.workspaceModelPromise,
    ]);

    assert.ok(diagnosticsLane.immediateDecision.length > 0);
    assert.ok(workspaceModel.workspaceActions.auditHref);
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
    assert.match(homepage.interpretationLayer.summary, /how likely conditions are to change/i);
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
