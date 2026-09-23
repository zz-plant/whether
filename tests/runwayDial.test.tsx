import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RunwayConditionedNotes } from "../app/components/RunwayConditionedNotes";

/*
 * Server-rendered, so no band and no figure: what every reader sees before
 * hydration and what a reader who has not chosen sees after it.
 */
describe("runway notes on the homepage", () => {
  it("invites a choice without offering a second control for it", () => {
    /* This panel carried its own four-band picker under the header's and the
       section's, with different bands and separate storage. The band control
       above is the only one now. */
    const html = renderToStaticMarkup(<RunwayConditionedNotes regime="DEFENSIVE" />);
    assert.match(html, /What this guidance means at your runway/);
    assert.match(html, /Choose your cash runway above/);
    assert.match(html, /shows 12–24 mo until you choose/, "the default is named as a default");
    assert.doesNotMatch(html, /<input|<fieldset|role="radio/, "no second runway control");
    assert.ok(!html.includes("<li"), "no note may render before a runway is chosen");
  });
});
