import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import {
  CircleDashed,
  Cloud,
  CloudLightning,
  Landmark,
  Pause,
  Play,
  Route,
  Snowflake,
  Sprout,
  Sun,
  Users,
  Wallet,
} from "lucide-react";

import { REGIME_ICONS, REGIME_LABELS, REGIME_ORDER, isRegimeKey } from "../lib/regimePresentation";
import { regimeKeyFromLabel } from "../lib/regimeLabels";
import {
  DECISION_AREA_ICONS,
  areasGovernedBy,
  decisionAreaLabel,
  decisionAreaOrder,
  type DecisionArea,
} from "../lib/report/boundedDecisionRules";
import { LINE_STATE_ICONS, resolveLineState, type LineState } from "../lib/report/operatingCalls";
import { REGIME_CONFIDENCE_NEAR_THRESHOLD } from "../lib/regimeEngineCore";
import { AreaLabel, ConditionLabel, LineStateBadge } from "../app/components/ui/conceptIcons";
import { GovernedAreas } from "../app/components/ui/governedAreas";
import { AreaTable } from "../app/components/ui/areaTable";
import { ScoreLadder } from "../app/components/ui/scoreLadder";
import { Tag } from "../app/components/ui/tag";
import { MonthStrip } from "../app/components/history/monthStrip";
import { DecisionHero } from "../app/components/DecisionHero";
import { RegimeRadar } from "../app/components/home/RegimeRadar";
import { DecisionPicker } from "../app/components/home/DecisionPicker";
import { buildCallCitation, buildSlackBrief } from "../lib/export/briefBuilders";
import { buildPublishedBriefEmailUpdate, buildPublishedBriefSlackUpdate, latestPublishedBrief } from "../lib/report/publishedBriefs";
import { fixtureBriefDocument } from "./factories/exportFixtures";
import { GET as getFeed } from "../app/feed.xml/route";
import { GET as getLlms } from "../app/llms.txt/route";
import { GET as getLlmsFull } from "../app/llms-full.txt/route";
import { buildBriefMarkdown } from "../app/brief.md/route";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { buildReportDataFixture } from "./fixtures/reportFixtures";

const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * The icon system (2026-10-09): the four conditions, the five areas and where an
 * area stands against its pause line each carry one glyph, from one mapping,
 * drawn by one component (app/components/ui/conceptIcons.tsx). A glyph sits
 * beside its words, never in place of them, and is hidden from assistive tech;
 * the artifacts that leave the site as text carry none.
 */

describe("one mapping per concept", () => {
  it("draws each condition as the weather its word names", () => {
    assert.deepEqual(
      Object.fromEntries(REGIME_ORDER.map((regime) => [REGIME_LABELS[regime], REGIME_ICONS[regime]])),
      { Freezing: Snowflake, Cloudy: Cloud, Stormy: CloudLightning, Sunny: Sun },
    );
  });

  it("gives each of the five areas its own glyph", () => {
    assert.deepEqual(
      Object.fromEntries(decisionAreaOrder.map((area) => [decisionAreaLabel(area), DECISION_AREA_ICONS[area]])),
      { Hiring: Users, Roadmap: Route, Fundraising: Landmark, Spending: Wallet, "New bets": Sprout },
    );
  });

  it("draws a crossed pause line as pause, a close one as a dashed circle, and a clear one as play", () => {
    const states: LineState[] = ["crossed", "near", "clear"];
    assert.deepEqual(Object.fromEntries(states.map((state) => [state, LINE_STATE_ICONS[state]])), {
      crossed: Pause,
      near: CircleDashed,
      clear: Play,
    });
  });

  it("never lets one glyph mean two things", () => {
    const glyphs = [...Object.values(REGIME_ICONS), ...Object.values(DECISION_AREA_ICONS), ...Object.values(LINE_STATE_ICONS)];
    assert.equal(new Set(glyphs).size, glyphs.length);
  });

  it("reads a label back to its condition, archived operator labels included", () => {
    for (const regime of REGIME_ORDER) assert.equal(regimeKeyFromLabel(REGIME_LABELS[regime]), regime);
    assert.equal(regimeKeyFromLabel("Expand"), "EXPANSION");
    assert.equal(regimeKeyFromLabel("Defend"), "SCARCITY");
    assert.equal(regimeKeyFromLabel("Mostly Sunny"), undefined);
  });

  it("names the areas each score governs from the table the area rows read", () => {
    assert.deepEqual(areasGovernedBy("tightness"), ["hiring", "capital-raising", "burn-discipline"]);
    assert.deepEqual(areasGovernedBy("riskAppetite"), ["product-tempo", "capital-raising", "expansion-bets"]);
  });
});

