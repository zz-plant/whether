import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AllAreaRules } from "../app/components/home/AllAreaRules";
import type { HomeAreaRow } from "../lib/report/home/homeSectionModel";

/*
 * DD-039's open item: on a week one area moved, the folded table printed "Pause still
 * applies: no line crossed since Sep 30." in each of the other four rows. The held areas
 * share one sentence over the table now, and the moved area keeps its row's note.
 */
const held = "Pause still applies: no line crossed since Sep 30.";
const row = (area: HomeAreaRow["area"], changed: string, changedKind: HomeAreaRow["changedKind"]): HomeAreaRow => ({
  area,
  rule: `Rule for ${area}`,
  changed,
  changedKind,
});

describe("all five areas, side by side", () => {
  const html = renderToStaticMarkup(
    <AllAreaRules
      rows={[
        row("hiring", held, "held"),
        row("product-tempo", "Resume line no longer met: risk appetite fell below 54.", "resumeLost"),
        row("capital-raising", held, "held"),
        row("burn-discipline", held, "held"),
        row("expansion-bets", held, "held"),
      ]}
      heldGroups={[
        {
          state: "pause",
          areas: ["hiring", "capital-raising", "burn-discipline", "expansion-bets"],
          text: "Pause still applies to Hiring, Fundraising, Spending and New bets: no line crossed since Sep 30.",
        },
      ]}
      regime="SCARCITY"
      planHref="/operate"
      isHistorical
    />,
  );

  it("says the held areas once, over the table", () => {
    assert.equal((html.match(/Pause still applies/g) ?? []).length, 1);
    assert.match(html, /data-held-groups[^>]*><p>Pause still applies to Hiring, Fundraising, Spending and New bets/);
  });

  it("keeps the moved area's note in its row", () => {
    assert.match(html, /Resume line no longer met: risk appetite fell below 54\./);
    assert.match(html, /data-moved="true"/);
  });
});
