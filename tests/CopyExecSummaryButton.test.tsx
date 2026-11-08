import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CopyExecSummaryButton } from "../app/components/CopyExecSummaryButton";

describe("CopyExecSummaryButton", () => {
  it("renders an enabled button named for what it copies", () => {
    const markup = renderToStaticMarkup(createElement(CopyExecSummaryButton, { text: "• Do now: hold hiring\n• Pause if: funding pressure > 76" }));

    assert.match(markup, /<button[^>]*type="button"/);
    assert.ok(!markup.includes('disabled=""'), "idle button is not disabled");
    assert.ok(markup.includes("Copy 3-bullet exec summary"));
    assert.ok(markup.includes('data-testid="copy-exec-summary-button"'));
  });
});