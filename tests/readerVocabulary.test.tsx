import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";

import { answerPages } from "../app/answers/decisionPages";
import { signalScenarioRoutes } from "../app/seoRouteClusters";
import { toolkitDefinitions } from "../lib/decisionDomainCatalog";
import { buildBoardSlideBullets, buildCallCitation, buildSlackBrief } from "../lib/export/briefBuilders";
import { buildIssueTrackerMarkdownBrief } from "../lib/export/issueTrackerBrief";
import { buildWeeklyOperatorBriefPayload, buildWeeklyOperatorBriefPlainText } from "../lib/export/weeklyOperatorBrief";
import {
  formatMeetingSlideHtml,
  formatMeetingSlideMarkdown,
  formatMeetingSlideSvg,
} from "../lib/export/meetingSlideExport";
import { buildExportSlidePayload } from "../lib/export/exportSnapshot";
import { buildInvestorUpdateSnippetParts, formatInvestorUpdateSnippet } from "../lib/export/investorUpdateSnippet";
import { buildPortfolioNote } from "../lib/export/portfolioNote";
import { buildPublishedBriefEmailUpdate, buildPublishedBriefSlackUpdate, latestPublishedBrief } from "../lib/report/publishedBriefs";
import { decisionVerdictEmail, flashMoveEmail, planLineEmail, thresholdCrossingEmail } from "../lib/alert/alertTemplates";
import { publishedScoreLines } from "../lib/alert/alertEvaluator";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { buildRecordSummary } from "../app/components/history/ExportBoardAnnexButton";
import type { TrackRecord } from "../lib/report/trackRecord";
import type { RunwayBand } from "../lib/report/operatorRunway";
import { assessment, fixtureBriefDocument, fixtureWeeklyCall, treasury, macros } from "./factories/exportFixtures";
import { renderOgElement } from "../app/api/og/renderOgElement";
import { collectPageShareCards } from "./fixtures/pageShareCards";
import { SearchResults } from "../app/search/searchResults";
import { evaluateRegime } from "../lib/regimeEngine";
import { REGIME_ORDER } from "../lib/regimePresentation";
import { buildSignalAlertPayload, buildWeeklyDigest } from "../lib/signalOps";
import { buildMonthlySummary } from "../lib/summary/monthlySummary";
import { buildQuarterlySummary } from "../lib/summary/quarterlySummary";
import { buildWeeklyStructured, buildWeeklySummary } from "../lib/summary/weeklySummary";
import { buildYearlySummary } from "../lib/summary/yearlySummary";
import { RegimeRadar } from "../app/components/home/RegimeRadar";
import { DecisionPicker } from "../app/components/home/DecisionPicker";
import { ConditionsLegend } from "../app/components/home/ConditionsLegend";
import { CompanyCalibration } from "../app/components/home/CompanyCalibration";
import { AlertSection } from "../app/components/home/AlertSection";
import { decisionAreaOrder } from "../lib/report/boundedDecisionRules";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * A copy audit on 2026-09-22 read every route and every artifact that leaves the site and
 * found the same problem on nearly all of them: the engine's names for things reached a reader.
 * Four vocabularies for the four market states, "posture" as the load-bearing noun with a
 * definition one click away, infrastructure words on the trust and signals pages, mechanism
 * names offered as explanation on the method pages, and an approvals-committee register that
 * assumed a board, a CEO and a finance lead.
 *
 * Every ratchet this repo already has — lint, types, the suite, dead exports, the suppression
 * census — was green through all of it, because a word is not a finding to any of them. This
 * file is the one that counts words. It renders what it judges, the way
 * tests/answerPageReaderCopy.test.tsx does, and applies two kinds of rule:
 *
 * - Banned outright: a word that is never the reader's. An engine key, an infrastructure noun,
 *   a mechanism name, a fixture company's figures, a UI implementation detail.
 * - Ratcheted: a word that has a place on some surface but was doing a plain sentence's work
 *   on all of them. The count may fall and may not rise,
 *   the way scripts/census.config.ts holds the suppression census's. Lower the baseline when
 *   work earns it; raising one is a decision and belongs in its own PR with the reason.
 *
 * Routes behind the report read path stay out (they suspend at their data boundary offline;
 * docs/agents/lessons/tests-and-copy-rules.md records why). Everything here renders from the bundled snapshot or from a fixture.
 */

