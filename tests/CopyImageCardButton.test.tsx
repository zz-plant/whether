import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CopyImageCardButton } from "../app/components/CopyImageCardButton";

describe("CopyImageCardButton", () => {
  it("renders an enabled button named for what it copies", () => {
    const markup = renderToStaticMarkup(createElement(CopyImageCardButton));

    assert.match(markup, /<button[^>]*type="button"/);
    assert.ok(!markup.includes('disabled=""'), "idle button is not disabled");
    assert.ok(markup.includes("Copy as an image"));
    assert.ok(markup.includes("1200×800 PNG"));
  });
});
