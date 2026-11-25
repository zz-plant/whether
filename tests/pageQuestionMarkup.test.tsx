import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";
import { assertQuestionsVisible, jsonLdIn, questionNodesIn, visibleTextOf } from "./fixtures/questionMarkup";

serveUnreachableUpstreams();

/* The pages mount client islands that reach the router; spread the real module, as every stub here does. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * Questions and answers, as people say them (docs/editorial-guardrails.md), marked up as they are
 * printed (docs/seo/quality-gates.md, "Semantic gates"): each page that asks its sections as
 * questions carries them as `Question` nodes, and every node's question and answer are words the
 * rendered page prints. /operate's FAQ is held to the same in tests/planPageLead.test.ts.
 */
describe("question markup mirrors the page", () => {
  it("/signals: the h1's question and each closed instrument's, with their answers", async () => {
    const page = await import("../app/signals/page");
    const html = renderToStaticMarkup(await page.default({}));
    const questions = assertQuestionsVisible(jsonLdIn(html), html, { atLeast: 4 });
    assert.equal(questions[0]?.name, "Why did the guidance change?");
    assert.match(questions[0]?.acceptedAnswer.text ?? "", /^It follows two scores/);
    assert.ok(questions.some((question) => question.name === "Has the recession warning gauge gone below zero in the past year?"));
    assert.match(html, /<h1[^>]*>Why did the guidance change\?<\/h1>/);
  });

  it("/trust: the page's question, the source board's and the derivation's, answered first", async () => {
    const page = await import("../app/trust/page");
    const html = renderToStaticMarkup(await page.default({}));
    const questions = assertQuestionsVisible(jsonLdIn(html), html, { atLeast: 3 });
    assert.deepEqual(
      questions.slice(0, 3).map((question) => question.name),
      ["Can we trust this week's guidance?", "Is the data current?", "How are the scores worked out?"],
    );
    assert.match(questions[0]?.acceptedAnswer.text ?? "", /^(Yes|Mostly|With care|Not fully)[:,]/);
    assert.match(questions[1]?.acceptedAnswer.text ?? "", /^(Yes|Mostly|No)[:,]/);
  });

  it("/history: the two record questions, with the month-end record as a dataset that says what it holds", async () => {
    const page = await import("../app/history/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));
    const docs = jsonLdIn(html);
    const questions = assertQuestionsVisible(docs, html, { atLeast: 2 });
    assert.equal(questions[0]?.name, "Has it been right?");
    assert.match(questions[0]?.acceptedAnswer.text ?? "", /^\d+ of \d+ changes since [A-Z][a-z]{2} \d{4} had advance warning\./);
    assert.match(questions[1]?.name ?? "", /^How has it done in the last /);
    /* Asked once: the page summary no longer opens on the question its section asks. */
    assert.equal((visibleTextOf(html).match(/Has it been right\?/g) ?? []).length, 2, "the heading and the index, not the intro too");
    const graph = (docs.find((doc) => JSON.stringify(doc).includes('"Dataset"')) as { "@graph": Array<Record<string, unknown>> }) ?? { "@graph": [] };
    const dataset = graph["@graph"].find((node) => node["@type"] === "Dataset") as Record<string, unknown>;
    assert.match(String(dataset.temporalCoverage), /^2012-01\/\d{4}-\d{2}$/);
    const measured = dataset.variableMeasured as Array<Record<string, unknown>>;
    assert.deepEqual(measured.map((variable) => variable.name), ["Funding pressure", "Risk appetite", "Room to move"]);
    for (const variable of measured) {
      assert.equal(variable.minValue, 0);
      assert.equal(variable.maxValue, 100);
      assert.equal(variable.unitText, "points");
    }
    assert.equal(dataset.isAccessibleForFree, true);
    assert.ok(Array.isArray(dataset.distribution) && dataset.distribution.length > 0);
    assert.match(String(dataset.measurementTechnique), /\/about#method$/);
  });

  it("/calibration: the premise question, answered from the chart's medians", async () => {
    const page = await import("../app/calibration/page");
    const html = renderToStaticMarkup(page.default());
    const questions = assertQuestionsVisible(jsonLdIn(html), html, { atLeast: 1 });
    assert.equal(questions[0]?.name, "What happened to venture fundraising when funding pressure was above 70?");
    assert.match(questions[0]?.acceptedAnswer.text ?? "", /^It (grew more slowly|grew at least as fast|shrank): /);
  });

  it("/brief/[week]: \"What happened next?\" on a superseded week, answered first, and none on the latest", async () => {
    const page = await import("../app/brief/[week]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ week: "2026-w41" }) }));
    const questions = assertQuestionsVisible(jsonLdIn(html), html, { atLeast: 1 });
    assert.equal(questions[0]?.name, "What happened next?");
    assert.match(questions[0]?.acceptedAnswer.text ?? "", /^Conditions (held|changed): the next brief, for the week of /);
    assert.match(html, /<time dateTime="2026-10-06">Oct 6, 2026<\/time>/, "the record date sits in <time>");
  });
});

describe("a copied brief's link opens the week on the sender's area", () => {
  it("marks only the named row, and an unknown slug names none", async () => {
    const { chosenAreaFromSearch, briefAreaRowId } = await import("../app/brief/[week]/briefQuestions");
    const { BriefAreaScope } = await import("../app/brief/[week]/briefAreaScope");
    assert.equal(chosenAreaFromSearch("decision=hiring&ref=share"), "hiring");
    assert.equal(chosenAreaFromSearch("decision=payroll"), undefined);
    assert.equal(chosenAreaFromSearch(""), undefined);

    const page = await import("../app/brief/[week]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ week: "2026-w46" }) }));
    const rows = [...html.matchAll(/<tr id="([^"]+)" data-area-row="([^"]+)" class="([^"]*)">([\s\S]*?)<\/tr>/g)];
    assert.equal(rows.length, 5, "a row per area, each with its own id");
    for (const [, id, area, rowClass, cells] of rows) {
      assert.equal(id, briefAreaRowId(area ?? ""));
      /* Chosen = this row: its name takes full ink and weight, and the row is not quieted. */
      assert.ok(cells?.includes(`group-data-[chosen=${area}]/chosen:font-semibold`), `${area} names itself`);
      assert.ok(!rowClass?.includes(`group-data-[chosen=${area}]/chosen:text-slate-400`), `${area} is not quieted when chosen`);
      /* Chosen = another row: this one is quieted, and its name is not emphasised. */
      for (const [, , other] of rows) {
        if (other === area) continue;
        assert.ok(rowClass?.includes(`group-data-[chosen=${other}]/chosen:text-slate-400`), `${area} quiets for ${other}`);
        assert.ok(!cells?.includes(`group-data-[chosen=${other}]/chosen:font-semibold`), `${area} does not emphasise for ${other}`);
      }
    }
    /* The scope is empty on the page as served (the week is generated once), and the link's area in the browser. */
    assert.match(html, /<div class="group\/chosen" data-chosen="">/);
    const named = renderToStaticMarkup(<BriefAreaScope initial={chosenAreaFromSearch("decision=hiring") ?? null}>rows</BriefAreaScope>);
    assert.match(named, /data-chosen="hiring"/);
    const unknown = renderToStaticMarkup(<BriefAreaScope initial={chosenAreaFromSearch("decision=payroll") ?? null}>rows</BriefAreaScope>);
    assert.match(unknown, /data-chosen=""/);
  });

  it("keeps one canonical URL whatever the query", async () => {
    const page = await import("../app/brief/[week]/page");
    const metadata = await page.generateMetadata({ params: Promise.resolve({ week: "2026-w46" }) });
    const canonical = metadata.alternates?.canonical;
    assert.match(canonical instanceof URL ? canonical.href : typeof canonical === "string" ? canonical : "", /\/brief\/2026-w46$/);
  });
});

describe("answer pages lead with this week's answer", () => {
  it("opens the card under the question with the area's standing, then the page's rule", async () => {
    const { DecisionAnswerPageContent } = await import("../app/answers/decisionAnswerPageContent");
    const html = renderToStaticMarkup(await DecisionAnswerPageContent({ slug: "should-we-freeze-or-selectively-hire", route: "/answers/[slug]" }));
    const text = visibleTextOf(html);
    assert.match(text, /(Yes, this week|No, not this week): hiring is (on hold|open) until (funding pressure|risk appetite) (falls below|rises above) \d+; it is \d+\. Freeze hiring when/);
    const faq = questionNodesIn(jsonLdIn(html)).find((question) => question.name === "Should we freeze hiring this week?");
    assert.match(faq?.acceptedAnswer.text ?? "", /^(Yes, this week|No, not this week): hiring is/);
  });
});
