import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import ThresholdPage from "../app/threshold/page";
import { utilityLinks } from "../lib/navigation/informationArchitecture";

const appPath = (route: string) => new URL(`../app${route}`, import.meta.url).pathname;

describe("bounded decisions: framework and form on one page", () => {
  it("carries both halves — the three parts and the blank form", () => {
    const html = renderToStaticMarkup(<ThresholdPage />);

    // From the framework half.
    assert.match(html, /The three parts/);
    assert.match(html, /Why it works/);
    // From the form half, which used to be /template.
    assert.match(html, /Fill one in/);
    assert.match(html, /Review cadence/);
    assert.match(html, /No signup required/);
  });

  it("anchors the form so an external /template link lands on it", () => {
    const html = renderToStaticMarkup(<ThresholdPage />);
    assert.match(html, /id="template"/);

    // next.config.js ships no types, so this reads the pair as text rather than
    // importing the module into a typechecked test.
    const config = readFileSync(new URL("../next.config.js", import.meta.url).pathname, "utf8");
    assert.match(
      config,
      /\["\/template", "\/threshold#template"\]/,
      "/template must keep a permanent redirect for external links",
    );
  });

  it("stops advertising the merged route as a separate destination", () => {
    assert.equal(existsSync(appPath("/template/page.tsx")), false);
    // `utilityLinks` is a const tuple, so TypeScript already refuses "/template"
    // as a member — this keeps the guarantee readable at runtime too.
    const hrefs: readonly string[] = utilityLinks.map((link) => link.href);
    assert.equal(hrefs.includes("/template"), false, "two rows must not point at halves of one page");
    assert.equal(hrefs.filter((href) => href === "/threshold").length, 1);
  });
});

describe("mockups", () => {
  it("keeps only the one the weekly-brief spec cites", () => {
    assert.ok(existsSync(appPath("/mockups/operator-brief/page.tsx")));
    assert.equal(existsSync(appPath("/mockups/identicons/page.tsx")), false);
    assert.equal(existsSync(appPath("/mockups/visual-system/page.tsx")), false);
  });
});
