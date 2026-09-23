import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { HeaderChoicePill } from "../app/components/HeaderChoicePill";
import { OPERATOR_STAGE_OPTIONS } from "../lib/report/operatorStage";

describe("header choice pill", () => {
  it("names the setting on its face, not only the value", () => {
    /* The phone header showed "Series A" and "12–24 mo" bare, which on a first
       visit reads as the page asserting facts about the reader's company. */
    const html = renderToStaticMarkup(
      <HeaderChoicePill label="Stage" options={OPERATOR_STAGE_OPTIONS} value="series-a" onSelect={() => {}} />,
    );
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    assert.match(text, /^Stage Series A/);
    assert.match(html, /aria-label="Stage: Series A"/, "the accessible name is unchanged");
  });

  it("renders a fixed id rather than one derived from its place in the tree", () => {
    /* The server rendered base-ui-_R_5p6l6_ on every load and the client
       computed a shallower path in about half of hydrations, so React logged a
       mismatch on both header pills. */
    const html = renderToStaticMarkup(
      <HeaderChoicePill label="Cash runway" options={OPERATOR_STAGE_OPTIONS} value="seed" onSelect={() => {}} />,
    );
    assert.match(html, /id="header-choice-cash-runway"/);
    assert.doesNotMatch(html, /_R_/, "no id generated from the tree path");
  });
});