const BANNED: { name: string; pattern: RegExp }[] = [
  { name: "engine key", pattern: /\b(SCARCITY|DEFENSIVE|VOLATILE|EXPANSION)\b/ },
  { name: "engine score name", pattern: /\b(tightness|riskAppetite|noindex)\b/ },
  /* "canonical" since 2026-10-07: every summary's source line read "Canonical ingestion (FRED)"
     and the saved snapshot's "Canonical snapshot (FRED)", the pipeline's names for itself. */
  {
    name: "infrastructure",
    pattern: /\b(pipeline|payload|replay|audit trail|outage mode|policy override|ingestion|canonical|telemetry|worker|cron|isolate)\b/i,
  },
  { name: "mechanism name", pattern: /\b(hysteresis|confirmation gate|dwelt|whipsaw|classification line)\b/i },
  {
    name: "fixture company",
    pattern: /Financial implications|Runway risk:|Raise window:|Burn adjustment:|CEO \+ Finance|Mon\/Thu|Executive Stance|Seed Stage|Board of Directors/,
  },
  /* "Risk-On or Risk-Off" is the market idiom a searcher types, and the title of the page that
     answers it; "Risk-On" alone is the engine's old name for a pace. Any case since 2026-10-07:
     the weekly paste printed "⚠️ RISK-OFF / CAPITAL-TIGHT" past a rule that only knew
     "Capital-Tight", because no summary was a surface here either. ("MONTHLY POSTURE" and
     "Capital Posture Governance" are the "posture" ratchet's, which already ignores case.) */
  {
    name: "policy-engine vocabulary",
    pattern: /\b(policy signals|policy override|Safety Mode|Risk-On(?!\s+or\s+Risk-Off)|(?<!Risk-On\s+or\s+)Risk-Off|Risk-Selective|Capital-Tight|Capital-Loose)\b/i,
  },
  { name: "UI implementation detail", pattern: /\bYCURVE\b|1\.91:1|16:9|without a reload|hidden by default/ },
  /* The retired names for the three lines and the latitude score (2026-09-22). Each had a
     glossary entry whose job was telling it apart from its neighbour; the names that replaced
     them say what happens, so the entries went with the page. */
  {
    name: "retired line name",
    pattern: /\b(Re-open when|Change course if|Clears (only )?when|[Ww]atch lines?|Posture flips|Flip watch|Flip trigger|GUARDRAIL:|FLIP:|AVOID:)/,
  },
  /* Any case: the compare card printed "boldness -19" in lower case, past a rule that
     only knew the capitalised forms. */
  { name: "retired score name", pattern: /\b(boldness|latitude signal)\b/i },
  { name: "glossary pointer", pattern: /\b(Open the glossary|Full glossary|Look up a term|What these terms mean)\b/ },
  /* One vocabulary (2026-10-09). The five areas are Hiring, Roadmap, Fundraising,
     Spending and New bets (`decisionAreaLabel`); the picker offered verb phrases
     ("Raise money") and /operate/scenarios a second table ("Investment pace"), so a
     reader met two names for each area. Capitalised forms are the labels; the
     lower-case coinages never were prose. "Approve new spend only if…" is the
     spending rule's sentence as frozen briefs before 2026-10-09 recorded it, which
     is a rule, not a label, and a record is not rewritten. */
  {
    name: "retired area name",
    pattern:
      /\b(Change the roadmap|Product tempo|Raise money|Capital raising|Approve new spend(?! only)|Burn discipline|Investment pace|Start something new|Expansion bets|Hire someone)\b|\b(product tempo|burn discipline|expansion bets|investment pace)\b/,
  },
  /* The three lines are the pause line, the resume line and the change line.
     "Threshold", "reversal" and "boundary" named the same lines on the chart titles,
     the brief's ladders ("Trigger at 76. Reversal at 66.") and the export slots. */
  {
    name: "retired line word",
    pattern: /\b(Threshold|Reversal)\s*:|\b(Trigger|Reversal) at \d|\b(boundary|boundaries)\b|\bnear-threshold\b|\bAgainst its threshold\b|\breversal (trigger|condition)s?\b/i,
  },
  { name: "retired signal name", pattern: /\bCapital tightness\b|\bRecession warning watch\b/i },
  /* The margin (2026-10-09). "Confidence: Low" beside "Freeze new commitments" read
     as the product doubting its advice; the number is a distance from the change
     line (/calibration), so it is shown as one. The API field keeps `confidence`. */
  {
    name: "confidence as a display label",
    pattern:
      /\b(High|Medium|Low|reduced|Guarded|recommendation) confidence\b|\bConfidence\s*[:(]|\bConfidence (High|Medium|Low)\b|\bconfidence (is|was|now|drops?|dropped)\b|\bconfidence (label|number|score|figure|record)\b|\bat (high|medium|low) confidence\b/i,
  },
  /* The header's names are This week, Decide, Record and Guides
     (lib/navigation/informationArchitecture.ts). Search results, the answer pages and the 404
     page still said "Decision Tools", and the resource CTAs "Open Planning", until 2026-10-06.
     A link's label for a route is held to that route's one name by
     tests/navigationTargets.test.tsx, which can see the href a label points at. */
  { name: "retired nav name", pattern: /\bDecision Tools\b|\b(Open|in) Planning\b/ },
];

/*
 * Counted, not banned. Baselines are the counts on the day the rule landed; each may only
 * fall. Matching is case-insensitive and on whole words, over the rendered text with tags and
 * script islands removed, so a JSON-LD block or an id does not count as a sentence.
 */
const RATCHET: { name: string; pattern: RegExp; baseline: number }[] = [
  /* 2026-10-04: baselines tightened to the totals the report flag prints after
     the merged copy work (posture 4, regime 0, bounded 0, stance 0). The
     homepage and its components are not rendered here, so a wording fix there
     does not move these numbers — only work on the counted surfaces does. */
  /* 2026-10-08: posture 4 → 6 and board 10 → 11 without a word added to the site. Guides
     (/resources, counted here) took the four templates from the plan page and the "Help by
     role" chips from /resolve, neither of which this file renders: two template titles carry
     "Posture" and one role chip reads "Board". Lower these when that copy moves. */
  { name: "posture", pattern: /\bposture\b/gi, baseline: 6 },
  { name: "regime", pattern: /\bregime\b/gi, baseline: 0 },
  { name: "corridor", pattern: /\bcorridor\b/gi, baseline: 0 },
  { name: "cadence", pattern: /\bcadence\b/gi, baseline: 0 },
  { name: "discipline", pattern: /\bdiscipline\b/gi, baseline: 5 },
  { name: "bounded", pattern: /\bbounded\b/gi, baseline: 0 },
  { name: "stance", pattern: /\bstance\b/gi, baseline: 0 },
  { name: "flip", pattern: /\bflips?\b/gi, baseline: 0 },
  { name: "board", pattern: /\bboard\b/gi, baseline: 11 },
  /* "The call" did three jobs — the recommendation, the market state and the line between
     states — and was retired on 2026-09-23 for "guidance", "conditions" and "the change line"
     (lib/report/AGENTS.md). Counted in those senses only, so the verb ("call for") and a
     person's own decision ("a risky call") do not. */
  {
    name: "the call",
    pattern: /\b(the|this week's|this week’s|weekly|published|monthly|quarterly|live|week's) calls?\b|\bcalls? chang(e|es|ed)\b/gi,
    baseline: 0,
  },
];

/*
 * Abbreviations may appear only after their expansion on the same surface. The expansion
 * strings are what the site uses when it does expand them.
 */
const ABBREVIATIONS: { short: RegExp; long: RegExp }[] = [
  { short: /\bFRED\b/, long: /St\. Louis Fed|Federal Reserve Economic Data/ },
  { short: /\bWoW\b/, long: /week over week/i },
  { short: /\bbps\b/, long: /basis points?/i },
  { short: /\bGTM\b/, long: /go-to-market|sales and marketing/i },
  { short: /\bZIRP\b/, long: /zero[- ]rate/i },
  { short: /\bDRI\b/, long: /directly responsible/i },
  { short: /\bSLA\b/, long: /service[- ]level|response time/i },
];

/**
 * Rendered HTML to the words a reader sees: scripts, styles and tags out, entities decoded.
 * `<code>` and `<pre>` go too: an API signature on /api-docs names the parameter the API actually
 * takes, and rewording it would misdocument the contract.
 */
const visibleText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(code|pre)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, "’")
    .replace(/\s+/g, " ");