describe("where a line stands", () => {
  it("calls a pause line close within the 5 points the margin already calls close", () => {
    assert.equal(REGIME_CONFIDENCE_NEAR_THRESHOLD, 5, "the margin's 'Close to the line' band");
    assert.equal(resolveLineState(14, "pause", true), "crossed");
    assert.equal(resolveLineState(0, "pause", false), "near", "a strict line at zero distance is close, not crossed");
    assert.equal(resolveLineState(5, "pause", false), "near");
    assert.equal(resolveLineState(5.5, "pause", false), "clear");
    assert.equal(resolveLineState(20, "pause", false), "clear");
    assert.equal(resolveLineState(undefined, "pause", false), undefined);
  });

  it("gives a resume line a state only once it is met", () => {
    assert.equal(resolveLineState(0, "resume", true), "clear");
    assert.equal(resolveLineState(3, "resume", false), undefined);
  });
});

/* Every concept glyph in `html`, with the text that follows it up to the next glyph. */
const glyphsWithText = (html: string) =>
  [...html.matchAll(/<svg([^>]*data-concept-icon="([a-z-]+)"[^>]*)>[\s\S]*?<\/svg>([\s\S]*?)(?=<svg|$)/g)].map((match) => ({
    attributes: match[1],
    concept: match[2],
    following: match[3].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(),
  }));

const areaByGlyphClass = Object.fromEntries(
  decisionAreaOrder.map((area) => [
    DECISION_AREA_ICONS[area].displayName?.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase() ?? "",
    area,
  ]),
);

/**
 * The rules every drawn glyph keeps: hidden from assistive tech, and beside its
 * words — a condition beside its weather word, an area beside its name, a state
 * beside the words for it. Glyphs drawn inside a chart's own SVG (`x=`) and the
 * run marks on /history's band are judged by the tests of those drawings.
 */
const assertGlyphsBesideTheirWords = (html: string, surface: string) => {
  const glyphs = glyphsWithText(html).filter(
    ({ attributes }) => !/\bx="/.test(attributes) && !attributes.includes("data-strip-run-glyph"),
  );
  for (const { attributes, concept, following } of glyphs) {
    assert.match(attributes, /aria-hidden="true"/, `${surface}: a ${concept} glyph is announced`);
    assert.match(following, /\w/, `${surface}: a ${concept} glyph stands without words`);
    if (concept === "condition") {
      const regime = /data-regime="([A-Z]+)"/.exec(attributes)?.[1] ?? "";
      assert.ok(isRegimeKey(regime), `${surface}: a condition glyph names no regime`);
      const label = REGIME_LABELS[regime].toLowerCase();
      const words = following.toLowerCase();
      /* The word itself, or the period stamp's "Mostly Freezing". */
      assert.ok(words.startsWith(label) || words.startsWith(`mostly ${label}`), `${surface}: ${regime} glyph beside "${following.slice(0, 40)}"`);
    }
    if (concept === "area") {
      const glyphClass = /lucide lucide-([a-z-]+)/.exec(attributes)?.[1] ?? "";
      const area: DecisionArea | undefined = areaByGlyphClass[glyphClass];
      assert.ok(area, `${surface}: unknown area glyph ${glyphClass}`);
      assert.ok(following.startsWith(decisionAreaLabel(area)), `${surface}: ${area} glyph beside "${following.slice(0, 40)}"`);
    }
  }
  return glyphs;
};

