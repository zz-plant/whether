import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { answerPages } from "../app/answers/decisionPages";
import { decisionAnswerOutputSchema, runAgentTool } from "../lib/agent/tools";
import { buildAnswerLead } from "../lib/answers/thisWeeksAnswer";
import * as weeklyBriefSnapshot from "../lib/report/weeklyBriefSnapshot";
import { buildReportDataFixture } from "./fixtures/reportFixtures";
import { jsonLdIn, questionNodesIn, visibleTextOf } from "./fixtures/questionMarkup";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

const mockAny: any = mock;

/* `ReportCta` calls `useRouter`, which `renderToStaticMarkup` does not mount. Spread, so every
   other export stays the real one (tests/answerPageReaderCopy.test.tsx says why). */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/*
 * The bundled reading has every area open, so a held week is served from a fixture: Freezing,
 * funding pressure 90 and risk appetite 30 against the default lines. The page and `get_answer`
 * both read `loadWeeklyBriefSnapshot`; it is replaced by one that returns the fixture while a
 * test asks for it and the real loader otherwise, so the other suites in this process are
 * served exactly as before. Captured before the mock, which patches the module in place.
 */
const { loadWeeklyBriefSnapshot: loadBundled, buildWeeklyBriefSnapshot } = weeklyBriefSnapshot;
let reading: "bundled" | "held" = "bundled";

const heldReportData = buildReportDataFixture({
  assessment: {
    regime: "SCARCITY",
    regimeTransition: null,
    scores: { tightness: 90, riskAppetite: 30 },
    diagnostics: { confidence: "HIGH", transitionWatch: false },
  },
});

mockAny.module("../lib/report/weeklyBriefSnapshot", () => ({
  ...weeklyBriefSnapshot,
  loadWeeklyBriefSnapshot: async (...args: Parameters<typeof loadBundled>) =>
    reading === "bundled"
      ? loadBundled(...args)
      : {
          reportResult: { ok: true, data: heldReportData },
          reportData: heldReportData,
          degraded: false,
          snapshot: buildWeeklyBriefSnapshot({ reportData: heldReportData, degraded: false }),
        },
}));

afterEach(() => {
  reading = "bundled";
});

const renderAnswer = async (slug: string) => {
  const { DecisionAnswerPageContent } = await import("../app/answers/decisionAnswerPageContent");
  return renderToStaticMarkup(await DecisionAnswerPageContent({ slug, route: `/answers/${slug}` }));
};

/** The FAQPage's answer to the page's own question: the text a rich result shows. (The copied
    brief reads the same `leadAnswer` as the card; it is a client prop, so static markup does not
    carry it.) */
const faqLead = (html: string, question: string) =>
  jsonLdIn(html).flatMap(questionNodesIn).find((node) => node.name === question)?.acceptedAnswer.text;

const answerFor = async (slug: string) => {
  const page = answerPages.find((candidate) => candidate.slug === slug);
  assert.ok(page, slug);
  const { reportData, snapshot } = await weeklyBriefSnapshot.loadWeeklyBriefSnapshot();
  const mappedRules = snapshot.homeBriefModel.decisionRules.filter((rule) => page.mappedDecisionAreas.includes(rule.area));
  const shared = buildAnswerLead({ page, mappedRules, scores: reportData.assessment.scores });
  const agent = decisionAnswerOutputSchema.parse(await runAgentTool("get_answer", { question: slug }, "http"));
  const html = await renderAnswer(slug);
  return { page, shared, agent, html };
};

/*
 * Feature log §1.1.109 led the answer pages with this week's standing ("No, not this week:
 * hiring is open until risk appetite falls below 44; it is 52.") and left `get_answer` on the
 * page's rule alone, so an assistant quoting Whether opened on a different line from the page a
 * reader would open. Both read `buildAnswerLead` through the answer object now; this holds the
 * page's card, its FAQ answer and the tool to the one sentence, in a week the area is open and
 * one it is on hold.
 */
describe("an answer page and get_answer open on the same sentence", () => {
  const cases = [
    { reading: "bundled", slug: "should-we-freeze-or-selectively-hire", opens: /^No, not this week: hiring is open until \w[\w ]* (falls below|rises above) \d+; it is \d+\./ },
    { reading: "bundled", slug: "should-startups-hire-engineers-right-now", opens: /^Yes, this week: hiring is open until / },
    { reading: "held", slug: "should-we-freeze-or-selectively-hire", opens: /^Yes, this week: hiring is on hold until \w[\w ]* (falls below|rises above) \d+; it is \d+\./ },
    { reading: "held", slug: "should-startups-hire-engineers-right-now", opens: /^Not this week: hiring is on hold until / },
  ] as const;

  for (const testCase of cases) {
    it(`${testCase.slug}, hiring ${testCase.reading === "held" ? "on hold" : "open"}`, async () => {
      reading = testCase.reading;
      const { page, shared, agent, html } = await answerFor(testCase.slug);

      assert.match(shared.leadAnswer, testCase.opens);
      assert.ok(shared.thisWeek && shared.leadAnswer.startsWith(shared.thisWeek), "the week's sentence comes first");
      assert.ok(shared.leadAnswer.endsWith(page.shortAnswer), "and the page's rule follows it");

      assert.equal(agent.leadAnswer, shared.leadAnswer, "get_answer returns the shared lead");
      assert.equal(agent.shortAnswer, page.shortAnswer, "and keeps the rule on its own");
      assert.ok(agent.attributionSnippet.endsWith(`"${shared.leadAnswer}"`), "its quotable line quotes the lead");

      assert.ok(visibleTextOf(html).includes(shared.leadAnswer), "the card under the question prints the lead");
      assert.ok(faqLead(html, page.title)?.startsWith(shared.leadAnswer), "the FAQPage answer opens on it");
    });
  }

  it("serves the fixture's week only while a test asks for it", async () => {
    const bundled = await weeklyBriefSnapshot.loadWeeklyBriefSnapshot();
    assert.notEqual(bundled.reportData, heldReportData);
  });
});
