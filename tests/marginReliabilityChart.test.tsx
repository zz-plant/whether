import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfidenceRecordSection } from "../app/components/history/confidenceRecord";

/*
 * /calibration drew the study's finding as a curve through four hard-coded
 * points labelled "measured", until 2026-10-09. The chart that replaced it is
 * drawn from the rows the table under it prints, so the two cannot disagree:
 * one dot per row, at that row's published and held percent.
 */
describe("the margin's reliability chart", () => {
  const html = renderToStaticMarkup(<ConfidenceRecordSection />);
  const chart = html.slice(html.indexOf("data-margin-reliability"), html.indexOf("</figure>"));
  const dots = [...chart.matchAll(/<circle[^>]*data-published="(\d+)" data-held="(\d+)"/g)].map((match) => ({
    published: Number(match[1]),
    held: Number(match[2]),
  }));
  const rows = [...html.matchAll(/<tr[^>]*><th scope="row"[^>]*>[^<]+<\/th><td[^>]*>(\d+)%<\/td><td[^>]*>(\d+)%<\/td>/g)].map(
    (match) => ({ published: Number(match[1]), held: Number(match[2]) }),
  );

  it("draws one dot for each row of the table, at the numbers the row prints", () => {
    assert.ok(rows.length > 0, "the study renders its table from the archive");
    assert.deepEqual(dots, rows);
  });

  it("still bears out the paragraph's fixed claim that every band held more often than published", () => {
    /* "Every band below held more often than the percent published for it" is
       written into the paragraph, not derived, and the chart now shows it as
       every dot above the diagonal. The archive grows each month; the day a
       band falls below the line this fails, and the sentence has to change
       with the chart rather than contradict it. */
    const above = rows.filter((row) => row.held > row.published).length;
    assert.ok(above > 0);
    assert.match(html, /Every band below held more often than its published percent/);
    assert.equal(above, rows.length, "the archive the paragraph describes still holds the claim");
  });

  it("names each dot on hover and leaves the reading to the table and caption", () => {
    assert.match(chart, /<title>0 to 5 points from the line: published \d+%, held \d+% across \d+ months<\/title>/);
    assert.match(chart, /aria-hidden="true"/, "the table under it is the accessible form of the same rows");
    assert.match(html, /Each dot is a band of the table below, sized by its months\./);
  });
});
