import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import monthly from "../data/advice-corpus/monthly.json";
import { AdviceCorpusSection } from "../app/concepts/adviceCorpusSection";

/*
 * The advice corpus's section on /concepts renders offline from the committed series and the
 * month-end record. A reader who cannot see the chart gets the same numbers in a table.
 */
describe("the advice corpus section", () => {
  const html = renderToStaticMarkup(<AdviceCorpusSection />);

  it("draws the chart with a title and gives every quarter a row in a screen-reader table", () => {
    assert.match(html, /<p class="sr-only">Share of posts prescribing expansion and conservation each quarter, 2012 Q1 to 2026 Q3/);
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
    /* Hidden by a wrapper, not on the table: a 1px sr-only table laid out at its content's
       width and pushed a 390px phone page to 651px (2026-10-27). */
    assert.match(html, /<div class="sr-only"><table><caption>Share of posts prescribing expansion and conservation each quarter, with funding pressure<\/caption>/);
    const rows = html.match(/<tr><th scope="row">/g) ?? [];
    assert.equal(rows.length, monthly.quarters.length);
    assert.ok(html.includes("<th scope=\"row\">2022 Q3</th>"));
  });

  it("marks the seven changes in conditions from the record, and names them in the caption", () => {
    assert.equal((html.match(/data-change="/g) ?? []).length, 7);
    for (const change of ["Dec 2018, Sunny to Stormy", "Sep 2022, Stormy to Freezing", "Sep 2026, Sunny to Cloudy"]) assert.ok(html.includes(change), change);
  });

  it("states the measured result and links to the pre-registration and the results", () => {
    assert.match(html, /data-advice-corpus-finding/);
    assert.ok(!html.includes("PLACEHOLDER"));
    assert.ok(html.includes('href="/research/advice-corpus-preregistration.md"'));
    assert.ok(html.includes('href="/research/advice-corpus-results.md"'));
  });

  it("leaves a quarter with too few posts out of the lines instead of drawing a share of one post", () => {
    const thin = monthly.quarters.find((quarter) => quarter.posts < 3);
    if (!thin) return;
    const label = `${thin.period.slice(0, 4)} Q${thin.period.slice(5)}`;
    assert.ok(html.includes(`<th scope="row">${label}</th><td>–</td><td>–</td>`), label);
  });
});