type Surface = { name: string; text: () => Promise<string> | string };

const routeSurfaces: Surface[] = [
  ...answerPages.map((page) => ({
    name: `/answers/${page.slug}`,
    text: async () => {
      const { DecisionAnswerPageContent } = await import("../app/answers/decisionAnswerPageContent");
      return visibleText(renderToStaticMarkup(await DecisionAnswerPageContent({ slug: page.slug, route: `/answers/${page.slug}` })));
    },
  })),
  ...toolkitDefinitions.map((toolkit) => ({
    name: `/toolkits/${toolkit.slug}`,
    text: async () => {
      const page = await import("../app/toolkits/[slug]/page");
      return visibleText(renderToStaticMarkup(await page.default({ params: Promise.resolve({ slug: toolkit.slug }) })));
    },
  })),
  /* The engine key reached these as "Call SCARCITY" while no guard rendered them. */
  ...signalScenarioRoutes.map((route) => ({
    name: `/signals/${route.signalSlug}/${route.decisionScenario}`,
    text: async () => {
      const page = await import("../app/signals/[cluster]/[decision-scenario]/page");
      const params = Promise.resolve({ cluster: route.signalSlug, "decision-scenario": route.decisionScenario });
      return visibleText(renderToStaticMarkup(await page.default({ params })));
    },
  })),
  { name: "/about", text: async () => visibleText(renderToStaticMarkup((await import("../app/about/page")).default())) },
  { name: "/contact", text: async () => visibleText(renderToStaticMarkup((await import("../app/contact/page")).default())) },
  { name: "/privacy", text: async () => visibleText(renderToStaticMarkup((await import("../app/privacy/page")).default())) },
  { name: "/resources", text: async () => visibleText(renderToStaticMarkup(await (await import("../app/resources/page")).default({}))) },
  { name: "/calibration", text: async () => visibleText(renderToStaticMarkup((await import("../app/calibration/page")).default())) },
  { name: "/concepts", text: async () => visibleText(renderToStaticMarkup((await import("../app/concepts/page")).default())) },
  { name: "/api-docs", text: async () => visibleText(renderToStaticMarkup((await import("../app/api-docs/page")).default())) },
  { name: "/404", text: async () => visibleText(renderToStaticMarkup((await import("../app/not-found")).default())) },
  {
    name: "/resources/decision-shield-overview",
    text: async () => visibleText(renderToStaticMarkup(await (await import("../app/resources/decision-shield-overview/page")).default())),
  },
  /* The homepage suspends at its data boundary here, so its components render on their own. */
  {
    name: "/ conditions chart",
    text: () =>
      visibleText(
        renderToStaticMarkup(
          <RegimeRadar tightness={90} riskAppetite={49} tightnessThreshold={70} riskAppetiteThreshold={50} currentRegime="SCARCITY" />,
        ),
      ),
  },
  {
    name: "/ decision picker",
    text: () =>
      visibleText(
        renderToStaticMarkup(
          <DecisionPicker
            options={decisionAreaOrder.map((area) => ({ area, rule: "Rule", pause: undefined, resume: undefined }))}
            regime="SCARCITY"
           
          />,
        ),
      ),
  },
  {
    name: "/ legend, stage and runway, alert",
    text: () =>
      visibleText(
        renderToStaticMarkup(
          <>
            <ConditionsLegend thresholds={{ tightnessRegime: 70, riskAppetiteRegime: 50 }} currentRegime="SCARCITY" />
            <CompanyCalibration stageLabel="Series A" activeStage="series-a" />
            <AlertSection />
          </>,
        ),
      ),
  },
  /* One query reaching the role-and-stage and toolkit entries, whose title and summary named the old hub. */
  { name: "/search?q=guides toolkits", text: () => visibleText(renderToStaticMarkup(<SearchResults initialQuery="guides toolkits" />)) },
];

