import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MethodSection } from "../app/about/methodSection";
import { TERM_DEFINITIONS } from "../lib/report/reportCopy";
import { REGIME_WEATHER_RATIONALES } from "../lib/regimePresentation";
import { DEFINED_TERM_SET_ID, SITE_VOCABULARY, buildDefinedTermSet, definedTermId, definedTermReference } from "../lib/seo/definedTerms";

/*
 * The site's vocabulary is one DefinedTermSet on the method page (docs/seo/quality-gates.md,
 * "Semantic gates", 2026-11-18). Other pages point at these ids, so they are a contract; the
 * descriptions are sentences the site already prints, and /about prints each beside its term.
 */
describe("the site's vocabulary", () => {
  it("names the set and its eight terms by the ids other pages point at", () => {
    assert.equal(DEFINED_TERM_SET_ID, "https://whether.work/about#terms");
    assert.deepEqual(
      SITE_VOCABULARY.map((term) => definedTermId(term.slug)),
      [
        "https://whether.work/about#term-funding-pressure",
        "https://whether.work/about#term-risk-appetite",
        "https://whether.work/about#term-room-to-move",
        "https://whether.work/about#term-room-before-a-change",
        "https://whether.work/about#term-sunny",
        "https://whether.work/about#term-cloudy",
        "https://whether.work/about#term-stormy",
        "https://whether.work/about#term-freezing",
      ],
    );
    const set = buildDefinedTermSet();
    assert.equal(set["@type"], "DefinedTermSet");
    assert.equal(set.hasDefinedTerm.length, 8);
    assert.deepEqual(definedTermReference("freezing"), {
      "@type": "DefinedTerm",
      "@id": "https://whether.work/about#term-freezing",
      name: "Freezing",
      inDefinedTermSet: { "@id": DEFINED_TERM_SET_ID },
    });
  });

  it("describes each term in a sentence the site already prints, and invents none", () => {
    const printed = new Set<string>([...TERM_DEFINITIONS.map((entry) => entry.summary), ...Object.values(REGIME_WEATHER_RATIONALES)]);
    for (const term of SITE_VOCABULARY) assert.ok(printed.has(term.description), `${term.name}: "${term.description}" is not the site's own sentence`);
  });

  it("prints every term on the method page, under the id its markup names", () => {
    const html = renderToStaticMarkup(<MethodSection />).replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
    assert.match(html, /id="terms"/);
    for (const term of buildDefinedTermSet().hasDefinedTerm) {
      const anchor = term["@id"].split("#")[1];
      assert.match(html, new RegExp(`<dfn id="${anchor}"[^>]*>${term.name}</dfn>`), `${term.name} has no visible definition at #${anchor}`);
      assert.ok(html.includes(term.description), `${term.name}'s description is not printed`);
    }
  });
});
