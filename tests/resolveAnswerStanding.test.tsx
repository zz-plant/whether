import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { describeAnswerStanding } from "../lib/report/answerStanding";
import { buildHomeAreaRows, describeAreaPauseStatus, describePauseLineCount, type HomeAreaRow } from "../lib/report/home/homeSectionModel";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import { answerPages } from "../app/answers/decisionPages";
import { featuredAnswerPages } from "../app/answers/selectors";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * (The list moved from /resolve to Guides, /resources, on 2026-10-08, grouped by
 * decision area; the stamps came with it.)
 *
 * /resolve promised "one yes-or-no answer per open decision, under this week's
 * guidance" and listed eleven questions with a sentence of enduring advice each
 * and nothing about the week. Each decision row now carries its lead area's
 * standing against its pause line, from the rows the homepage's "What are you
 * deciding?" choices print; a climate row carries the week's conditions word;
 * an explanation carries nothing, because no pause line answers "how to brief
 * executives".
 */

/* The glyph each state draws (`LINE_STATE_ICONS`), by Lucide's class name. */
const GLYPH = { crossed: "pause", near: "circle-dashed", clear: "play" } as const;

const ROWS: Pick<HomeAreaRow, "area" | "pause">[] = [
  { area: "hiring", pause: { line: "Funding pressure > 76", distance: "crossed", points: 14, met: true, metric: "tightness" } },
  { area: "product-tempo", pause: { line: "Risk appetite < 44", distance: "4 pts away", points: 4, met: false, metric: "riskAppetite" } },
];

describe("an answer's standing this week", () => {
  it("is the lead area's pause status for a decision answer", () => {
    assert.deepEqual(
      describeAnswerStanding({
        page: { category: "decision", mappedDecisionAreas: ["hiring", "burn-discipline"] },
        areaRows: ROWS,
        conditionsLabel: "Freezing",
      }),
      { kind: "area", text: "Pause line crossed", crossed: true, state: "crossed" },
    );
    assert.deepEqual(
      describeAnswerStanding({
        page: { category: "decision", mappedDecisionAreas: ["product-tempo", "hiring"] },
        areaRows: ROWS,
        conditionsLabel: "Freezing",
      }),
      { kind: "area", text: "4 pts from its pause line", crossed: false, state: "near" },
    );
  });

  it("is the conditions word for a climate answer, and nothing for an explanation", () => {
    assert.deepEqual(
      describeAnswerStanding({ page: { category: "climate", mappedDecisionAreas: ["capital-raising"] }, areaRows: ROWS, conditionsLabel: "Freezing" }),
      { kind: "conditions", text: "Freezing" },
    );
    assert.equal(
      describeAnswerStanding({ page: { category: "explanation", mappedDecisionAreas: ["hiring"] }, areaRows: ROWS, conditionsLabel: "Freezing" }),
      undefined,
    );
  });

  it("invents nothing for an area the week carries no row for", () => {
    assert.equal(
      describeAnswerStanding({ page: { category: "decision", mappedDecisionAreas: ["expansion-bets"] }, areaRows: ROWS, conditionsLabel: "Freezing" }),
      undefined,
    );
  });
});

describe("Guides prints each answer's standing", async () => {
  const { default: GuidesPage } = await import("../app/resources/page");
  const html = renderToStaticMarkup(await GuidesPage({}));
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/resources" });
  const model = snapshot.weeklyDecisionCardModel;
  /* Fed as app/page.tsx feeds the homepage's picker. */
  const rows = buildHomeAreaRows({
    actionStripItems: model.decision.actionStripItems,
    decisionRules: model.decision.decisionRules ?? [],
    movement: model.decision.decisionMovement,
    scores: { tightness: model.diagnostics.currentScores.tightness, riskAppetite: model.diagnostics.currentScores.riskAppetite },
  });
  const rowFor = (slug: string) => {
    const start = html.indexOf(`href="/answers/${slug}"`);
    assert.ok(start >= 0, `${slug} is listed`);
    return html.slice(start, html.indexOf("</li>", start));
  };

  /* Once per area, beside its name (2026-10-09): every decision answer in a group
     argues that area first, and each row printed the same stamp. */
  it("an area's heading carries the homepage's words once, and its decision rows none", () => {
    for (const page of answerPages.filter((candidate) => candidate.category === "decision")) {
      const area = page.mappedDecisionAreas[0];
      const row = rows.find((candidate) => candidate.area === area);
      const status = row ? describeAreaPauseStatus(row) : undefined;
      assert.ok(status, `${page.slug} has a standing this week`);
      const groupStart = html.indexOf(`id="area-${area}"`);
      const heading = html.slice(groupStart, html.indexOf("<ul", groupStart));
      /* The shared state badge: its glyph, then the homepage's words. */
      assert.match(
        heading,
        new RegExp(`data-answer-standing="${status.state}"[^>]*><svg[^>]*lucide-${GLYPH[status.state]}[\\s\\S]*?</svg><span>${status.text}<`),
        page.slug,
      );
      assert.doesNotMatch(rowFor(page.slug), /data-answer-standing/, `${page.slug} does not repeat its area's stamp`);
    }
  });

  it("a climate row carries the conditions word, and the explanation row no stamp", () => {
    const conditions = getRegimePublicLabel(reportData.assessment.regime);
    for (const page of answerPages.filter((candidate) => candidate.category === "climate")) {
      assert.match(rowFor(page.slug), new RegExp(`data-answer-standing="conditions"[^>]*><svg[^>]*data-concept-icon="condition"[\\s\\S]*?</svg>${conditions}<`), page.slug);
    }
    for (const page of answerPages.filter((candidate) => candidate.category === "explanation")) {
      assert.doesNotMatch(rowFor(page.slug), /data-answer-standing/, page.slug);
    }
  });

  it("states the count over the list once, from the same rows", () => {
    const count = describePauseLineCount(rows);
    assert.ok(count);
    assert.equal(html.split("data-pause-line-count").length - 1, 1);
    assert.ok(html.indexOf(count) < html.indexOf(`href="/answers/${featuredAnswerPages[0].slug}"`), "the count sits over the list");
  });

  it("draws the stamps sharp and the More tools disclosure as a row, not a pill-shaped surface", () => {
    const stamps = html.match(/<span data-answer-standing="[^"]+"[^>]* class="[^"]*"/g) ?? [];
    assert.ok(stamps.length >= 2, "the area stamps and the climate stamp");
    for (const stamp of stamps) {
      assert.match(stamp, /\brounded-sm\b/);
      assert.doesNotMatch(stamp, /rounded-(full|lg|xl|2xl)/);
    }
    const moreTools = html.slice(html.indexOf('id="more-tools"'));
    const disclosure = moreTools.match(/<details[^>]*>/)?.[0] ?? "";
    assert.match(disclosure, /weather-auto-chevron/);
    assert.doesNotMatch(disclosure, /weather-surface/);
    const directAnswers = html.slice(html.indexOf('id="answers"'), html.indexOf('id="resources-pillars-heading"'));
    assert.doesNotMatch(directAnswers, /weather-hub-chip/, "the context links are links, not floating chips");
  });
});