describe("a glyph sits beside its words and is hidden from assistive tech", () => {
  it("in the shared components", () => {
    const html = renderToStaticMarkup(
      <>
        {REGIME_ORDER.map((regime) => (
          <ConditionLabel key={regime} regime={regime} />
        ))}
        {decisionAreaOrder.map((area) => (
          <AreaLabel key={area} area={area} />
        ))}
        <LineStateBadge state="crossed">Pause line crossed</LineStateBadge>
        <LineStateBadge state="near">4 pts from its pause line</LineStateBadge>
        <LineStateBadge state="clear" stamp>already met</LineStateBadge>
        <Tag regime="DEFENSIVE">Cloudy</Tag>
        <GovernedAreas metric="tightness" target="table" />
        <GovernedAreas metric="riskAppetite" target="brief" />
      </>,
    );
    const glyphs = assertGlyphsBesideTheirWords(html, "components");
    assert.equal(glyphs.length, 4 + 5 + 3 + 1 + 6);
    assert.match(html, /class="lucide [^"]*size-4"/, "16px inline");
  });

  it("on the hero's stamp, which no longer draws the abstract strokes", () => {
    const html = renderToStaticMarkup(<DecisionHero regime="SCARCITY" weeklyCall="Hold." />);
    const [stamp] = assertGlyphsBesideTheirWords(html, "hero");
    assert.equal(stamp?.concept, "condition");
    assert.match(html, /lucide-snowflake/);
    assert.doesNotMatch(html, /y1="26"/, "the RegimeGlyph horizon is gone");
    const unknown = renderToStaticMarkup(<DecisionHero regime="UNKNOWN" weeklyCall="Hold." />);
    assert.doesNotMatch(unknown, /data-concept-icon/, "an unknown regime prints its word without a borrowed glyph");
  });

  it("on the area cards, the area table, the signal bars' keys and /history's band", () => {
    const html = renderToStaticMarkup(
      <>
        <DecisionPicker
          options={decisionAreaOrder.map((area, index) => ({
            area,
            rule: "Rule",
            pause: { line: "Funding pressure > 76", distance: index === 1 ? "4 pts away" : "crossed", points: index === 1 ? 4 : 0, met: index !== 1, metric: "tightness" },
          }))}
          regime="SCARCITY"
          scores={{ tightness: 90, riskAppetite: 49 }}
        />
        <AreaTable
          caption="test"
          rows={[{ area: "hiring", rule: "Backfills only.", pause: { line: "Funding pressure > 76", distance: "crossed", state: "crossed" } }]}
        />
        <ScoreLadder
          label="Funding pressure"
          value={90}
          lines={[
            { kind: "resume", value: 66 },
            { kind: "callChange", value: 70 },
            { kind: "pause", value: 76 },
          ]}
        />
        <MonthStrip
          entries={[
            { recordDate: "2026-01-31", regime: "SCARCITY" },
            { recordDate: "2026-02-28", regime: "SCARCITY" },
            { recordDate: "2026-03-31", regime: "VOLATILE" },
            { recordDate: "2026-04-30", regime: "VOLATILE" },
          ]}
        />
      </>,
    );
    assertGlyphsBesideTheirWords(html, "brief and record");
    const key = html.slice(html.indexOf("data-ladder-key"));
    assert.match(key, /lucide-play[\s\S]*?<\/svg><span[^>]*>Resume<\/span>/, "play beside Resume");
    assert.match(key, /lucide-pause[\s\S]*?<\/svg><span[^>]*>Pause<\/span>/, "pause beside Pause");
    assert.match(key, /<span aria-hidden="true" class="inline-block h-2 w-0.5[^"]*"><\/span><span[^>]*>Change line<\/span>/, "the change line keeps its plain tick");
  });

  it("on the conditions chart, where each corner's word keeps its glyph", () => {
    const html = renderToStaticMarkup(
      <RegimeRadar tightness={90} riskAppetite={49} tightnessThreshold={70} riskAppetiteThreshold={50} currentRegime="SCARCITY" />,
    );
    for (const regime of REGIME_ORDER) {
      assert.match(html, new RegExp(`>${REGIME_LABELS[regime]}</text>`));
      assert.match(html, new RegExp(`data-regime="${regime}" data-concept-icon="condition"`));
    }
    assert.match(html, /<svg viewBox="0 0 200 184"[^>]*aria-hidden="true"/, "the chart's glyphs sit in a graphic hidden as a whole");
  });

  it("on the pages that render offline: Guides, a published week, a year, a quarter, an answer, the comparison", async () => {
    const { default: GuidesPage } = await import("../app/resources/page");
    const brief = await import("../app/brief/[week]/page");
    const period = await import("../app/history/[period]/page");
    const compare = await import("../app/history/compare/page");
    const history = await import("../app/history/page");
    const { DecisionAnswerPageContent } = await import("../app/answers/decisionAnswerPageContent");
    const [week] = brief.generateStaticParams();
    const pages = {
      "/resources": renderToStaticMarkup(await GuidesPage({})),
      [`/brief/${week.week}`]: renderToStaticMarkup(await brief.default({ params: Promise.resolve(week) })),
      "/history/2022": renderToStaticMarkup(await period.default({ params: Promise.resolve({ period: "2022" }) })),
      "/history/2022-q3": renderToStaticMarkup(await period.default({ params: Promise.resolve({ period: "2022-q3" }) })),
      "/history": renderToStaticMarkup(await history.default({ searchParams: Promise.resolve({}) })),
      "/history/compare": renderToStaticMarkup(await compare.default({ searchParams: Promise.resolve({}) })),
      "/answers/should-startups-hire-engineers-right-now": renderToStaticMarkup(
        await DecisionAnswerPageContent({
          slug: "should-startups-hire-engineers-right-now",
          route: "/answers/should-startups-hire-engineers-right-now",
        }),
      ),
    };
    for (const [path, html] of Object.entries(pages)) {
      const glyphs = assertGlyphsBesideTheirWords(html, path);
      assert.ok(glyphs.length > 0, `${path} draws no glyph`);
    }
    assert.doesNotMatch(pages["/resources"], /Governance Pillars|viewBox="0 0 48 48"/, "the Guides emblem is gone");
    assert.match(pages["/history"], /data-strip-run-glyph/, "the band's long runs carry their glyph");
  });
});

