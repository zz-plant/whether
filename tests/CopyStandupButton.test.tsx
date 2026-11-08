import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CopyStandupButton } from "../app/components/CopyStandupButton";

describe("CopyStandupButton", () => {
  it("renders an enabled button named for what it copies", () => {
    const markup = renderToStaticMarkup(createElement(CopyStandupButton, { text: "Guidance unchanged; no pace change. Conditions change if: funding pressure falls 13 pts." }));

    assert.match(markup, /<button[^>]*type="button"/);
    assert.ok(!markup.includes('disabled=""'), "idle button is not disabled");
    assert.ok(markup.includes("Copy 1-line standup"));
    assert.ok(markup.includes('data-testid="copy-standup-button"'));
  });
});