import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { RecentPostureHistoryCard } from "../app/components/hero/RecentPostureHistoryCard";
import { DecisionHero } from "../app/components/DecisionHero";
import { REGIME_HEX_COLORS } from "../lib/regimePhaseSpace";
import { regimeDataAttribute } from "../lib/regimeAccent";

const mockAny: any = mock;

/* DecisionHero's descendants read the app router; see decisionHeroSignalBreakdown. */
mockAny.module("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

const readRepoFile = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/*
 * Standards §XVI. The four regimes are four colours, drawn from one table
 * wherever they are drawn, and a surface that states a regime takes its colour
 * from the same value as its copy. Until 2026-09-15 the hero was fixed teal
 * under every call, the posture stripe folded Freezing and Stormy into one rose
 * and labelled it "Stormy", and the page atmosphere was keyed to a different
 * regime than the hero it framed.
 */
describe("regime colour contract", () => {
  it("draws the posture stripe in the canonical regime hues and lists only what it shows", () => {
    const html = renderToStaticMarkup(
      <RecentPostureHistoryCard
        history={[
          { record_date: "2026-05-31", regime: "SCARCITY" },
          { record_date: "2026-06-30", regime: "VOLATILE" },
          { record_date: "2026-07-31", regime: "EXPANSION" },
        ]}
      />,
    );

    for (const regime of ["SCARCITY", "VOLATILE", "EXPANSION"] as const) {
      assert.ok(html.includes(REGIME_HEX_COLORS[regime]), `${regime} months are drawn in the plane's hue`);
    }
    assert.ok(!html.includes(REGIME_HEX_COLORS.DEFENSIVE), "a regime with no months is not drawn");
    for (const label of ["Freezing", "Stormy", "Sunny"]) {
      assert.ok(html.includes(`>${label}<`), `legend names ${label}`);
    }
    assert.ok(!html.includes(">Cloudy<"), "legend omits a regime with no months");
    assert.ok(!/bg-teal-4\d\d/.test(html), "Sunny months are emerald as on the plane, not the brand teal");
  });

  it("stamps the hero with the regime its copy states", () => {
    const html = renderToStaticMarkup(
      <DecisionHero
        tightness={77}
        tightnessDelta={14}
        boldnessScore={36}
        boldnessDelta={-14}
        regime="SCARCITY"
        postureLabel="Freezing"
        signalDirection="tighten"
        recordDate="2026-09-11"
        fetchedAt="2026-09-15"
      />,
    );

    assert.match(html, /data-regime="SCARCITY"/, "the card names its regime for the token layer");
    assert.ok(html.includes("var(--regime-ink)"), "the stamp prints in the regime ink, not a fixed hue");
    assert.ok(!/text-teal-3\d\d|bg-teal-5\d\d/.test(html), "no brand-teal stamp under a non-Sunny call");
  });

  it("resolves the data attribute only for a known regime", () => {
    assert.equal(regimeDataAttribute("scarcity"), "SCARCITY");
    assert.equal(regimeDataAttribute("EXPANSION"), "EXPANSION");
    assert.equal(regimeDataAttribute("Sunny"), undefined);
    assert.equal(regimeDataAttribute(undefined), undefined);
  });

  it("defines accent and ink per regime in the token layer, with a light ink for each", () => {
    const tokens = readRepoFile("app/styles/tokens.css");
    for (const regime of Object.keys(REGIME_HEX_COLORS)) {
      const rule = new RegExp(`\\[data-regime="${regime}"\\]\\s*\\{[^}]*--regime-accent:\\s*${REGIME_HEX_COLORS[regime as keyof typeof REGIME_HEX_COLORS]}[^}]*--regime-ink:\\s*var\\(--color-`);
      assert.match(tokens, rule, `${regime} maps to its plane hue and a themed ink token`);
    }
  });

  it("keys the home page's atmosphere to the week the hero states", () => {
    const page = readRepoFile("app/page.tsx");
    const shellOpen = page.indexOf("<Shell regime={regime}>");
    assert.ok(shellOpen !== -1, "PageContent mounts the Shell with the hero's regime");
    assert.ok(!page.includes("regimeHistory.at(-1)?.regime"), "the shell no longer takes the last month-end's regime");
  });

  it("hands every report shell the regime its intro line states", () => {
    // `regimeAccentStyle` existed for the section eyebrows and rules to read the
    // week, and no report page ever passed a regime, so every shell rendered
    // slate under a call the intro line named. /history/compare is the one
    // exception by design: it shows two weeks, and keying it to either would
    // mislead.
    const callers = [
      "app/signals/page.tsx",
      "app/resolve/page.tsx",
      "app/operate/planningPageModel.ts",
      "app/operate/[workstream]/page.tsx",
      "app/trust/trustPageModel.ts",
      "app/history/page.tsx",
    ];
    for (const path of callers) {
      const source = readRepoFile(path);
      assert.match(source, /regime[:=]\s*\{?\s*(\w+\??\.)*(assessment\.regime|currentRegime)/, `${path} passes the week's regime into its shell`);
    }
  });

  it("keeps the img/svg reset in the base layer so max-w-* on a chart is honoured", () => {
    const typography = readRepoFile("app/styles/typography.css");
    assert.match(typography, /@layer base \{\s*img,\s*svg \{/, "an unlayered reset outranks every utility");
  });
});