/*
 * Source-level on purpose: the claim is about where a glyph comes from, which a
 * render cannot tell apart — a page importing `Sun` itself draws the same
 * markup as one using `ConditionIcon`, until the day the mapping changes and
 * that page does not.
 */
describe("no page builds its own glyph for these concepts", () => {
  const CONCEPT_GLYPHS = new Set([
    "Sun",
    "Cloud",
    "CloudLightning",
    "Snowflake",
    "Zap",
    "Pause",
    "Play",
    "CircleDashed",
    "Users",
    "Route",
    "Landmark",
    "Wallet",
    "Sprout",
    "FlaskConical",
  ]);
  /* The three mappings, and the theme toggle's sun, which is a lamp, not the weather. */
  const ALLOWED: Record<string, readonly string[]> = {
    "lib/regimePresentation.ts": ["Sun", "Cloud", "CloudLightning", "Snowflake"],
    "lib/report/boundedDecisionRules.ts": ["Users", "Route", "Landmark", "Wallet", "Sprout"],
    "lib/report/operatingCalls.ts": ["Pause", "Play", "CircleDashed"],
    "app/components/uiIcons.tsx": ["Sun"],
  };
  const MAPPINGS = ["REGIME_ICONS", "DECISION_AREA_ICONS", "LINE_STATE_ICONS"];
  const DEFINED_IN: Record<string, string> = {
    REGIME_ICONS: "lib/regimePresentation.ts",
    DECISION_AREA_ICONS: "lib/report/boundedDecisionRules.ts",
    LINE_STATE_ICONS: "lib/report/operatingCalls.ts",
  };

  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
  const files = [...sourceFiles("app"), ...sourceFiles("lib")];
  /* Code only: a comment may name a mapping to say where a glyph comes from. */
  const code = (file: string) =>
    readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("imports a concept glyph only into its mapping", () => {
    const seen = new Set<string>();
    for (const file of files) {
      const source = code(file);
      for (const match of source.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']lucide-react["']/g)) {
        const names = match[1]
          .split(",")
          .map((entry) => entry.trim().split(/\s+as\s+/)[0]?.replace(/^type\s+/, ""))
          .filter((name): name is string => Boolean(name));
        for (const name of names.filter((candidate) => CONCEPT_GLYPHS.has(candidate))) {
          assert.ok(ALLOWED[file]?.includes(name), `${file} imports ${name} from lucide-react; draw it through conceptIcons`);
          seen.add(`${file}:${name}`);
        }
      }
    }
    /* The scan sees the imports it allows, so a pass is not a scan that read nothing. */
    for (const [file, names] of Object.entries(ALLOWED)) {
      for (const name of names) assert.ok(seen.has(`${file}:${name}`), `the scan missed ${name} in ${file}`);
    }
  });

  it("reads each mapping only through the shared components", () => {
    for (const file of files) {
      const source = code(file);
      for (const mapping of MAPPINGS) {
        if (!new RegExp(`\\b${mapping}\\b`).test(source)) continue;
        assert.ok(
          file === DEFINED_IN[mapping] || file === "app/components/ui/conceptIcons.tsx",
          `${file} reads ${mapping}; use ConditionIcon, AreaIcon or LineStateBadge`,
        );
      }
    }
  });
});

