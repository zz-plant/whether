import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ThreeWhethersCard } from "../app/components/ThreeWhethersCard";
import type { ActionStripItem } from "../lib/report/operatingCalls";
import { ACTION_STRIP_DISPLAY_COPY } from "../lib/report/reportCopy";

const baseItem: ActionStripItem = {
  lever: "hiring-stance",
  label: "Hiring",
  areaActionNow: "Approve critical backfills.",
  triggerThreshold: "Funding pressure tightens above 70.",
  reversalCondition: "Funding pressure holds below 60.",
};

describe("ThreeWhethersCard", () => {
  it("uses plain-language scan labels for the three bounded-decision fields", () => {
    const html = renderToStaticMarkup(<ThreeWhethersCard items={[baseItem]} />);

    assert.match(html, /What can we do this week\?/);
    assert.match(html, /Do now:/);
    assert.match(html, /Stop or tighten if:/);
    assert.match(html, /Open up again when:/);
    assert.ok(!html.includes("Canonical rules"));
  });

  for (const [structuredState, actionPhrase] of Object.entries(ACTION_STRIP_DISPLAY_COPY.state)) {
    it(`translates the ${structuredState} lane state into an action phrase`, () => {
      const item: ActionStripItem = {
        ...baseItem,
        currentStateLabel: structuredState as NonNullable<ActionStripItem["currentStateLabel"]>,
      };
      const html = renderToStaticMarkup(<ThreeWhethersCard items={[item]} />);

      assert.match(html, new RegExp(actionPhrase));
      assert.ok(!html.includes(`>${structuredState}<`), "does not expose the structured state by itself");
    });
  }
});
