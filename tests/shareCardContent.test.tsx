import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { isValidElement, type ReactNode } from "react";

import { renderOgElement } from "../app/api/og/renderOgElement";
import { layoutReportCard } from "../app/api/og/reportImageTemplate";
import { generateMetadata as periodMetadata } from "../app/history/[period]/page";
import { buildSignalDecisionScenarioMetadata } from "../app/signals/[cluster]/[decision-scenario]/page";

/*
 * What a card says, read the way a feed shows it.
 *
 * A feed draws a card at roughly 500px wide — 40% of its size — so type below
 * ~20px is unreadable there, and a panel that says the same thing on every page
 * of a template is a third of the card spent on nothing. Both were true of most
 * cards until 2026-09-23.
 */
type Walked = { text: string[]; fontSizes: number[]; barSegments: number };

const walk = (node: ReactNode, into: Walked = { text: [], fontSizes: [], barSegments: 0 }): Walked => {
  if (typeof node === "string" || typeof node === "number") {
    into.text.push(String(node));
    return into;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, into));
    return into;
  }
  if (!isValidElement<{ children?: ReactNode; style?: { fontSize?: number; flexGrow?: number } }>(node)) return into;
  const render = node.type;
  if (typeof render === "function") {
    // A card's own components (the mix bar) are plain functions of their props.
    const rendered: ReactNode = Reflect.apply(render, undefined, [node.props]);
    return walk(rendered, into);
  }
  const size = node.props.style?.fontSize;
  if (typeof size === "number" && node.props.children !== undefined) into.fontSizes.push(size);
  if (typeof node.props.style?.flexGrow === "number") into.barSegments += 1;
  return walk(node.props.children, into);
};

const card = async (query: string): Promise<Walked> => walk(await renderOgElement(new URLSearchParams(query)));
const cardFor = async (imageUrl: string) => card(new URL(imageUrl).search);

/* The first `og:image` a page's metadata names, narrowed rather than cast. */
const firstImageUrl = (metadata: { openGraph?: unknown }): string | undefined => {
  const openGraph = metadata.openGraph;
  if (!openGraph || typeof openGraph !== "object" || !("images" in openGraph)) return undefined;
  const images: unknown = openGraph.images;
  const first: unknown = Array.isArray(images) ? images[0] : images;
  if (typeof first === "string") return first;
  if (first instanceof URL) return first.toString();
  if (first && typeof first === "object" && "url" in first) return String(first.url);
  return undefined;
};

const ogImageOf = async (metadata: Promise<{ openGraph?: unknown }>) => {
  const url = firstImageUrl(await metadata);
  assert.ok(url, "the page names a card");
  return url;
};

describe("the weekly card", () => {
  it("draws nothing a feed would shrink past reading", async () => {
    const { fontSizes } = await card("template=report");
    assert.ok(fontSizes.length > 0);
    assert.ok(Math.min(...fontSizes) >= 20, `smallest type is ${Math.min(...fontSizes)}px`);
  });

  it("carries the call and what would change it, not the chips that repeated it", async () => {
    const text = (await card("template=report")).text.join(" ");
    assert.match(text, /Conditions change if/);
    assert.match(text, /What changed/);
    assert.doesNotMatch(text, /For operators this week|Short-term borrowing rate|Recession warning gauge|Trust/);
  });

  /* The canvas is fixed and satori cannot measure, so a block that wraps further
     than planned draws over the one below it. On 2026-09-29 a 69-character call
     was set at 62px, took three lines, and overlapped the sentence under it. */
  it("sets a headline at a size it fits in, and shortens nothing that already fits", () => {
    const week = {
      headline: "Conditions are tightening. Freeze new commitments and protect runway.",
      whyItMatters: "Approve only renewals, work already promised to customers, and hires that bring in revenue.",
      changeSummary: "Conditions tightened. Slow new commitments and focus on what's already in motion.",
      flipCondition: "Funding pressure at or below 66 for two readings in a row",
    };
    const layout = layoutReportCard(week);
    assert.ok(layout.headlineSize < 62, `the overlapping week is set at ${layout.headlineSize}px`);
    assert.equal(layout.whyItMatters, week.whyItMatters);
    assert.equal(layout.changeSummary, week.changeSummary);
    assert.equal(layout.flipCondition, week.flipCondition);

    const short = layoutReportCard({ ...week, headline: "Hold steady. Keep the plan." });
    assert.equal(short.headlineSize, 62, "a short call keeps the largest size");
  });

  it("fits the longest text the preview allows, cutting at a word with an ellipsis", () => {
    const words = (length: number) => "Funding pressure rose again as credit spreads widened ".repeat(4).slice(0, length).trim();
    const layout = layoutReportCard({
      headline: words(96),
      whyItMatters: words(140),
      changeSummary: words(140),
      flipCondition: words(130),
    });
    assert.ok(layout.boxValueSize >= 20, "the boxes stay above the feed's reading floor");
    for (const text of [layout.whyItMatters, layout.changeSummary, layout.flipCondition]) {
      if (text.endsWith("\u2026")) assert.doesNotMatch(text, /\s\u2026$/, "an ellipsis sits on the last word, not after a space");
    }
  });
});

