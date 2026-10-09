import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { RulesBeforeCommit } from "../app/operate/components/rulesBeforeCommit";
import { getPlaybookForRegime } from "../lib/playbook";
import { REGIME_LABELS, REGIME_ORDER, getRegimePublicLabel } from "../lib/regimePresentation";
import { insightDatabase } from "../data/recommendations";

/**
 * One condition, one public name.
 *
 * `REGIME_LABELS` is the single table, and its comment records that four
 * byte-identical copies of it drifted before they were collapsed. A fifth copy
 * survived that collapse in `data/recommendations.ts`, which carried the
 * *internal* names as its playbook titles — so `/operate` headlined "Scarcity"
 * in the week `/` stamped "FREEZING". A reader meeting both in one session has
 * no way to know they are the same week.
 *
 * The rendered assertion is the load-bearing one: the panel is what a reader
 * sees, and a title that goes back to being stored would pass a data-shape
 * check and fail this.
 */
describe("regime public labels", () => {
  /* The panel no longer heads itself with the conditions (2026-10-09: the page
     intro stamps them); what it renders must still never be an internal name. */
  it("renders each regime's rules without an internal name", () => {
    for (const regime of REGIME_ORDER) {
      const playbook = getPlaybookForRegime(regime);
      assert.ok(playbook, `no playbook for ${regime}`);

      const html = renderToStaticMarkup(
        <RulesBeforeCommit
          playbook={playbook}
          stopItems={[]}
          startItems={[]}
          fenceItems={[]}
          showAll={false}
        />,
      );

      assert.ok(html.includes(playbook.insight.replace(/'/g, "&#x27;")), `${regime} panel renders its insight`);
      for (const internal of ["Scarcity", "Defensive", "Volatile", "Expansion"]) {
        assert.ok(!html.includes(internal), `${regime} panel renders the internal name "${internal}"`);
      }
    }
  });

  it("does not ship an internal regime name as reader-facing copy", () => {
    /* The engine's own words for the four quadrants. They are correct as keys
       and as identifiers; they are never what a reader is shown. */
    const internalNames = ["Scarcity", "Defensive", "Volatile", "Expansion"];

    for (const entry of insightDatabase.regimePlaybooks.regimes) {
      const publicLabel = getRegimePublicLabel(entry.key);
      assert.ok(
        !internalNames.includes(publicLabel),
        `${entry.key} resolves to the internal name "${publicLabel}"`,
      );
      assert.equal(publicLabel, REGIME_LABELS[entry.key]);
    }
  });

  it("keeps the playbook title derived rather than stored", () => {
    /* A source read, deliberately: the defect this guards is a `title` field
       coming back to the data file, and a derived title and a correct stored
       one render identically. */
    for (const entry of insightDatabase.regimePlaybooks.regimes) {
      assert.ok(
        !Object.prototype.hasOwnProperty.call(entry, "title"),
        `${entry.key} stores its own title; derive it from REGIME_LABELS instead`,
      );
    }
  });
});
