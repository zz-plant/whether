import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RunwayConditionedNotes } from "../app/components/RunwayConditionedNotes";
import * as nextNavigation from "next/navigation";

const mockAny: any = mock;

/* The notes read the app router; renderToStaticMarkup mounts none. Installed
   here so the file answers for its own dependencies rather than passing on
   another suite's ordering luck. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/*
 * Server-rendered, so no band and no figure: what every reader sees before
 * hydration and what a reader who has not chosen sees after it.
 */
describe("runway notes on the homepage", () => {
  it("invites a choice without offering a second control for it", () => {
    /* This panel carried its own four-band picker under the header's and the
       section's, with different bands and separate storage. The band control
       above is the only one now. */
    const html = renderToStaticMarkup(<RunwayConditionedNotes regime="DEFENSIVE" />);
    assert.match(html, /What this guidance means at your runway/);
    assert.match(html, /Showing 12–24 mo until you pick your cash runway above/, "the default is named as a default");
    assert.doesNotMatch(html, /<input|<fieldset|role="radio/, "no second runway control");
    assert.ok(!html.includes("<li"), "no note may render before a runway is chosen");
  });
});
