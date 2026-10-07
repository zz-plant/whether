import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import type { unstable_cache } from "next/cache";
import { buildBriefEmbedData, buildBriefEmbedText } from "../app/api/embed/route";
import { buildBriefImagePayload } from "../app/api/image/brief/route";
import { buildBriefMarkdown } from "../app/brief.md/route";
import { buildAgentState } from "../lib/agentState";
import { loadAgentInterfaceContext } from "../lib/agentInterface";
import { formatGuidance } from "../lib/export/briefBuilders";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import { briefSourceFromReportData, buildBriefDocument } from "../lib/report/briefDocument";
import { deriveBriefCallFields } from "../lib/report/homeBrief/briefArtifactBuilder";
import { createHomePageReportDataLoader } from "../lib/report/homePageData";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { formatConfidenceChipLabel } from "../lib/report/reportFormatting";
import { snapshotData } from "../lib/snapshot";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";
import { macros, treasury as fixtureTreasury } from "./factories/exportFixtures";

/*
 * One week, one set of claims, every surface (docs/claims-ledger.md).
 *
 * Each claim a reader can act on has one builder, and every surface prints that
 * builder's value: the homepage card, the share card, /brief.md, the embed, the
 * brief document every paste renders, and the agent state. Until 2026-10-07 the
 * week's action had three builders. On an ordinary week the pastes led with the
 * lead area's rule while the page, the embed and the card led with the week's
 * headline; on a held week the agent state said "Conditions are easing. Grow what
 * is working" beside a hold, and the page held in other words than the pastes.
 * The surface-specific tests (Slack against email, the comparison basis, the
 * score movement, the conditions label) each hold one claim on a few surfaces;
 * this holds the claims every surface prints, on a week that is held and one
 * that is not.
 */

const uncached: typeof unstable_cache = (load) => load;
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetOperatingSnapshotStore();
});

const thisWeek = {
  record_date: "2026-10-05",
  fetched_at: "2026-10-05T12:00:00.000Z",
  isLive: true,
  fallback_at: undefined,
  fallback_reason: undefined,
};

const weeks: Array<{ name: string; treasury: TreasuryData; macroSeries: MacroSeriesReading[]; held: boolean }> = [
  { name: "an ordinary week", treasury: { ...snapshotData, ...thisWeek }, macroSeries, held: false },
  /* The export fixture's reading: its two scores disagree, so the policy layer holds it. */
  { name: "a held week", treasury: { ...fixtureTreasury, ...thisWeek }, macroSeries: macros, held: true },
];

/** Every surface, from one stored reading. */
const renderWeek = async (treasury: TreasuryData, readings: MacroSeriesReading[]) => {
  await resetOperatingSnapshotStore().write(
    buildOperatingSnapshot({ treasury, macroSeries: readings, now: new Date("2026-10-05T12:00:00.000Z") }),
  );
  globalThis.fetch = async () => {
    throw new Error("every surface reads the stored operating snapshot; nothing here reads the network");
  };
  const home = await assembleHomePage({}, { loadHomePageReportData: createHomePageReportDataLoader({ unstableCache: uncached }) });
  assert.ok(home.reportResult.ok, "the stored snapshot is a live reading");
  const reportData = home.reportResult.data;
  const embed = buildBriefEmbedData(home, { ticker: "", ref: "parity", companyStage: null });
  return {
    home,
    reportData,
    document: buildBriefDocument(briefSourceFromReportData(reportData), home.weeklyCall),
    markdown: buildBriefMarkdown(home),
    embedText: buildBriefEmbedText(embed),
    card: buildBriefImagePayload(home),
    agent: buildAgentState(await loadAgentInterfaceContext("claim-parity")),
  };
};

describe("one week, one set of claims, every surface", () => {
  for (const week of weeks) {
    describe(week.name, () => {
      it("is the week it says it is", async () => {
        const { reportData } = await renderWeek(week.treasury, week.macroSeries);
        assert.equal(reportData.assessment.policyAssessment.refusal.refused, week.held);
      });

      it("names the same conditions everywhere", async () => {
        const { reportData, home, document, markdown, embedText, card, agent } = await renderWeek(week.treasury, week.macroSeries);
        const conditions = getRegimePublicLabel(reportData.assessment.regime);

        assert.ok((home.weeklyDecisionCardModel.status.postureWithStageLabel ?? "").startsWith(conditions));
        assert.equal(document.conditions.label, conditions);
        assert.equal(agent.conditions.label, conditions);
        assert.equal(getRegimePublicLabel(card.regime), conditions);
        assert.match(markdown, new RegExp(`\\*\\*Conditions:\\*\\* ${conditions}`));
        assert.match(embedText, new RegExp(`^Conditions: ${conditions} `, "m"));
      });

      it("gives the same guidance everywhere", async () => {
        const { home, document, markdown, embedText, card, agent } = await renderWeek(week.treasury, week.macroSeries);
        const { actionNow } = home.weeklyCall;
        const guidance = formatGuidance(home.weeklyCall);

        assert.equal(formatGuidance(document.slots), guidance, "the brief document every paste renders");
        assert.ok(markdown.includes(guidance), "/brief.md");
        assert.ok(embedText.includes(`Guidance: ${guidance}`), `the embed:\n${embedText}\nexpected: ${guidance}`);
        assert.equal(deriveBriefCallFields(home.weeklyDecisionCardModel).primaryCall, actionNow, "the homepage card");
        assert.equal(card.decision, actionNow, "the share card");
        assert.equal(agent.guidance.call, actionNow, "the agent state");
      });

      it("dates and grades the reading the same everywhere", async () => {
        const { reportData, home, document, markdown, embedText, agent } = await renderWeek(week.treasury, week.macroSeries);
        const recordDate = reportData.treasury.record_date;
        const confidence = home.weeklyDecisionCardModel.status.confidenceLabel;

        assert.equal(document.provenance.recordDate, recordDate);
        assert.equal(agent.recordDate, recordDate);
        assert.match(markdown, new RegExp(`^# Whether Weekly Brief — ${recordDate}$`, "m"));
        assert.match(embedText, new RegExp(`As of ${recordDate}`));
        assert.equal(agent.confidence.label, confidence);
        assert.ok(embedText.includes(formatConfidenceChipLabel(confidence)));
      });
    });
  }
});