const snapshot = buildOperatingSnapshot({ treasury, macroSeries: macros });
/* The slide routes draw the stored snapshot; this one carries the same reading and call the
   other export surfaces print. */
const fixtureSnapshot = { ...snapshot, assessment, weeklyCall: fixtureWeeklyCall() };
const record: TrackRecord = {
  monthsCovered: 176,
  firstRecordDate: "2012-01-31",
  latestRecordDate: "2026-08-31",
  currentHoldMonths: 8,
  currentHoldStartDate: "2026-01-31",
  regimeChanges: 6,
  lineCrossingMonths: 22,
  currentRegime: "EXPANSION",
  currentRegimeLabel: "Sunny",
  rows: [],
  allRows: [],
};

/*
 * The cadence summaries (/api/weekly, /api/monthly, /api/quarterly, /api/yearly) and the alert
 * digest, which none of the surfaces above reach. Their pastes carried "Capital Posture
 * Governance", "RISK-OFF / CAPITAL-TIGHT", "MONTHLY POSTURE", "Freezing mode." and "Canonical
 * ingestion (FRED)" through every rule here until 2026-10-07. Judged on the Oct 5, 2026 reading
 * (Freezing, 90 and 48) with a shock crossing and a held week switched on, so the rare cues
 * are read too, on the saved snapshot's provenance, and with every conditions word's climate
 * line.
 */
