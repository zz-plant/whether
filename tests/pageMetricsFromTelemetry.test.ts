import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildPageMetrics } from "../lib/seo/pageMetricsFromTelemetry";

const row = (event: unknown) => ({ blob2: JSON.stringify(event) });

const entrance = (pagePath: string, source?: string) =>
  row({ pagePath, cluster: "authority", intent: "board", type: "organic_entrance", ...(source ? { source } : {}) });
const conversion = (pagePath: string) =>
  row({ pagePath, cluster: "authority", intent: "board", type: "cta_conversion", ctaId: "subscribe" });

describe("page metrics from telemetry", () => {
  it("counts entrances and conversions per URL and derives the rate the refresh queue reads", () => {
    const metrics = buildPageMetrics([
      entrance("/resources/capital-discipline-venture-backed-companies"),
      entrance("/resources/capital-discipline-venture-backed-companies"),
      entrance("/resources/capital-discipline-venture-backed-companies"),
      entrance("/resources/capital-discipline-venture-backed-companies"),
      conversion("/resources/capital-discipline-venture-backed-companies"),
      entrance("/answers/should-startups-raise-capital-now"),
    ]);

    const pillar = metrics.byUrl["/resources/capital-discipline-venture-backed-companies"];
    assert.equal(pillar?.entrances30d, 4);
    assert.equal(pillar?.ctaConversions30d, 1);
    assert.equal(pillar?.ctaConversionRate, 0.25);
    assert.equal(pillar?.cluster, "authority");
    assert.equal(pillar?.intent, "board");

    assert.equal(metrics.byUrl["/answers/should-startups-raise-capital-now"]?.entrances30d, 1);
    assert.equal(metrics.eventsParsed, 6);
  });

  /*
   * Not zero. A page with conversions and no recorded entrance would otherwise
   * divide by zero and report a rate of Infinity — or, floored to 0, would read
   * as "converts nobody" and be queued for a refresh it does not need. Null says
   * "not measurable", which is the true answer and which the queue skips.
   */
  it("reports an unmeasurable conversion rate as null rather than zero", () => {
    const metrics = buildPageMetrics([conversion("/about")]);

    assert.equal(metrics.byUrl["/about"]?.ctaConversions30d, 1);
    assert.equal(metrics.byUrl["/about"]?.ctaConversionRate, null);
  });

  /*
   * `writeAnalytics` truncates a blob at ~5KB, so a long event lands as invalid
   * JSON. One malformed row must not take the whole file down with it.
   */
  it("skips unparseable and malformed rows without dropping the good ones", () => {
    const metrics = buildPageMetrics([
      { blob2: '{"pagePath":"/trust","type":"organic_entra' },
      { blob2: null },
      {},
      row({ type: "organic_entrance" }), //          no pagePath
      row({ pagePath: "/trust" }), //                no type
      row("not-an-object"),
      entrance("/trust"),
    ]);

    assert.equal(metrics.eventsRead, 7);
    assert.equal(metrics.eventsParsed, 1);
    assert.equal(metrics.byUrl["/trust"]?.entrances30d, 1);
  });

  it("ignores cluster and intent values outside the measurement model", () => {
    const metrics = buildPageMetrics([
      row({ pagePath: "/signals", cluster: "not-a-cluster", intent: "nobody", type: "organic_entrance" }),
    ]);

    assert.equal(metrics.byUrl["/signals"]?.entrances30d, 1);
    assert.equal(metrics.byUrl["/signals"]?.cluster, undefined);
    assert.equal(metrics.byUrl["/signals"]?.intent, undefined);
  });

  /*
   * The queue derives its own tier from `entrances30d` when the field is
   * absent. Emitting one here would duplicate its thresholds in a second file.
   */
  it("leaves the traffic tier to the refresh queue that owns the thresholds", () => {
    const metrics = buildPageMetrics([entrance("/operate")]);

    assert.ok(!("trafficTier" in (metrics.byUrl["/operate"] ?? {})));
  });

  /*
   * The event was called `organic_entrance` and checked no referrer, so every
   * direct, paid, and social visit was counted as organic. The tracker sends a
   * coarse bucket now; rows written before it land in `unclassified`, and a
   * window spanning the change under-reports every classified bucket rather
   * than pretending they were all search.
   */
  it("separates search-referred entrances from the total, and keeps older rows unclassified", () => {
    const metrics = buildPageMetrics([
      entrance("/comps", "search"),
      entrance("/comps", "search"),
      entrance("/comps", "social"),
      entrance("/comps", "direct"),
      entrance("/comps"),
    ]);

    const comps = metrics.byUrl["/comps"];
    assert.equal(comps?.entrances30d, 5);
    assert.equal(comps?.organicSearchEntrances30d, 2);
    assert.deepEqual(comps?.entrancesBySource, {
      search: 2,
      social: 1,
      referral: 0,
      direct: 1,
      internal: 0,
      unclassified: 1,
    });
  });

  it("drops a source outside the model rather than counting it as a bucket", () => {
    const metrics = buildPageMetrics([entrance("/trust", "carrier-pigeon")]);

    assert.equal(metrics.byUrl["/trust"]?.entrances30d, 1);
    assert.equal(metrics.byUrl["/trust"]?.entrancesBySource.unclassified, 1);
  });

  it("says in the artifact what the entrance numbers mean", () => {
    const metrics = buildPageMetrics([entrance("/operate", "search")]);

    assert.match(metrics.entranceDefinition, /entrances30d counts every first-visit entrance/);
    assert.match(metrics.entranceDefinition, /unclassified/);
  });
});
