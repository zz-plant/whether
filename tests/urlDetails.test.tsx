import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { UrlDetails } from "../app/components/ui/urlDetails";
import { buildDisclosureHref, isDisclosureOpenInParams } from "../app/components/ui/disclosureUrlState";

const render = (initialOpen: boolean) =>
  renderToStaticMarkup(
    <UrlDetails queryKey="why" initialOpen={initialOpen} summary={<span>Why this call</span>}>
      <p>Signal breakdown</p>
    </UrlDetails>,
  );

describe("UrlDetails", () => {
  it("renders a real details element so the panel works before hydration", () => {
    const html = render(false);
    assert.match(html, /^<details/);
    assert.match(html, /<summary[^>]*>.*Why this call.*<\/summary>/);
    // Children are server-rendered, not deferred to a client collapsible.
    assert.match(html, /Signal breakdown/);
  });

  it("opens on the server when the link carries the query key", () => {
    assert.doesNotMatch(render(false), /<details[^>]*\bopen\b/);
    assert.match(render(true), /<details[^>]*\bopen\b/);
  });

  it("resolves initial state from a route's plain searchParams object", () => {
    assert.equal(isDisclosureOpenInParams({ why: "1" }, "why"), true);
    assert.equal(isDisclosureOpenInParams({ why: "0" }, "why"), false);
    assert.equal(isDisclosureOpenInParams(undefined, "why"), false);
    assert.equal(isDisclosureOpenInParams({ other: "1" }, "why"), false);
  });

  it("adds the key when opening and drops it when closing", () => {
    const params = new URLSearchParams("month=7");
    assert.equal(buildDisclosureHref("/", params, "why", true), "/?month=7&why=1");
    assert.equal(buildDisclosureHref("/", new URLSearchParams("month=7&why=1"), "why", false), "/?month=7");
  });
});