function summarySurfaces(): Surface[] {
  const record = {
    source: "https://fred.stlouisfed.org/series/DGS1MO",
    record_date: "2026-10-05",
    fetched_at: "2026-10-05T12:00:00.000Z",
    isLive: true,
    yields: { oneMonth: 4.2, twoYear: 4.0, tenYear: 4.2 },
  };
  const live = evaluateRegime(record);
  const held = {
    ...live,
    diagnostics: { ...live.diagnostics, shockCrossing: true },
    policyAssessment: {
      ...live.policyAssessment,
      refusal: { refused: true, reasons: ["Too many inputs are missing to support a change in the guidance."] },
    },
  };
  const { provenance } = buildOperatingSnapshot({ treasury: { ...treasury, isLive: false }, macroSeries: macros });
  const recordDateLabel = "Oct 5, 2026";
  const previous = { ...live, regime: "EXPANSION" as const, scores: { ...live.scores, tightness: 63, riskAppetite: 56 } };
  const alert = buildSignalAlertPayload({
    previousRecordDate: "2026-08-31",
    currentRecordDate: "2026-10-05",
    previousAssessment: previous,
    currentAssessment: live,
    sourceUrls: [record.source],
    timeMachineHref: "/history",
  });
  const event = {
    eventId: "e",
    sourceVersion: "test",
    canonicalTimestampSource: "request-received-at" as const,
    id: "1",
    createdAt: "2026-10-05T12:00:00.000Z",
    payload: alert,
  };
  const digestText = (now: number) => {
    const digest = buildWeeklyDigest([event], { now });
    return [digest.summary, ...digest.bullets].join("\n");
  };
  return [
    { name: "weekly summary", text: () => buildWeeklySummary({ assessment: held, provenance, recordDateLabel, record }).copy },
    { name: "monthly summary", text: () => buildMonthlySummary({ assessment: held, provenance, recordDateLabel, record }).copy },
    { name: "quarterly summary", text: () => buildQuarterlySummary({ assessment: live, provenance, periodLabel: "Q4 2026", record }).copy },
    { name: "yearly summary", text: () => buildYearlySummary({ assessment: live, provenance, periodLabel: "2026", record }).copy },
    {
      name: "weekly climate lines",
      text: () =>
        REGIME_ORDER.map((regime) => {
          const { climate } = buildWeeklyStructured({
            regime,
            constraints: [],
            governanceParameters: live.policyAssessment.governanceParameters,
          });
          return [climate.label, ...climate.summary].join("\n");
        }).join("\n"),
    },
    { name: "alert reasons", text: () => alert.reasons.map((reason) => reason.message).join("\n") },
    { name: "alert digest", text: () => digestText(Date.parse("2026-10-06T00:00:00.000Z")) },
    { name: "alert digest (quiet week)", text: () => digestText(Date.parse("2026-11-06T00:00:00.000Z")) },
  ];
}

