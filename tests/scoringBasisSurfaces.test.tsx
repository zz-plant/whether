import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustStrip } from "../app/components/trustStrip";
import { FormulaReference } from "../app/trust/formulaReference";
import { buildAgentInterfaceFromContext, loadAgentInterfaceContext } from "../lib/agentInterface";
import { agentStateSchema, buildAgentState } from "../lib/agentState";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { buildInvestorUpdateSnippetParts, formatInvestorUpdateSnippet } from "../lib/export/investorUpdateSnippet";
import { buildWeeklyOperatorBriefPayload, buildWeeklyOperatorBriefPlainText } from "../lib/export/weeklyOperatorBrief";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { DEFAULT_THRESHOLDS, ENGINE_VERSION, evaluateRegime } from "../lib/regimeEngine";
import { BRIEF_FORMATS, briefArtifactToSlidePayload, formatBriefArtifact } from "../lib/report/briefArtifact";
import { briefArtifactOf, briefSourceFromSnapshot, buildBriefDocument } from "../lib/report/briefDocument";
import { buildTrustStripProps } from "../lib/report/evidenceReaderModel";
import { buildPublishedBriefEmailUpdate, buildPublishedBriefSlackUpdate, findPublishedBrief } from "../lib/report/publishedBriefs";
import { resolveScoringBasis } from "../lib/report/scoringBasis";
import { formatMeetingSlideMarkdown } from "../lib/export/meetingSlideExport";
import { snapshotData } from "../lib/snapshot";
import { buildReportDataFixture, liveMacroSeries } from "./fixtures/reportFixtures";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * Every call states its basis (2026-10-09): the status strip, the published
 * brief, /trust, every paste and the email, and `scoringBasis` in the API and
 * MCP answers. The bundled reading is the one these read: its curated
 * startup-market inputs take risk appetite from 52 to 41, across its change
 * line, so it carries a warning too.
 */
const RECORD = "Scored on the record's inputs.";
const WARNING = "Startup-market inputs would put risk appetite at 41, below its change line.";

