import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandCenterNavBlock } from "../app/components/report-shell/CommandCenterNavBlock";

/*
 * One size per role (2026-10-27). A size audit at 390px found a report page's title at
 * 15px under 20px sections, page titles at five sizes, and 215 pieces of phone text
 * under 12px. These hold the steps the fix set; the rest is ui-ux-standards §XXVIII.
 */
const css = (file: string) => readFileSync(file, "utf8");
const ruleBody = (source: string, selector: string) => {
  const start = source.indexOf(`${selector} {`);
  return source.slice(start, source.indexOf("}", start));
};

describe("type steps", () => {
  it("sets every page title in the one title step, the report intro's included", () => {
    const html = renderToStaticMarkup(
      <CommandCenterNavBlock
        pageTitle="Decide"
        recordDateLabel="Oct 23, 2026"
        statusLabel="Cloudy"
        trustStatusLabel="All sources live"
        fetchedAtLabel=""
        showOfflineBadge={false}
        offlineBadgeLabel=""
      />,
    );
    assert.match(html, /<h1[^>]*class="[^"]*\btext-fluid-2xl\b[^"]*"[^>]*>Decide<\/h1>/);
    assert.doesNotMatch(html, /<h1[^>]*text-fluid-base/, "15px on a phone, under 20px sections");
    assert.match(ruleBody(css("app/styles/layout-shells.css"), ".weather-secondary-title"), /font-size: var\(--text-fluid-2xl\)/);
  });

  it("sets a reading page's section title in the section step", () => {
    const shells = css("app/styles/layout-shells.css");
    assert.match(ruleBody(shells, ".weather-secondary-section-title"), /font-size: 1\.375rem/);
    assert.match(shells, /@media \(min-width: 640px\) \{\s*\.weather-secondary-section-title \{\s*font-size: 1\.5rem;/);
  });

  it("draws nothing on a phone under 12px from the smallest step", () => {
    const tokens = css("app/styles/tokens.css");
    assert.match(tokens, /--text-fluid-nano: clamp\(0\.75rem,/);
    assert.match(tokens, /--fs-nano: clamp\(0\.75rem,/, "the plain-CSS mirror keeps step");
  });
});