const artifactSurfaces: Surface[] = [
  { name: "Slack brief", text: () => buildSlackBrief(fixtureBriefDocument()) },
  { name: "call citation", text: () => buildCallCitation(fixtureBriefDocument()) },
  { name: "board slide bullets", text: () => buildBoardSlideBullets(fixtureBriefDocument()) },
  { name: "issue-tracker brief", text: () => buildIssueTrackerMarkdownBrief(fixtureBriefDocument()) },
  {
    name: "weekly operator brief",
    text: () => buildWeeklyOperatorBriefPlainText(buildWeeklyOperatorBriefPayload(fixtureBriefDocument())),
  },
  { name: "meeting slide (markdown)", text: () => formatMeetingSlideMarkdown(buildExportSlidePayload(fixtureSnapshot, null)) },
  { name: "meeting slide (html)", text: () => visibleText(formatMeetingSlideHtml(buildExportSlidePayload(fixtureSnapshot, null))) },
  { name: "meeting slide (svg)", text: () => visibleText(formatMeetingSlideSvg(buildExportSlidePayload(fixtureSnapshot, null))) },
  {
    name: "investor update",
    text: () => {
      const parts = buildInvestorUpdateSnippetParts(fixtureBriefDocument(), []);
      const bands: RunwayBand[] = ["critical", "tight", "balanced", "abundant"];
      return bands.map((band) => formatInvestorUpdateSnippet(parts, band)).join("\n");
    },
  },
  {
    name: "portfolio note",
    text: () =>
      buildPortfolioNote(fixtureBriefDocument(), [
        { area: "hiring", rule: "Limit hiring to backfills", pause: "Funding pressure > 76", resume: "Risk appetite > 54" },
      ]),
  },
  { name: "published brief (Slack)", text: () => (latestPublishedBrief ? buildPublishedBriefSlackUpdate(latestPublishedBrief) : "") },
  { name: "published brief (email)", text: () => (latestPublishedBrief ? buildPublishedBriefEmailUpdate(latestPublishedBrief) : "") },
  {
    name: "alert emails",
    text: () =>
      [
        decisionVerdictEmail({ headline: "h", why: "w", actionNow: "a", reversal: "r", unsubscribeToken: null }).text,
        thresholdCrossingEmail(publishedScoreLines()[0], 76.2, null).text,
        planLineEmail({ headline: "Hiring: your pause line was crossed", body: "b" }, null).text,
        flashMoveEmail({ metric: "baseRate", from: 4, to: 4.3, delta: 0.3, label: "Short-term borrowing rate", headline: "moved" }).text,
      ].join("\n"),
  },
  { name: "record summary", text: () => buildRecordSummary(record, "https://example.test") },
  ...summarySurfaces(),
];

const cache = new Map<string, Promise<string>>();
const allSurfaces: Surface[] = [...routeSurfaces, ...artifactSurfaces].map((surface) => ({
  name: surface.name,
  text: () => {
    const hit = cache.get(surface.name);
    if (hit) return hit;
    const pending = Promise.resolve(surface.text());
    cache.set(surface.name, pending);
    return pending;
  },
}));

