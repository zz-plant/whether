import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandCenterNavBlock } from "../app/components/report-shell/CommandCenterNavBlock";
import { SecondaryPageHeader } from "../app/components/secondaryPageShell";
import { frameFactsAttributes, readFrameFacts, runningHeadSection } from "../lib/navigation/runningHead";

/*
 * The running head prints, at the top of every frame after a page's intro, the site,
 * the conditions, the date and the section on screen. A frame audit of eleven routes on
 * 2026-10-27 found 7 of 83 frames past the first screen naming all three: the header
 * hides on scroll, so a phone screenshot of the middle of a page had no source and no
 * week. These hold the hand-over (a page marks its intro, the head reads the mark) and
 * the section choice; the frames themselves are `bun run ui:frames`.
 */

/** The browser's dataset for a set of `data-*` attributes, as the head reads it. */
const datasetOf = (attributes: Record<string, string>): DOMStringMap => {
  const dataset: DOMStringMap = {};
  for (const [name, value] of Object.entries(attributes)) {
    const key = name.replace(/^data-/, "").replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    dataset[key] = value;
  }
  return dataset;
};

const attributesIn = (html: string) => {
  const tag = html.slice(html.indexOf("<", html.indexOf("data-frame-facts") - 400), html.indexOf(">", html.indexOf("data-frame-facts")));
  return Object.fromEntries([...tag.matchAll(/(data-frame-[a-z-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
};

const intro = (overrides: Partial<Parameters<typeof CommandCenterNavBlock>[0]> = {}) =>
  renderToStaticMarkup(
    <CommandCenterNavBlock
      pageTitle="Why the weekly brief changed"
      recordDateLabel="Oct 23, 2026"
      statusLabel="Cloudy"
      trustStatusLabel="All sources live"
      fetchedAtLabel=""
      showOfflineBadge={false}
      offlineBadgeLabel=""
      regime="DEFENSIVE"
      {...overrides}
    />,
  );

describe("running head facts", () => {
  it("reads back exactly what a page wrote, leaving out what it did not", () => {
    const written = frameFactsAttributes({
      regime: "SCARCITY",
      condition: "Freezing",
      date: "Week of Oct 19, 2026",
      title: "This week",
      tension: "3 pts from Cloudy",
      tensionNear: true,
      call: "Freeze new commitments.",
      jump: { href: "#what-it-changes", label: "By area" },
    });
    assert.deepEqual(readFrameFacts({ dataset: datasetOf(written) }, "ignored"), {
      regime: "SCARCITY",
      condition: "Freezing",
      date: "Week of Oct 19, 2026",
      title: "This week",
      tension: "3 pts from Cloudy",
      tensionNear: true,
      call: "Freeze new commitments.",
      jump: { href: "#what-it-changes", label: "By area" },
    });
    assert.equal(
      readFrameFacts({ dataset: datasetOf(frameFactsAttributes({ tensionNear: true })) }, null).tensionNear,
      false,
      "nearness without a tension to colour is nothing",
    );
    assert.deepEqual(frameFactsAttributes({ regime: "NEUTRAL", title: "About" }), {
      "data-frame-facts": "",
      "data-frame-title": "About",
    }, "a regime the tokens do not colour is left off");
  });

  it("names a page that marks nothing by its own h1, so every frame still names the site and the page", () => {
    assert.deepEqual(readFrameFacts(null, " Product writing "), {
      regime: null,
      condition: null,
      date: null,
      title: "Product writing",
      tension: null,
      tensionNear: false,
      call: null,
      jump: null,
    });
  });

  it("marks a report intro with the nearest change, by what it changes to, when its strip has a margin", () => {
    const facts = attributesIn(
      intro({
        trustStrip: {
          recordDateLabel: "Oct 23, 2026",
          sourcesLive: true,
          sourcesLabel: "All sources live",
          confidenceLabel: "LOW",
          margin: { signal: "riskAppetite", points: 2 },
          couldChangeNextWeek: true,
          basis: { key: "record", value: "The record's inputs", warning: null },
        },
      }),
    );
    assert.equal(facts["data-frame-tension"], "2 pts from Freezing");
    assert.equal(facts["data-frame-tension-near"], "");
  });

  it("marks a report intro with its conditions, date and title", () => {
    assert.deepEqual(attributesIn(intro()), {
      "data-frame-facts": "",
      "data-frame-regime": "DEFENSIVE",
      "data-frame-condition": "Cloudy",
      "data-frame-date": "Data as of Oct 23, 2026",
      "data-frame-title": "Why the weekly brief changed",
    });
  });

  it("keeps /history's qualifier on the date and its neutral ink, so a frame of the record is not read as this week's call", () => {
    const facts = attributesIn(intro({ regime: undefined, statusPrefix: "Last completed month", recordDateLabel: "Sep 30, 2026" }));
    assert.equal(facts["data-frame-condition"], "Cloudy");
    assert.equal(facts["data-frame-date"], "Last completed month: Sep 30, 2026");
    assert.equal(facts["data-frame-regime"], undefined);
    assert.equal(attributesIn(intro({ regime: undefined, statusLabel: "Historical" }))["data-frame-condition"], undefined);
  });

  it("marks a reading page's header with its title", () => {
    assert.deepEqual(attributesIn(renderToStaticMarkup(<SecondaryPageHeader title="Calibration" />)), {
      "data-frame-facts": "",
      "data-frame-title": "Calibration",
    });
  });
});

describe("the section a frame is in", () => {
  const headings = [
    { label: "What changed", top: -400 },
    { label: "What would change this guidance", top: 30 },
    { label: "Deeper evidence", top: 500 },
  ];

  it("is the last heading that has reached the line under the head", () => {
    assert.equal(runningHeadSection(headings, 80), "What would change this guidance");
    assert.equal(runningHeadSection(headings, 20), "What changed");
  });

  it("is none above the first heading, where the page's title stands in", () => {
    assert.equal(runningHeadSection(headings, -500), null);
    assert.equal(runningHeadSection([], 80), null);
  });
});
