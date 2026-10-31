import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalHeaderNavClient, MobileNavContent } from "../app/components/globalHeaderNavClient";
import { resolveGlobalHeaderNavigationLinks } from "../lib/navigation/globalHeader";
import * as nextNavigation from "next/navigation";

const mockAny: any = mock;

/* The header reads the app router; renderToStaticMarkup mounts none. Installed
   here so the file answers for its own dependencies rather than passing on
   another suite's ordering luck. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

describe("GlobalHeaderNavClient", () => {
  it("renders the four groups as tabs in order, then the utility links, and no More menu", () => {
    const html = renderToStaticMarkup(<GlobalHeaderNavClient pathname="/" />);
    const bar = html.slice(html.indexOf('aria-label="Primary"'), html.indexOf('aria-label="Utility"'));
    const utility = html.slice(html.indexOf('aria-label="Utility"'));

    const positions = ["This week", "Plan", "History", "Guides"].map((label) => {
      const index = bar.indexOf(`<span>${label}</span>`);
      assert.ok(index > -1, `the bar renders ${label}`);
      return index;
    });
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "tabs keep IA order");
    for (const retired of ["Brief", "Decide", "Why it changed", "Resolve", "Trust", "Record"]) {
      assert.ok(!bar.includes(`<span>${retired}</span>`), `the bar no longer carries ${retired}`);
    }
    for (const href of ["/share", "/about"]) {
      assert.ok(utility.includes(`href="${href}"`), `the utility row links ${href}`);
    }
    assert.ok(!html.includes("<details"), "no More menu");
    assert.ok(!html.includes('href="/api-docs"'), "API & MCP is reached from /share, not the header");
  });

  it("shows each tab's one-key shortcut so the keyboard layer is discoverable", () => {
    const html = renderToStaticMarkup(<GlobalHeaderNavClient pathname="/" />);
    for (const key of ["w", "p", "h", "g"]) {
      assert.ok(html.includes(`>${key}</kbd>`), `tab shows the ${key} key`);
    }
  });

  it("marks the group current on a nested route", () => {
    const html = renderToStaticMarkup(<GlobalHeaderNavClient pathname="/signals/capital-tightness-watch" />);
    const bar = html.slice(html.indexOf('aria-label="Primary"'), html.indexOf('aria-label="Utility"'));
    assert.match(bar, /<a[^>]*href="\/"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/"/, "This week is current");
    assert.equal(bar.split('aria-current="page"').length - 1, 1, "exactly one tab is active");
  });

  it("lists every group's pages and the utility links in the mobile sheet", () => {
    const navigationLinks = resolveGlobalHeaderNavigationLinks("/");
    const html = renderToStaticMarkup(
      <MobileNavContent navigationLinks={navigationLinks} currentPathname="/" onClose={() => {}} />,
    );
    for (const label of ["This week", "Why it changed", "Plan", "Runway planner", "History", "Compare periods", "Calibration", "Reading list", "Guides", "Share and embed", "API &amp; MCP", "About", "Contact"]) {
      assert.ok(html.includes(label), `the sheet lists ${label}`);
    }
    assert.ok(html.includes("Search or jump to a page"), "the sheet opens search");
  });
});