describe("reader vocabulary", () => {
  it("bans the words that are never the reader's, on every route and artifact", async () => {
    const violations: string[] = [];
    for (const surface of allSurfaces) {
      const text = await surface.text();
      for (const rule of BANNED) {
        const found = rule.pattern.exec(text);
        if (found) violations.push(`${surface.name}: ${rule.name} — "${found[0]}"`);
      }
    }
    assert.deepEqual(violations, [], `\n${violations.join("\n")}\n`);
  });

  it("holds each ratcheted word at or below its baseline", async () => {
    const totals = new Map<string, number>();
    const perSurface: string[] = [];
    for (const surface of allSurfaces) {
      const text = await surface.text();
      for (const rule of RATCHET) {
        const count = (text.match(rule.pattern) ?? []).length;
        if (count > 0) perSurface.push(`${surface.name}: ${rule.name} ×${count}`);
        totals.set(rule.name, (totals.get(rule.name) ?? 0) + count);
      }
    }
    const rose = RATCHET.filter((rule) => (totals.get(rule.name) ?? 0) > rule.baseline).map(
      (rule) => `${rule.name}: ${totals.get(rule.name)} (baseline ${rule.baseline})`,
    );
    const summary = RATCHET.map((rule) => `${rule.name} ${totals.get(rule.name) ?? 0}/${rule.baseline}`).join(", ");
    if (process.env.WHETHER_VOCABULARY_REPORT) console.log(`[reader-vocabulary] ${summary}\n${perSurface.join("\n")}`);
    assert.deepEqual(rose, [], `\nratcheted words rose:\n${rose.join("\n")}\n(${summary})\n`);
  });

  /*
   * The share cards, which this suite never saw: "boldness" reached the compare
   * card and "Canonical snapshot" the weekly one after both were retired here,
   * on the image that travels furthest. Every distinct card a sitemap page names,
   * plus the live card and the default comparison, which no page's metadata
   * reaches offline. Held to the bans and to every ratchet at zero; a card
   * repeats its page's title, so the counted words stay counted where the page is.
   */
  it("holds every share card to the same rules", async () => {
    const cards = await collectPageShareCards();
    const queries = new Set<string>(["template=report", "template=compare"]);
    for (const card of cards) if (card.imageUrl) queries.add(card.imageUrl.searchParams.toString());
    const zeroRatchets = RATCHET.filter((rule) => rule.baseline === 0);
    const violations: string[] = [];
    for (const query of queries) {
      const text = visibleText(renderToStaticMarkup(await renderOgElement(new URLSearchParams(query))));
      const label = `share card ?${query.slice(0, 80)}`;
      for (const rule of BANNED) {
        const found = rule.pattern.exec(text);
        if (found) violations.push(`${label}: ${rule.name} — "${found[0]}"`);
      }
      for (const rule of zeroRatchets) {
        const found = text.match(rule.pattern);
        if (found) violations.push(`${label}: ${rule.name} — "${found[0]}"`);
      }
      for (const rule of ABBREVIATIONS) {
        const short = rule.short.exec(text);
        const long = short ? rule.long.exec(text) : null;
        if (short && (!long || long.index > short.index)) violations.push(`${label}: "${short[0]}" before any expansion`);
      }
    }
    assert.deepEqual(violations, [], `\n${violations.join("\n")}\n`);
  });

  it("expands an abbreviation before using it, or does not use it", async () => {
    const violations: string[] = [];
    for (const surface of allSurfaces) {
      const text = await surface.text();
      for (const rule of ABBREVIATIONS) {
        const short = rule.short.exec(text);
        if (!short) continue;
        const long = rule.long.exec(text);
        if (!long || long.index > short.index) violations.push(`${surface.name}: "${short[0]}" before any expansion`);
      }
    }
    assert.deepEqual(violations, [], `\n${violations.join("\n")}\n`);
  });
});
