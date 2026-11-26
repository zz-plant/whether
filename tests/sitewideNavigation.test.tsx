import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalHeaderActionsClient } from "../app/components/globalHeaderActionsClient";
import { MobileNavContent } from "../app/components/globalHeaderNavClient";
import { MobileTabBar } from "../app/components/MobileTabBar";
import { MastheadSectionJumper } from "../app/components/runningHead";

const readAppFile = (relativePath: string) =>
  readFileSync(new URL(`../app/${relativePath}`, import.meta.url).pathname, "utf8");

describe("GlobalHeaderActionsClient", () => {
  it("renders Search and Share across all breakpoints and gates Present on the home brief", () => {
    const briefHtml = renderToStaticMarkup(<GlobalHeaderActionsClient showPresentMode />);
    assert.match(briefHtml, /aria-label="Search"/);
    assert.match(briefHtml, /aria-label="Share this page"/);
    assert.match(briefHtml, /Present/);

    const otherHtml = renderToStaticMarkup(<GlobalHeaderActionsClient />);
    assert.match(otherHtml, /aria-label="Search"/);
    assert.match(otherHtml, /aria-label="Share this page"/);
    assert.doesNotMatch(otherHtml, /Present/);
  });

  it("hides its md-only controls through a wrapper, never by pairing hidden with a display utility", () => {
    const html = renderToStaticMarkup(<GlobalHeaderActionsClient showPresentMode />);
    const displayUtilities = ["inline-flex", "flex", "grid", "inline-grid", "block", "inline-block"];

    /* Tailwind emits `.inline-flex` after `.hidden`, so both on one element resolves to
       the display utility and the control shows at every width. The 2026-11-22 phone
       capture found Present and Theme rendering on a 430px screen for exactly that. */
    for (const [, value] of html.matchAll(/class="([^"]*)"/g)) {
      const tokens = value.split(/\s+/);
      if (!tokens.includes("hidden")) continue;
      const conflict = tokens.find((token) => displayUtilities.includes(token));
      assert.equal(
        conflict,
        undefined,
        `one element cannot carry both "hidden" and "${conflict}": the display utility wins`,
      );
    }

    assert.equal(
      html.split('class="hidden md:inline-flex"').length - 1,
      2,
      "Present and Theme each sit inside their own md+ wrapper",
    );
  });
});

describe("MobileTabBar", () => {
  it("opens an anchored sibling popover on the active multi-page group and names the sheet Menu", () => {
    const html = renderToStaticMarkup(<MobileTabBar pathname="/operate" />);
    assert.match(html, /data-mobile-group-menu="decide"/);
    assert.match(html, /popover="auto"/);
    assert.match(html, /Runway planner/);
    assert.match(html, /<span>Menu<\/span>/);
    assert.doesNotMatch(html, /<span>More<\/span>/);
    assert.equal(html.split('aria-current="page"').length - 1, 1, "one active tab carries aria-current");
    assert.equal(html.split("<nav").length - 1, 1, "no nested nav landmark inside the tab bar");
    assert.doesNotMatch(html, /sky-300|sky-400|sky-500/, "mobile tab bar uses Forecast ink, never sky chrome");
  });

  it("retires the invisible horizontal swipe-to-switch-group listener", () => {
    const source = readAppFile("components/MobileTabBar.tsx");
    assert.doesNotMatch(source, /onTouchStart|touchstart|SWIPE_MIN_X|router\.push/);
  });

  it("names each group once: the hub row leads its column, with no eyebrow saying it again", () => {
    const tabBar = renderToStaticMarkup(<MobileTabBar pathname="/operate" />);
    assert.doesNotMatch(tabBar, /type-eyebrow/, "the active-tab popover is its group's page list, nothing above it");

    const sheet = renderToStaticMarkup(
      <MobileNavContent currentPathname="/operate" onClose={() => {}} />,
    );
    const eyebrows = [...sheet.matchAll(/type-eyebrow">([^<]*)</g)].map((match) => match[1].trim());
    assert.deepEqual(
      eyebrows,
      ["More from Whether"],
      "the group name is carried by its hub row, not by an eyebrow above a row of the same name",
    );
  });
});

describe("MastheadSectionJumper", () => {
  it("renders a popover section jumper marking the active section with aria-current=location", () => {
    const html = renderToStaticMarkup(
      <MastheadSectionJumper
        currentLabel="By area"
        sections={[
          { id: "brief-call", label: "This week's call" },
          { id: "by-area", label: "By area" },
          { id: "what-changed", label: "What changed" },
        ]}
      />,
    );
    assert.match(html, /data-masthead-section-menu/);
    assert.match(html, /popover="auto"/);
    assert.match(html, /href="#by-area"[^>]*aria-current="location"|aria-current="location"[^>]*href="#by-area"/);
    assert.match(html, /What changed/);
  });

  it("renders plain text when a page has fewer than two jump targets", () => {
    const html = renderToStaticMarkup(
      <MastheadSectionJumper
        currentLabel="Overview"
        sections={[{ id: "overview", label: "Overview" }]}
      />,
    );
    assert.doesNotMatch(html, /popover=/);
    assert.match(html, /Overview/);
  });
});

describe("unified sticky masthead and Forecast visual register", () => {
  it("consolidates GlobalHeader and RunningHead into one sticky masthead without MobileSectionChips", () => {
    const layout = readAppFile("layout.tsx");
    const gate = readAppFile("components/globalHeaderRouteGate.tsx");
    const shell = readAppFile("components/reportShell.tsx");

    assert.doesNotMatch(layout, /<RunningHead\b/, "layout no longer mounts a second fixed running head");
    assert.match(gate, /data-running-head/, "the single sticky masthead carries the reading-mode bar");
    assert.doesNotMatch(shell, /MobileSectionChips/, "reportShell no longer stacks a sticky chip scroller");
  });

  it("uses Forecast ink across chrome components without legacy sky-blue chrome accents", () => {
    for (const file of [
      "components/globalHeaderRouteGate.tsx",
      "components/globalHeaderActionsClient.tsx",
      "components/globalHeaderNavClient.tsx",
      "components/MobileTabBar.tsx",
      "components/AppSidebar.tsx",
      "components/sectionTabs.tsx",
      "components/PresentModeButton.tsx",
    ]) {
      const source = readAppFile(file);
      assert.doesNotMatch(source, /sky-300|sky-400|sky-500/, `${file} uses Forecast ink tokens, not sky chrome`);
    }
  });
});