describe("archive cards", () => {
  it("carry the period's own record", async () => {
    const text = (await cardFor(await ogImageOf(periodMetadata({ params: Promise.resolve({ period: "2022" }) })))).text.join(" ");
    assert.match(text, /52 weekly readings/);
    assert.match(text, /22 Stormy · 22 Freezing · 8 Sunny/);
    assert.match(text, /Conditions changed 2 times/);
    assert.doesNotMatch(text, /A closed period/);
  });

  /* The fixture was /history/2010, a page with no readings behind it. The ten
     2010–2011 periods predated the record and left the index, so the fixed
     panel is reached only by a card that carries no panel of its own. */
  it("keep the fixed panel for a card with no record of its own", async () => {
    const text = (await card("template=record&eyebrow=History&title=T")).text.join(" ");
    assert.match(text, /A closed period/);
  });
});

describe("a page's own panel", () => {
  it("takes all three parts or none", async () => {
    const partial = (await card("template=signals&title=T&panelLabel=This+week&panelTitle=85+of+100")).text.join(" ");
    assert.match(partial, /What moved/, "half a panel falls back to the fixed copy");
    const whole = (await card("template=signals&title=T&panelLabel=This+week&panelTitle=85+of+100&panelBody=15+points+above")).text.join(" ");
    assert.match(whole, /85 of 100/);
    assert.doesNotMatch(whole, /What moved/);
  });

  it("drops a mix entry it cannot read rather than drawing it", async () => {
    const walked = await card("template=record&title=T&panelLabel=R&panelTitle=X&panelBody=Y&mix=EXPANSION:3,BOGUS:2,SCARCITY:-1,VOLATILE:1");
    assert.equal(walked.barSegments, 2, "EXPANSION and VOLATILE only");
    assert.equal((await card("template=record&title=T&mix=BOGUS:2")).barSegments, 0);
  });
});

describe("signal scenario cards", () => {
  const base = {
    cluster: "capital-tightness-watch",
    decisionScenario: "hiring",
    signalTitle: "Funding pressure watch",
    signalSummary: "How hard money is to raise this week.",
    scenarioTitle: "Hiring",
  };
  const imageQuery = (metadata: { openGraph?: unknown }) => new URL(firstImageUrl(metadata) ?? "https://invalid/").searchParams;

  it("carry this week's action only from a publishable payload", () => {
    const live = imageQuery(
      buildSignalDecisionScenarioMetadata({
        ...base,
        payload: { currentCall: "Freeze new commitments.", immediateAction: "Limit hiring to backfills.", degraded: false, noindex: false, noindexReasons: [] },
      }),
    );
    assert.equal(live.get("panelTitle"), "Limit hiring to backfills.");

    const stale = imageQuery(
      buildSignalDecisionScenarioMetadata({
        ...base,
        payload: { currentCall: "Freeze new commitments.", immediateAction: "Limit hiring to backfills.", degraded: true, noindex: true, noindexReasons: ["stale-data"] },
      }),
    );
    assert.equal(stale.get("panelTitle"), null, "a card platforms cache never advertises a stale call");
  });
});
