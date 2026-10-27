import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { resourcePillarPages } from "../lib/resourcesContent";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * The three governance guides ran to 12,000px on a desktop and 18,700 on a
 * phone. Four of their reference sections were the same 945 words on all three
 * URLs; a sentence splitter printed a lone "," or "'" as a paragraph wherever a
 * quoted question ended in "?"; the parent guide listed itself under "Related
 * pages"; and none said what conditions were the week it was read.
 */
const render = async (slug: string) => {
  const page = await import("../app/resources/[slug]/page");
  return renderToStaticMarkup(await page.default({ params: Promise.resolve({ slug }) }));
};

const paragraphs = (html: string) =>
  [...html.matchAll(/<p[^>]*>([^<]*)<\/p>/g)].map(([, text]) => text.replace(/&#x27;/g, "'").trim());

describe("the governance guides", () => {
  it("print each reference section on one guide only", () => {
    const seen = new Map<string, string>();
    for (const page of resourcePillarPages) {
      for (const section of page.sections) {
        const text = section.paragraphs.join(" ");
        assert.equal(seen.get(text), undefined, `"${section.heading}" on ${page.slug} repeats ${seen.get(text)}`);
        seen.set(text, page.slug);
      }
    }
  });

  for (const pillar of resourcePillarPages) {
    it(`renders ${pillar.slug} unsplit, with this week's posture and its reference folded`, async () => {
      const html = await render(pillar.slug);

      assert.ok(
        paragraphs(html).every((text) => !/^[,.'’"]+$/.test(text)),
        "no paragraph is a stray punctuation mark",
      );
      assert.match(html, /Conditions are [^;<]+;/, "the header states this week's conditions");
      assert.match(html, /href="\/"[^>]*>Open this week&#x27;s brief/, "and links back to the brief");
      assert.doesNotMatch(html, /Back to top/);

      const related = /Related pages<\/h2>([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? "";
      assert.ok(related.length > 0, "the related list renders");
      assert.doesNotMatch(related, new RegExp(`href="/resources/${pillar.slug}"`), "the page does not list itself");

      const reference = pillar.sections.filter((section) => section.reference);
      assert.ok(reference.length > 0);
      for (const section of reference) {
        const tag = new RegExp(`<details[^>]*>\\s*<summary[^>]*>${section.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/&/g, "&amp;")}`);
        assert.match(html, tag, `${section.heading} is a disclosure`);
      }
      assert.doesNotMatch(html.slice(html.indexOf('id="reference"')), /<details[^>]*\sopen/, "the reference starts closed");
    });
  }
});
