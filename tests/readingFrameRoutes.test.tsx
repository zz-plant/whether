import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import * as nextNavigation from "next/navigation";

const mockAny: any = mock;

/* Some of these pages mount client islands that reach the router, which
   renderToStaticMarkup never mounts. Spread rather than replaced: `mock.module`
   patches the registry process-wide (see recordRoutesReadingOrder). */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * The reading pages were split across three frames: ContentPageShell, a
 * SecondaryPageShell with its own widths and backdrop, and hand-rolled <main>s.
 * The hand-rolled ones carried no id, so the layout's "Skip to content" link
 * went nowhere on the brief record, /about, /contact, the decision-shield
 * overview and every resource article. The landmark audit passed them, because
 * its streamed-route fallback found the 404 boundary's <main> in the flight
 * payload. Each page is held to one targeted <main> here, from its own render.
 */
const routes: Array<[string, () => Promise<ReactElement>]> = [
  ["/about", async () => (await import("../app/about/page")).default()],
  ["/contact", async () => (await import("../app/contact/page")).default()],
  ["/brief/2026-w31", async () => (await import("../app/brief/[week]/page")).default({ params: Promise.resolve({ week: "2026-w31" }) })],
  ["/resources/decision-shield-overview", async () => (await import("../app/resources/decision-shield-overview/page")).default()],
  [
    "/resources/should-we-freeze-hiring-high-interest-rate-environment",
    async () =>
      (await import("../app/resources/[slug]/page")).default({
        params: Promise.resolve({ slug: "should-we-freeze-hiring-high-interest-rate-environment" }),
      }),
  ],
  [
    "/answers/should-startups-hire-engineers-right-now",
    /* The route wraps this in a Suspense boundary that renderToStaticMarkup
       cannot resolve; the content component owns the frame. */
    async () =>
      (await import("../app/answers/decisionAnswerPageContent")).DecisionAnswerPageContent({
        slug: "should-startups-hire-engineers-right-now",
        route: "/answers/should-startups-hire-engineers-right-now",
      }),
  ],
  ["/calibration", async () => (await import("../app/calibration/page")).default()],
  ["/concepts", async () => (await import("../app/concepts/page")).default()],
  ["/decisions", async () => (await import("../app/decisions/page")).default()],
  ["/404", async () => (await import("../app/not-found")).default()],
];

describe("every reading page renders in the reading frame", () => {
  for (const [route, render] of routes) {
    it(`${route} owns one <main id="main-content">`, async () => {
      const html = renderToStaticMarkup(await render());
      const mains = html.match(/<main\b[^>]*>/g) ?? [];
      assert.equal(mains.length, 1, `${route} renders one <main>`);
      assert.match(mains[0] ?? "", /\bid="main-content"/, `${route}'s <main> is the skip link's target`);
    });
  }
});

describe("a resource article", () => {
  /* Its only link back to the brief was a pair of pills rendered above the
     page's <main>, and its live-guidance block printed the full paste citation,
     URLs and all, as its date line. */
  it("links back to the brief from inside its <main>, under a dated line", async () => {
    const page = await import("../app/resources/[slug]/page");
    const html = renderToStaticMarkup(
      await page.default({ params: Promise.resolve({ slug: "should-we-freeze-hiring-high-interest-rate-environment" }) }),
    );
    const main = html.indexOf("<main");
    assert.equal(html.slice(0, main).replace(/<[^>]+>/g, "").trim(), "", "nothing renders before the landmark");
    assert.ok(html.indexOf("Open this week&#x27;s brief") > main);
    assert.match(html, /As of [A-Z][a-z]{2} \d{1,2}, \d{4} · signals refreshed/);
    assert.doesNotMatch(html, /Start from Weekly Brief|Source note: https?:/);
  });
});
