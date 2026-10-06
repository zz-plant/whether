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
 *   the way scripts/check-suppression-census.ts holds its numbers. Lower the baseline when
 *   work earns it; raising one is a decision and belongs in its own PR with the reason.
 *
 * Routes behind the report read path stay out (they suspend at their data boundary offline;
 * docs/agents/lessons/tests-and-copy-rules.md records why). Everything here renders from the bundled snapshot or from a fixture.
 */

const BANNED: { name: string; pattern: RegExp }[] = [
  { name: "engine key", pattern: /\b(SCARCITY|DEFENSIVE|VOLATILE|EXPANSION)\b/ },
  { name: "engine score name", pattern: /\b(tightness|riskAppetite|noindex)\b/ },
  {
    name: "infrastructure",
    pattern: /\b(pipeline|payload|replay|audit trail|outage mode|policy override|ingestion|telemetry|worker|cron|isolate)\b/i,
  },
  { name: "mechanism name", pattern: /\b(hysteresis|confirmation gate|dwelt|whipsaw|classification line)\b/i },
  {
    name: "fixture company",
    pattern: /Financial implications|Runway risk:|Raise window:|Burn adjustment:|CEO \+ Finance|Mon\/Thu|Executive Stance|Seed Stage|Board of Directors/,
  },
  /* "Risk-On or Risk-Off" is the market idiom a searcher types, and the title of the page that
     answers it; "Risk-On" alone is the engine's old name for a pace. */
  { name: "policy-engine vocabulary", pattern: /\b(policy signals|policy override|Safety Mode|Risk-On(?!\s+or\s+Risk-Off)|Capital-Tight|Capital-Loose)\b/ },
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
  { name: "posture", pattern: /\bposture\b/gi, baseline: 4 },
  { name: "regime", pattern: /\bregime\b/gi, baseline: 0 },
  { name: "corridor", pattern: /\bcorridor\b/gi, baseline: 0 },
  { name: "cadence", pattern: /\bcadence\b/gi, baseline: 0 },
  { name: "discipline", pattern: /\bdiscipline\b/gi, baseline: 5 },
  { name: "bounded", pattern: /\bbounded\b/gi, baseline: 0 },
  { name: "stance", pattern: /\bstance\b/gi, baseline: 0 },
  { name: "flip", pattern: /\bflips?\b/gi, baseline: 0 },
  { name: "board", pattern: /\bboard\b/gi, baseline: 10 },
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
  { name: "/pricing", text: async () => visibleText(renderToStaticMarkup((await import("../app/pricing/page")).default())) },
  { name: "/about", text: async () => visibleText(renderToStaticMarkup((await import("../app/about/page")).default())) },
  { name: "/contact", text: async () => visibleText(renderToStaticMarkup((await import("../app/contact/page")).default())) },
  { name: "/privacy", text: async () => visibleText(renderToStaticMarkup((await import("../app/privacy/page")).default())) },
  { name: "/resources", text: async () => visibleText(renderToStaticMarkup((await import("../app/resources/page")).default())) },
  { name: "/calibration", text: async () => visibleText(renderToStaticMarkup((await import("../app/calibration/page")).default())) },
  { name: "/concepts", text: async () => visibleText(renderToStaticMarkup((await import("../app/concepts/page")).default())) },
  { name: "/api-docs", text: async () => visibleText(renderToStaticMarkup((await import("../app/api-docs/page")).default())) },
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
