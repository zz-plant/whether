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
        pageTitle="Plan"
        recordDateLabel="Oct 23, 2026"
        statusLabel="Cloudy"
        trustStatusLabel="All sources live"
        fetchedAtLabel=""
        showOfflineBadge={false}
        offlineBadgeLabel=""
      />,
    );
    assert.match(html, /<h1[^>]*class="[^"]*\btext-fluid-2xl\b[^"]*"[^>]*>Plan<\/h1>/);
    assert.doesNotMatch(html, /<h1[^>]*text-fluid-base/, "15px on a phone, under 20px sections");
    assert.match(ruleBody(css("app/styles/layout-shells.css"), ".weather-secondary-title"), /font-size: var\(--text-fluid-2xl\)/);
  });

  it("sets a reading page's section title in the section step", () => {
    const shells = css("app/styles/layout-shells.css");
    assert.match(ruleBody(shells, ".weather-secondary-section-title"), /font-size: var\(--text-fluid-xl\)/);
    assert.match(ruleBody(css("app/styles/typography.css"), ".type-section"), /font-size: var\(--text-fluid-xl\)/);
    assert.doesNotMatch(shells, /\.weather-home-section[^{]*h2 \{[^}]*font-size/, "the home page drew two section sizes");
  });

  it("draws nothing on a phone under 12px from the smallest step", () => {
    const tokens = css("app/styles/tokens.css");
    assert.match(tokens, /--text-fluid-nano: clamp\(0\.75rem,/);
    assert.match(tokens, /--fs-nano: var\(--text-fluid-nano\)/, "the plain-CSS name keeps step");
  });

  it("keeps every step of the ladder at least 1.125x the one below, at both ends", () => {
    const tokens = css("app/styles/tokens.css");
    const steps = ["nano", "sm", "base", "lg", "xl", "2xl"].map((step) => {
      const match = new RegExp(`--text-fluid-${step}: clamp\\(([\\d.]+)rem,[^,]+, ([\\d.]+)rem\\)`).exec(tokens);
      assert.ok(match, `--text-fluid-${step} is a clamp`);
      return { step, phone: Number(match[1]), desktop: Number(match[2]) };
    });
    for (const [index, upper] of steps.entries()) {
      const lower = steps[index - 1];
      if (!lower) continue;
      for (const end of ["phone", "desktop"] as const) {
        assert.ok(upper[end] / lower[end] >= 1.125, `${lower.step} to ${upper.step} at the ${end} end is not a step`);
      }
    }
  });

  it("puts Tailwind's small sizes on the ladder, so a typed text-sm is not a second scale", () => {
    const tokens = css("app/styles/tokens.css");
    for (const [name, step] of [["xs", "nano"], ["sm", "sm"], ["base", "base"], ["lg", "lg"], ["xl", "xl"]]) {
      assert.ok(tokens.includes(`--text-${name}: var(--text-fluid-${step});`), `text-${name} left the ladder`);
    }
  });
});
