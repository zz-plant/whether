import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { answerPages } from "../app/answers/decisionPages";
import { compositeSignalScales } from "../lib/report/signalTranslations";

const mockAny: any = mock;

/*
 * `ReportCta` calls `useRouter`, and `renderToStaticMarkup` mounts no app router.
 * That one hook is the whole of what this file needs replaced — so the real
 * module is spread and only the hook is overridden.
 *
 * Replacing the module wholesale is what the first version did, and `mock.module`
 * patches the registry process-wide: three suites that reach `permanentRedirect`
 * through a route then failed to link, in whichever shuffled orders put this file
 * first. A stub that is narrower than the module it stands in for is a decision
 * about every other file in the run.
 */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/*
 * These eleven URLs are where a stranger meets this product. They printed the
 * two composite scores bare — "current tightness: 79 / 100" — under a name no
 * other surface uses, with no scale, no plain-English band and no glossary link,
 * while all three of those primitives sat on the pages a returning reader
 * already knows their way around. The FAQ answer, which is the text a rich
 * result shows, carried the same bare comparison.
 *
 * Rendered, per the rule in docs/agents/lessons/tests-and-copy-rules.md. The page reads through
 * `loadWeeklyBriefSnapshot`, which falls back to the bundled snapshot offline,
 * so the markup is available here without serving an upstream.
 */

const renderAnswer = async (slug: string) => {
  const { DecisionAnswerPageContent } = await import("../app/answers/decisionAnswerPageContent");
  return renderToStaticMarkup(await DecisionAnswerPageContent({ slug, route: `/answers/${slug}` }));
};

/** Names for the two scores that belong to the engine, not to the page. */
const ENGINE_VOCABULARY = /\b(tightness|noindex|riskAppetite)\b/i;

describe("answer page reader copy", () => {
  it("keeps each enduring answer visible beside dated market guidance", async () => {
    for (const slug of ["when-should-startups-cut-burn", "should-startups-hire-engineers-right-now", "should-startups-raise-capital-now"]) {
      const page = answerPages.find((entry) => entry.slug === slug)!;
      const html = await renderAnswer(slug);
      const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
      assert.ok(visible.includes(page.shortAnswer), `${slug} lost its question-specific answer`);
      assert.ok(visible.includes("Company inputs to check"));
      assert.ok(visible.includes("Decision note to complete"));
      assert.ok(visible.includes("Market guidance as of"));
      assert.ok(visible.includes('href="/"'));
      const faqScript = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
      assert.ok(faqScript?.includes(page.shortAnswer), "structured answer must retain the same enduring answer");
    }
  });

  it("gives every bare score a name, a scale, and a reading", async () => {
    const html = await renderAnswer(answerPages[0]?.slug ?? "");

    /* Each score is drawn on its ladder now, against the line that would change
       this answer — the same primitive the homepage and /trust use. The claim
       is unchanged: no score appears without a name, a scale and a reading. */
    assert.match(html, /Funding pressure<\/span><span[^>]*>\d+ of 100 · \d+ pts (above|below) the change line/);
    assert.match(html, /Risk appetite<\/span><span[^>]*>\d+ of 100 · \d+ pts (above|below) the change line/);
    assert.equal((html.match(/data-score-ladder/g) ?? []).length, 2, "both composite scores are drawn against their line");
    assert.ok(
      html.includes(compositeSignalScales.tightness.directionLabel),
      "no scale note under the funding pressure score",
    );
    assert.ok(
      html.includes(compositeSignalScales.riskAppetite.directionLabel),
      "no scale note under the risk appetite score",
    );
    // The scale note and the plain-English band above carry the meaning on the
    // page, so nothing here should send a first-time reader somewhere else to decode it.
    assert.ok(!html.includes('href="/glossary"'), "the page still sends a reader to the glossary");
  });

  it("keeps the engine's own vocabulary off every one of them", async () => {
    for (const page of answerPages) {
      const html = await renderAnswer(page.slug);
      const found = ENGINE_VOCABULARY.exec(html);
      assert.equal(found, null, `/answers/${page.slug} said "${found?.[0]}" to a reader`);
    }
  });

  it("states both numbers in the rich result the way the page states them", async () => {
    const html = await renderAnswer(answerPages[0]?.slug ?? "");
    const faq = html.slice(html.indexOf("FAQPage"), html.indexOf("</script>"));

    assert.match(faq, /Risk appetite is \d+ of 100/);
    assert.match(faq, /funding pressure is \d+ of 100/);
  });
});
