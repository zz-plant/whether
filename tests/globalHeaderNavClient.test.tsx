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
  it("renders the whole loop as tabs in the bar, in IA order, with utilities inside More", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavClient pathname="/" />,
    );
    const bar = html.slice(html.indexOf('aria-label="Primary"'), html.indexOf("<details"));
    const more = html.slice(html.indexOf("<details"), html.indexOf("</details>"));

    // Six short words fit in a header at any desktop width. Hiding five of
    // them behind a disclosure made the loop the product is built around
    // invisible until a chevron was clicked.
    const positions = ["Brief", "Plan", "Evidence", "Resolve", "Trust", "History"].map((label) => {
      const index = bar.indexOf(`<span>${label}</span>`);
      assert.ok(index > -1, `the bar renders ${label}`);
      return index;
    });
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "tabs keep IA order");
    assert.ok(more.includes('href="/api-docs"'), "More carries the utility links");
    assert.ok(!more.includes("<span>Plan</span>"), "the loop is not repeated inside More");
    assert.ok(!bar.includes('href="/api-docs"'), "API is not a tab");
  });

  it("shows each tab's one-key shortcut so the keyboard layer is discoverable", () => {
    const html = renderToStaticMarkup(<GlobalHeaderNavClient pathname="/" />);
    for (const key of ["p", "e", "r", "t", "h"]) {
      assert.ok(html.includes(`<kbd aria-hidden="true" class="`) && html.includes(`>${key}</kbd>`), `tab shows the ${key} key`);
    }
  });

  it("marks the matching tab current on a nested report route", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavClient pathname="/signals/thresholds" />,
    );
    const bar = html.slice(html.indexOf('aria-label="Primary"'), html.indexOf("<details"));

    assert.match(
      bar,
      /<a[^>]*href="\/signals"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/signals"/,
      "Evidence tab is current",
    );
    assert.equal(bar.split('aria-current="page"').length - 1, 1, "exactly one tab is active");
  });

  it("renders resource and framework section in mobile navigation content", () => {
    const navigationLinks = resolveGlobalHeaderNavigationLinks("/");
    const html = renderToStaticMarkup(
      <MobileNavContent navigationLinks={navigationLinks} currentPathname="/" onClose={() => {}} />,
    );
    assert.ok(html.includes("Tools &amp; reference") || html.includes("Tools & reference"), "includes mobile resource section title");
    assert.ok(html.includes("API &amp; MCP"), "includes API link");
    // The Template row is gone: the blank form is a section of the Framework
    // page now, so two rows pointing at halves of one page became one.
    assert.ok(!html.includes(">Template<"), "no separate Template row");
    assert.ok(html.includes("About"), "includes About link");
  });

  it("nests demoted hubs as supporting layers under the brief in mobile", () => {
    const navigationLinks = resolveGlobalHeaderNavigationLinks("/");
    const html = renderToStaticMarkup(
      <MobileNavContent navigationLinks={navigationLinks} currentPathname="/" onClose={() => {}} />,
    );
    for (const hub of ["Evidence", "Plan", "Resolve", "Trust"]) {
      assert.ok(html.includes(hub), `mobile drawer keeps ${hub} reachable under the brief`);
    }
  });
});


