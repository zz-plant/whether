import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";

import { buildToolkitHowTo } from "../lib/seo/pageStructuredData";
import { findToolkitDefinition } from "../lib/decisionDomainCatalog";

const mockAny: any = mock;

/* The page reaches `notFound` and the router through next/navigation, and
   renderToStaticMarkup mounts neither. Installed here so this file answers for
   its own dependencies rather than passing on another suite's ordering luck —
   the reason decisionHeroSignalBreakdown gives for doing the same. */
mockAny.module("next/navigation", () => ({
  /* `mock.module` patches the registry process-wide, so this stub is the one
     `resourceArticleRoutes.test.ts` gets too — and that file asserts on the
     message Next throws. Matching it keeps this file from deciding another
     file's result, which is the hazard, met for the third time today. */
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/*
 * Every `HowToStep.url` points at a `#step-N` fragment, and the page rendered
 * the matching list items with no id — so the structured data deep-linked to
 * nothing and a consumer following one landed at the top of the page.
 *
 * Asserted against the rendered page rather than its source. The first version
 * of this check read `page.tsx` and matched the id expression with a regex,
 * which passes if someone renames the loop variable and fails if someone edits
 * a comment. What the claim is actually about is whether the anchor exists in
 * the HTML, and the page renders in a test, so there is no reason to ask a
 * weaker question.
 */
describe("toolkit HowTo step anchors", () => {
  /* The whole node, parsed. Reaching into it with an assertion first would make
     the parse decorative — the shape claim belongs in one place. */
  const howToSchema = z.object({
    "@type": z.literal("HowTo"),
    step: z.array(z.object({ url: z.string(), position: z.number() })),
  });

  const renderToolkit = async (slug: string) => {
    const page = await import("../app/toolkits/[slug]/page");
    return renderToStaticMarkup(await page.default({ params: Promise.resolve({ slug }) }));
  };

  it("renders an anchor for every step the structured data links to", async () => {
    const toolkit = findToolkitDefinition("pmf");
    assert.ok(toolkit);

    const graph = buildToolkitHowTo(toolkit);
    const { step: steps } = howToSchema.parse(graph["@graph"].find((node) => node["@type"] === "HowTo"));
    const html = await renderToolkit("pmf");

    assert.ok(steps.length > 0, "the toolkit declares no steps");
    for (const [index, step] of steps.entries()) {
      const fragment = step.url.slice(step.url.indexOf("#") + 1);
      assert.equal(fragment, `step-${index + 1}`, "step urls are numbered from one, in order");
      assert.ok(
        html.includes(`id="${fragment}"`),
        `the page renders no anchor for ${step.url}; a consumer following it lands at the top`,
      );
    }
  });

  it("numbers the anchors in the order the steps are declared", async () => {
    const toolkit = findToolkitDefinition("pmf");
    assert.ok(toolkit);
    const html = await renderToolkit("pmf");

    const order = [...html.matchAll(/id="step-(\d+)"/g)].map((match) => Number(match[1]));
    assert.deepEqual(order, toolkit.runSequence.map((_, index) => index + 1));
  });
});
