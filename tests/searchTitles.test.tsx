import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDecisionAnswerMetadata, generateMetadata as answerMetadata } from "../app/answers/[slug]/page";
import { answerPages } from "../app/answers/decisionPages";
import * as resourceRoute from "../app/resources/[slug]/page";
import { generateMetadata as workstreamMetadata } from "../app/operate/[workstream]/page";
import { workstreamSlugs } from "../app/operate/workstreams";
import { resourceArticles } from "../lib/resourceArticles";
import { formatMonthYearShortFromValue } from "../lib/formatters";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import type { buildSeoDecisionPayload } from "../lib/report/seoDecisionPayload";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * The titles a search result shows, in the words people search, dated by the
 * data on the page. A 2026-10-08 crawl found every answer title ending in
 * "(Live operator answer)", which no one searches for; two pages answering
 * "should we freeze hiring" with nothing telling them apart; and the runway
 * guide and planner named for the product rather than the question.
 */

const params = <T,>(value: T) => ({ params: Promise.resolve(value) });

/* These pages set a plain string title; anything else reads as no title. */
const titleOf = (metadata: Metadata) => (typeof metadata.title === "string" ? metadata.title : "");

const answerPayload: ReturnType<typeof buildSeoDecisionPayload> = {
  currentCall: "Freeze net-new hiring.",
  immediateAction: "Approve backfills one at a time.",
  triggerThreshold: "Funding pressure above 76.",
  reversalCondition: "Funding pressure at or below 70.",
  evidence: [],
  freshness: "Oct 8, 2026",
  degraded: false,
  noindex: false,
  trustSummary: "High confidence",
  citationMeta: "Oct 6, 2026",
};

const FREEZE_ANSWER = "should-we-freeze-or-selectively-hire";
const FREEZE_GUIDE = "should-we-freeze-hiring-high-interest-rate-environment";

describe("answer titles", () => {
  it("date the title by the reading the answer states, and drop the suffix", () => {
    const dated = buildDecisionAnswerMetadata({ title: "Should we freeze hiring this week?", slug: FREEZE_ANSWER, payload: answerPayload, readingDateIso: "2026-10-06" });
    assert.equal(dated.title, "Should we freeze hiring this week? (updated Oct 2026)");

    const undated = buildDecisionAnswerMetadata({ title: "Should we freeze hiring this week?", slug: FREEZE_ANSWER, payload: answerPayload });
    assert.equal(undated.title, "Should we freeze hiring this week?");
  });

  it("carry the month of the reading on every answer page", async () => {
    const { reportData } = await loadWeeklyBriefSnapshot(undefined, { route: "/answers/[slug]" });
    const month = formatMonthYearShortFromValue(reportData.treasury.record_date);
    for (const page of answerPages) {
      const metadata = await answerMetadata(params({ slug: page.slug }));
      assert.equal(metadata.title, `${page.title} (updated ${month})`, page.slug);
    }
  });
});

describe("guide and planner titles", () => {
  it("date each guide by its own updatedAt and print that date under the heading", async () => {
    for (const article of resourceArticles) {
      const metadata = await resourceRoute.generateMetadata(params({ slug: article.slug }));
      assert.equal(metadata.title, `${article.title} (updated ${formatMonthYearShortFromValue(article.updatedAt)})`, article.slug);

      const html = renderToStaticMarkup(await resourceRoute.default(params({ slug: article.slug })));
      assert.ok(html.includes(`<time dateTime="${article.updatedAt}">`), `${article.slug} prints the date its title names`);
    }
  });

  it("lead with the question people search", async () => {
    const runway = await resourceRoute.generateMetadata(params({ slug: "how-much-runway-do-we-need-tightening-market" }));
    assert.match(titleOf(runway), /^How much runway should a startup have\?/);

    const planner = await workstreamMetadata(params({ workstream: "financial" }));
    assert.match(titleOf(planner), /^Startup runway calculator/);
  });
});

describe("the hiring-freeze pair", () => {
  /*
   * Kept as two pages rather than one with a canonical, because they answer
   * different questions: the answer is this week's guidance on whether to
   * freeze, the guide the standing policy for which roles to keep, gate or
   * pause. What they need is to say so, and to point at each other.
   */
  it("title the weekly answer and the standing policy differently", () => {
    const answer = answerPages.find((page) => page.slug === FREEZE_ANSWER);
    const guide = resourceArticles.find((article) => article.slug === FREEZE_GUIDE);
    assert.ok(answer && guide);
    assert.match(answer.title, /this week/i);
    assert.match(guide.title, /policy/i);
    assert.notEqual(answer.shortAnswer, guide.description);
  });

  it("link each to the other", async () => {
    const answer = answerPages.find((page) => page.slug === FREEZE_ANSWER);
    assert.ok(answer?.supportingLinks.some((link) => link.href === `/resources/${FREEZE_GUIDE}`), "the answer cites the guide");

    const html = renderToStaticMarkup(await resourceRoute.default(params({ slug: FREEZE_GUIDE })));
    assert.ok(html.includes(`href="/answers/${FREEZE_ANSWER}"`), "the guide links back to the answer");
    /* The links are the week's answers, under a heading that already says
       "This week's guidance"; they were labelled that again. */
    assert.ok(html.includes("Questions answered this week:"));
  });
});

/* A title or description two pages share is a result a searcher cannot tell apart. */
describe("titles and descriptions across the question pages", () => {
  it("are unique", async () => {
    const entries = [
      ...(await Promise.all(answerPages.map((page) => answerMetadata(params({ slug: page.slug }))))),
      ...(await Promise.all(resourceArticles.map((article) => resourceRoute.generateMetadata(params({ slug: article.slug }))))),
      ...(await Promise.all(workstreamSlugs.map((workstream) => workstreamMetadata(params({ workstream }))))),
    ];
    const titles = entries.map(titleOf);
    const descriptions = entries.map((metadata) => String(metadata.description));
    assert.equal(new Set(titles).size, titles.length, titles.join("\n"));
    assert.equal(new Set(descriptions).size, descriptions.length, descriptions.join("\n"));
  });
});
