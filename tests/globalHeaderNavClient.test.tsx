import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalHeaderNavClient, MobileNavContent } from "../app/components/globalHeaderNavClient";
import { resolveGlobalHeaderNavigationLinks } from "../lib/navigation/globalHeader";

describe("GlobalHeaderNavClient", () => {
  it("renders only the brief in the bar and the loop inside More, in IA order", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavClient pathname="/" />,
    );
    const bar = html.slice(html.indexOf('aria-label="Primary"'), html.indexOf("<details"));
    const more = html.slice(html.indexOf("<details"), html.indexOf("</details>"));

    assert.ok(bar.includes("Weekly Brief"), "the bar renders the brief");
    // The IA marks these supporting. They used to render in the bar anyway as
    // `hidden lg:flex`, which made the one-screen cut true below 1024px and
    // false above it.
    for (const label of ["Plan", "Evidence", "Resolve", "Trust", "History"]) {
      assert.ok(!bar.includes(`>${label}<`), `${label} is not a bar item`);
    }

    const positions = ["Plan", "Evidence", "Resolve", "Trust", "History"].map((label) => {
      const index = more.indexOf(`>${label}<`);
      assert.ok(index > -1, `More renders ${label}`);
      return index;
    });
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "loop links keep IA order");
    assert.ok(more.indexOf(">Plan<") < more.indexOf('href="/api-docs"'), "the loop precedes the utility links");
    assert.ok(!bar.includes('href="/api-docs"'), "API is not a top-level nav item");
  });

  it("marks the matching loop link current inside More on a nested report route", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavClient pathname="/signals/thresholds" />,
    );
    const bar = html.slice(html.indexOf('aria-label="Primary"'), html.indexOf("<details"));
    const more = html.slice(html.indexOf("<details"), html.indexOf("</details>"));

    assert.equal(bar.split('aria-current="page"').length - 1, 0, "nothing in the bar is current off the brief");
    assert.match(
      more,
      /<a[^>]*href="\/signals"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/signals"/,
      "Evidence link is current",
    );
    assert.equal(more.split('aria-current="page"').length - 1, 1, "exactly one loop link is active");
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