const liveSnapshot = () =>
  buildOperatingSnapshot({
    treasury: { ...snapshotData, isLive: true, fallback_at: undefined, fallback_reason: undefined, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
    macroSeries: liveMacroSeries,
    now: new Date("2026-08-31T12:00:00.000Z"),
  });

describe("the basis on every surface", () => {
  it("is in the status strip, with the warning, on every route that builds one", () => {
    const assessment = evaluateRegime(snapshotData, DEFAULT_THRESHOLDS, macroSeries);
    const reportData = buildReportDataFixture({ assessment });
    assert.equal(reportData.scoringBasis.warning, WARNING);
    const html = renderToStaticMarkup(
      <TrustStrip
        {...buildTrustStripProps({
          recordDateLabel: reportData.recordDateLabel,
          isFallback: false,
          confidenceLabel: "MED",
          assessment,
          scoringBasis: reportData.scoringBasis,
        })}
      />,
    );
    assert.match(html, /<dt[^>]*>Scored on<\/dt><dd[^>]*>The record(&#x27;|')s inputs<span[^>]*data-basis-warning/);

    /* A phone's one-line strip prints the warning's four-word form, with the full
       sentence from sm (2026-10-27): it ran four lines of every phone intro. */
    assert.equal(reportData.scoringBasis.warningShort, "startup-market inputs left out");
    const line = renderToStaticMarkup(
      <TrustStrip
        {...buildTrustStripProps({
          recordDateLabel: reportData.recordDateLabel,
          isFallback: false,
          confidenceLabel: "MED",
          assessment,
          scoringBasis: reportData.scoringBasis,
        })}
        phoneLayout="line"
        href="/trust"
      />,
    );
    assert.match(line, /<span class="sm:hidden" data-basis-short="true">startup-market inputs left out<\/span><span class="max-sm:hidden">Startup-market inputs would put risk appetite at 41/);
    assert.match(html, /Startup-market inputs would put risk appetite at 41, below its change line\./);

    for (const path of [
      "app/page.tsx",
      "app/trust/trustPageModel.ts",
      "app/signals/evidencePageModel.ts",
      "app/signals/[cluster]/page.tsx",
      "app/operate/planningPageModel.ts",
      "app/answers/decisionAnswerPageContent.tsx",
    ]) {
      assert.match(readFileSync(path, "utf8"), /scoringBasis: reportData\.scoringBasis/, `${path} hands the strip its basis`);
    }
    /* The homepage alone says why the live conditions differ from the published week's. */
    assert.match(readFileSync("app/page.tsx", "utf8"), /basisNote: historicalSelection\s*\? null\s*: describeCitableBriefBasis\(/);
  });

  it("is on a published brief, from the engine its record names, without editing the record", async () => {
    const page = await import("../app/brief/[week]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ week: "2026-w41" }) }));
    const card = html.slice(html.indexOf('id="share-ready-artifact"'), html.indexOf("What changed this week"));
    assert.match(card, /Scored on more inputs than the record/, "a week frozen before the record basis says it counted more");

    const w41 = findPublishedBrief("2026-w41");
    assert.ok(w41);
    assert.match(buildPublishedBriefSlackUpdate(w41), /· scored on more inputs than the record$/m);
    assert.match(buildPublishedBriefEmailUpdate(w41), /^• Scored on more inputs than the record\.$/m);
  });

  it("is on /trust, with what this week's inputs outside the record would make the scores", () => {
    const assessment = evaluateRegime(snapshotData, DEFAULT_THRESHOLDS, macroSeries);
    const html = renderToStaticMarkup(
      <FormulaReference scoringBasis={resolveScoringBasis({ engineVersion: ENGINE_VERSION, assessment })} />,
    );
    assert.match(html, /id="record-basis"/);
    assert.match(html, /Count only what the record can test\./);
    assert.match(html, /Interest rates, the yield curve, the pace of rate rises, stock-market volatility \(the VIX\) and the Chicago Fed financial conditions index move the scores\./);
    assert.match(html, /The high-yield credit spread has public history only from October 2023; the venture funding pace and the tech-layoff trend are curated snapshots with no history to test\. We score and show each of them, but none of them moves the scores\./);
    assert.match(html, /This week they would put risk appetite at 41, where the published score is 52\./);
  });

  it("is in every paste and in the email", async () => {
    const snapshot = liveSnapshot();
    const document = buildBriefDocument(briefSourceFromSnapshot(snapshot), snapshot.weeklyCall);
    assert.equal(document.provenance.scoringBasis.sentence, RECORD);

    const island = briefArtifactOf(document);
    for (const format of BRIEF_FORMATS) {
      assert.match(formatBriefArtifact(island, format.id, "https://origin.test"), /scored on the record's inputs/, `the ${format.label} paste`);
    }
    assert.match(formatMeetingSlideMarkdown(briefArtifactToSlidePayload(island)), /scored on the record's inputs/, "the slide");

    const slack = buildSlackBrief(document);
    assert.match(slack, /Margin: [^\n]* · Scored on the record's inputs$/m, "the Monday post's stamp");
    assert.match(slack, new RegExp(`^• ${WARNING.replace(/[.()]/g, "\\$&")} They are left out because they can't be scored against past month-ends\\.$`, "m"), "and why it could be wrong");
    assert.match(slack, /^Not counted: risk appetite -11 from startup-market inputs\.$/m, "under what moved the scores");

    assert.match(buildWeeklyOperatorBriefPlainText(buildWeeklyOperatorBriefPayload(document)), /^Scored on the record's inputs\.$/m, "the operator brief");
    assert.match(formatInvestorUpdateSnippet(buildInvestorUpdateSnippetParts(document, []), null), /scored on the record's inputs\./, "the investor update");

    const { sendWeeklyBrief } = await import("../lib/email/sendWeeklyBrief");
    const { getSubscriberStore, resetSubscriberStore } = await import("../lib/email/subscriberStore");
    resetSubscriberStore();
    const store = getSubscriberStore();
    const subscriber = await store.subscribe("operator@example.com");
    await store.verifyEmail(subscriber.confirmToken ?? "");
    const mailed: Array<{ text: string; html: string }> = [];
    Reflect.set(globalThis, "EMAIL", { send: async (message: { text: string; html: string }) => void mailed.push(message) });
    try {
      const sent = await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: new Date("2026-08-31T12:00:00.000Z") });
      assert.equal(sent.sent, 1, sent.error);
    } finally {
      Reflect.deleteProperty(globalThis, "EMAIL");
      resetSubscriberStore();
    }
    assert.match(mailed[0]?.text ?? "", new RegExp(`^${RECORD} ${WARNING}$`.replace(/[()]/g, "\\$&"), "m"), "the email's text");
    assert.match(mailed[0]?.html ?? "", /Scored on the record(&#39;|&#x27;|')s inputs\./, "and its HTML");
  });

  it("is an additive field in the API and MCP answers, beside every field they had", async () => {
    const context = await loadAgentInterfaceContext("test");
    const state = buildAgentState(context);
    assert.deepEqual(agentStateSchema.parse(state), state, "the published schema describes it");
    assert.equal(state.scoringBasis.key, "record");
    assert.equal(state.scoringBasis.label, "Scored on the record's inputs");
    assert.equal(state.scoringBasis.warning, context.reportData.scoringBasis.warning);
    assert.deepEqual(state.scores.riskAppetite.moved.map((part) => part.source).includes("startupMarket"), false, "no part of a move is an input left out");

    const brief = buildAgentInterfaceFromContext("weekly", context);
    assert.deepEqual(brief.scoringBasis, state.scoringBasis, "the full brief carries the same field");

    assert.match(readFileSync("app/api/scores/route.ts", "utf8"), /scoringBasis: toScoringBasisPayload\(reportData\.scoringBasis\),/, "/api/scores");
  });
});