describe("text that leaves the site carries no glyph", () => {
  const MARKUP = /<svg|lucide|data-concept-icon|aria-hidden/;
  /* The emoji a paste could reach for in place of the glyphs. */
  const PICTOGRAPHS = /[☀☁⛅⛈❄⏸▶⏯\u{1F324}-\u{1F329}\u{1F331}\u{1F465}\u{1F45B}\u{1F3DB}]/u;

  const texts: Array<{ name: string; text: () => Promise<string> | string }> = [
    { name: "Slack brief", text: () => buildSlackBrief(fixtureBriefDocument()) },
    { name: "call citation", text: () => buildCallCitation(fixtureBriefDocument()) },
    { name: "published week (Slack)", text: () => (latestPublishedBrief ? buildPublishedBriefSlackUpdate(latestPublishedBrief) : "") },
    { name: "published week (email)", text: () => (latestPublishedBrief ? buildPublishedBriefEmailUpdate(latestPublishedBrief) : "") },
    { name: "RSS", text: async () => (await getFeed()).text() },
    { name: "llms.txt", text: async () => (await getLlms()).text() },
    { name: "llms-full.txt", text: async () => (await getLlmsFull()).text() },
    /* As tests/briefMarkdownRoute.test.ts builds it: the route's cache needs a server. */
    {
      name: "brief.md",
      text: async () =>
        buildBriefMarkdown(
          await assembleHomePage(
            { searchParams: undefined },
            { loadHomePageReportData: async () => ({ ok: true, data: buildReportDataFixture() }) },
          ),
        ),
    },
  ];

  for (const { name, text } of texts) {
    it(name, async () => {
      const body = await text();
      assert.ok(body.length > 0, `${name} rendered nothing`);
      assert.doesNotMatch(body, MARKUP, `${name} carries icon markup`);
      assert.doesNotMatch(body, PICTOGRAPHS, `${name} carries a weather or state emoji`);
    });
  }
});
