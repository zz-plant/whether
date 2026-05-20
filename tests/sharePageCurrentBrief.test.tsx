import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import SharePage from "../app/share/page";

describe("/share current weekly artifact", () => {
  it("renders real weekly brief exports instead of placeholder marketing copy", async () => {
    const html = renderToStaticMarkup(await SharePage());

    assert.match(html, /Current weekly artifact/);
    assert.match(html, /Posture/);
    assert.match(html, /Do now/);
    assert.match(html, /Pause if/);
    assert.match(html, /Re-open when/);
    assert.match(html, /Meeting pack/);
    assert.doesNotMatch(html, /Macro signals.*operating posture/);
    assert.doesNotMatch(html, /Current regime and operating posture for the period/);
  });
});
