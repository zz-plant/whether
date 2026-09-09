import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { FrameworkSection } from "../app/trust/frameworkSection";
import { utilityLinks } from "../lib/navigation/informationArchitecture";

const appPath = (route: string) => new URL(`../app${route}`, import.meta.url).pathname;

describe("bounded decisions: framework and form as a section of /trust", () => {
  it("carries both halves — the three parts and the blank form", () => {
    const html = renderToStaticMarkup(<FrameworkSection />);

    // From the framework half.
    assert.match(html, /The three parts/);
    assert.match(html, /Why it works/);
    // From the form half, which used to be /template.
    assert.match(html, /Fill one in/);
    assert.match(html, /Review cadence/);
    assert.match(html, /No signup required/);
  });

  it("anchors the form so an external /template link lands on it", () => {
    const html = renderToStaticMarkup(<FrameworkSection />);
    assert.match(html, /id="template"/);
    assert.match(html, /id="framework"/);

    // next.config.js ships no types, so this reads the pair as text rather than
    // importing the module into a typechecked test.
    const config = readFileSync(new URL("../next.config.js", import.meta.url).pathname, "utf8");
    assert.match(
      config,
      /\["\/template", "\/trust#template"\]/,
      "/template must keep a permanent redirect for external links",
    );
    assert.match(config, /\["\/threshold", "\/trust#framework"\]/, "/threshold redirects to its section of /trust");
  });

  it("stops advertising the merged route as a separate destination", () => {
    assert.equal(existsSync(appPath("/template/page.tsx")), false);
    assert.equal(existsSync(appPath("/threshold/page.tsx")), false);
    // `utilityLinks` is a const tuple, so TypeScript already refuses "/template"
    // as a member — this keeps the guarantee readable at runtime too.
    const hrefs: readonly string[] = utilityLinks.map((link) => link.href);
    assert.equal(hrefs.includes("/template"), false, "two rows must not point at halves of one page");
    assert.equal(hrefs.includes("/threshold"), false, "the framework is a section of /trust, not a utility row");
  });
});

describe("mockups", () => {
  it("keeps only the one the weekly-brief spec cites", () => {
    assert.ok(existsSync(appPath("/mockups/operator-brief/page.tsx")));
    assert.equal(existsSync(appPath("/mockups/identicons/page.tsx")), false);
    assert.equal(existsSync(appPath("/mockups/visual-system/page.tsx")), false);
  });
});

/*
 * The 2026-09-08 pass. Each entry here is a route that read as a peer of the
 * brief and was one of three things: a view of `/` under its own H1, a record
 * filed under the planning hub, or a second door to the artifact `/share`
 * already offered.
 */
describe("routes folded into the surface that owned them", () => {
  const config = readFileSync(new URL("../next.config.js", import.meta.url).pathname, "utf8");

  it("retires /state as a view of the brief under its own heading", () => {
    assert.equal(existsSync(appPath("/state/page.tsx")), false);
    assert.match(config, /\["\/state", "\/"\]/, "/state keeps a permanent redirect to /");
    const hrefs: readonly string[] = utilityLinks.map((link) => link.href);
    assert.equal(hrefs.includes("/state"), false, "a redirect must not stay in the utility row");
  });

  it("retires the decision ledger into the history the product keeps unasked", () => {
    assert.equal(existsSync(appPath("/operate/memory/page.tsx")), false);
    assert.equal(existsSync(appPath("/history/decisions/page.tsx")), false);
    assert.match(config, /\["\/operate\/memory", "\/history"\]/);
    assert.match(config, /\["\/history\/decisions", "\/history"\]/);
    // The older alias must land in one hop, not chain through a retired route.
    assert.match(config, /\["\/planning\/memory", "\/history"\]/);
  });

  it("folds the embed builder into the share page", () => {
    assert.equal(existsSync(appPath("/embed/page.tsx")), false);
    assert.ok(existsSync(appPath("/share/embedBuilder.tsx")));
    assert.match(config, /\["\/embed", "\/share#embed"\]/);
    const share = readFileSync(appPath("/share/page.tsx"), "utf8");
    assert.match(share, /id="embed"/, "the redirect target anchor must exist");
    const hrefs: readonly string[] = utilityLinks.map((link) => link.href);
    assert.equal(hrefs.includes("/embed"), false);
  });

  it("gives the share page the same picker as the share panel", () => {
    const share = readFileSync(appPath("/share/sharePageFormats.tsx"), "utf8");
    const rail = readFileSync(appPath("/components/shareRail.tsx"), "utf8");
    // One component, imported by both — not a page and an overlay that build
    // the same thing twice, which 1.1.9 of the specs left as the follow-up.
    assert.match(share, /from "\.\.\/components\/briefFormatPicker"/);
    assert.match(rail, /from "\.\/briefFormatPicker"/);
    assert.doesNotMatch(rail, /^const BriefFormatPicker/m, "the rail no longer defines its own picker");
  });
});

describe("resources static params", () => {
  it("emits no slug the dynamic route cannot render", () => {
    /*
     * `generateStaticParams` spread `resourceSupportingPages`, whose only
     * contribution beyond the downloadables is decision-shield-overview — not a
     * pillar, not a downloadable, not an article, so `[slug]` reaches
     * `notFound()` for it. Its own static segment shadows the dynamic route, so
     * the page worked and the phantom param never showed. It was a trap for
     * whoever tried to delete that sibling believing `[slug]` covered it.
     */
    const route = readFileSync(appPath("/resources/[slug]/page.tsx"), "utf8");
    const params = route.slice(
      route.indexOf("export function generateStaticParams"),
      route.indexOf("const buildSectionAnchor"),
    );
    assert.ok(!params.includes("resourceSupportingPages"), "supporting pages are not all renderable here");

    // The sibling is what actually serves it, so it has to stay until the route
    // grows a branch that can.
    assert.ok(existsSync(appPath("/resources/decision-shield-overview/page.tsx")));
  });
});

