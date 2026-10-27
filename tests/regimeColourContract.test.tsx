import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";
import { Sparkline } from "../app/components/ui/sparkline";
import { REGIME_HEX_COLORS } from "../lib/regimePhaseSpace";
import { regimeDataAttribute } from "../lib/regimeAccent";
import { OG_CONDITION_INK } from "../lib/image/ogTheme";
import type { RegimeKey } from "../lib/types";
import * as nextNavigation from "next/navigation";

const mockAny: any = mock;

/* DecisionHero's descendants read the app router; see decisionHeroSignalBreakdown. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
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
  it("draws the months behind the score line in the canonical regime hues, each named on hover", () => {
    // The posture stripe used to be a card of its own at the foot of `/`; the
    // same 24 months are the ground of the hero's sparkline now, so the colour
    // contract moves with them. `/` builds these points from `REGIME_HEX_COLORS`
    // via `regimeDataAttribute`, the same table the plane on /history reads.
    const html = renderToStaticMarkup(
      <Sparkline
        label="Operating latitude"
        points={[
          { label: "May 2026", value: 40, ground: REGIME_HEX_COLORS.SCARCITY, groundLabel: "Freezing" },
          { label: "Jun 2026", value: 44, ground: REGIME_HEX_COLORS.VOLATILE, groundLabel: "Stormy" },
          { label: "Jul 2026", value: 52, ground: REGIME_HEX_COLORS.EXPANSION, groundLabel: "Sunny" },
        ]}
      />,
    );

    for (const regime of ["SCARCITY", "VOLATILE", "EXPANSION"] as const) {
      assert.ok(html.includes(`fill="${REGIME_HEX_COLORS[regime]}"`), `${regime} months are drawn in the plane's hue`);
    }
    assert.ok(!html.includes(REGIME_HEX_COLORS.DEFENSIVE), "a regime with no months is not drawn");
    for (const title of ["May 2026: Freezing", "Jun 2026: Stormy", "Jul 2026: Sunny"]) {
      assert.ok(html.includes(`<title>${title}</title>`), `each month names its regime: ${title}`);
    }
    assert.match(html, /aria-label="[^"]*Shaded by regime; Sunny at Jul 2026/, "the latest regime reaches the accessible label");
    assert.ok(!/teal/.test(html), "Sunny months are emerald as on the plane, not the brand teal");
  });

  it("stamps the hero with the regime its copy states", () => {
    const html = renderToStaticMarkup(
      <DecisionHero regime="SCARCITY" weeklyCall="Freeze new commitments." />,
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
    for (const [regime, hex] of Object.entries(REGIME_HEX_COLORS)) {
      const rule = new RegExp(`\\[data-regime="${regime}"\\]\\s*\\{[^}]*--regime-accent:\\s*${hex}[^}]*--regime-ink:\\s*var\\(--color-`);
      assert.match(tokens, rule, `${regime} maps to its plane hue and a themed ink token`);
    }
  });

  it("holds the condition utilities and the artifact inks to the same values as the map", () => {
    // Synoptic (2026-10-09). One fill per condition in three places: the
    // table every canvas and artifact reads, the data-regime map, and the
    // `bg-condition-*` utilities that name a condition without the attribute.
    // The artifacts that cannot read CSS (OG cards, slide, deck, email) print
    // the condition word in the dark theme's ink, so that copy is pinned too.
    const tokens = readRepoFile("app/styles/tokens.css");
    const names: ReadonlyArray<[RegimeKey, string]> = [
      ["EXPANSION", "sunny"],
      ["DEFENSIVE", "cloudy"],
      ["VOLATILE", "stormy"],
      ["SCARCITY", "freezing"],
    ];
    for (const [regime, name] of names) {
      assert.match(tokens, new RegExp(`--color-condition-${name}:\\s*${REGIME_HEX_COLORS[regime]};`), `${regime}'s utility fill is its plane hue`);
      assert.match(tokens, new RegExp(`--color-condition-${name}-ink:\\s*${OG_CONDITION_INK[regime]};`), `${regime}'s artifact ink is the dark theme's ink`);
    }
  });

  it("gives the line states tokens of their own, apart from the conditions", () => {
    // A cleared line printed in Sunny's ink and a crossed one in Cloudy's until
    // 2026-10-09; on Synoptic's light theme those two are one brown. The badge
    // reads the line-state utilities, and the map reads the condition inks.
    const icons = readRepoFile("app/components/ui/conceptIcons.tsx");
    const inks = icons.slice(icons.indexOf("const LINE_STATE_INK"), icons.indexOf("/** The state's glyph alone"));
    assert.match(inks, /crossed: "text-line-crossed-fg"/);
    assert.match(inks, /clear: "text-line-clear-fg"/);
    assert.doesNotMatch(inks, /condition|semantic-(easing|caution)/, "a line state borrows no condition's ink");
    const tokens = readRepoFile("app/styles/tokens.css");
    assert.doesNotMatch(tokens, /\[data-regime="[A-Z]+"\][^}]*--regime-ink:\s*var\(--color-semantic-/, "no condition reads a line-state family");
  });

  it("keeps a fixed action hue off the regime hues", () => {
    // Until 2026-09-16 Stormy was sky-500, the controls' fixed hue, so under
    // that call the regime and the controls were one colour by accident. The
    // controls now take the week's own ink on purpose (the next test); with no
    // regime they fall back to :root's accent, which must still be no
    // condition's fill. The check reads the token rather than pinning a hex.
    const tokens = readRepoFile("app/styles/tokens.css");
    const accent = tokens.match(/--accent-action:\s*(#[0-9a-f]{6})/i)?.[1]?.toLowerCase();
    assert.ok(accent, "tokens.css declares --accent-action as a hex");
    const skyHue = /^#(38bdf8|0ea5e9|7dd3fc|0284c7|0369a1)$/i;
    for (const [regime, hex] of Object.entries(REGIME_HEX_COLORS)) {
      assert.notEqual(hex.toLowerCase(), accent, `${regime} is not drawn in the action accent`);
      assert.doesNotMatch(hex, skyHue, `${regime} is not on the sky ramp the controls use`);
    }
  });

  it("draws the action colour in the week's ink under a regime shell", () => {
    // 2026-10-14: the page read as monochrome with links, buttons and focus in
    // the text ink. Under [data-regime] the action colour is --regime-ink, and
    // the tokens derived from it are declared again there, since a custom
    // property resolves where it is declared and would otherwise keep :root's.
    const tokens = readRepoFile("app/styles/tokens.css");
    const scoped = tokens.match(/\n\[data-regime\]\s*\{([^}]*)\}/)?.[1] ?? "";
    assert.match(scoped, /--accent-action:\s*var\(--regime-ink\)/, "the action colour is the week's ink");
    for (const derived of ["--accent-border", "--accent-border-soft", "--focus-halo", "--cta-fill"]) {
      assert.match(scoped, new RegExp(`${derived}:`), `${derived} re-resolves under the regime`);
    }
    assert.match(tokens, /:root,\s*\[data-regime\]\s*\{[^}]*--color-sky-400:\s*var\(--accent-action\)/, "the sky aliases follow the scoped action colour");
  });

  it("keeps the crossed red for lines, and gives caveats their own role", () => {
    // A cached source, a scoring note and an archived week printed in the
    // crossed red until 2026-10-14, so a caveat read as a stop.
    for (const path of ["app/components/trustStrip.tsx", "app/components/historicalBanner.tsx", "app/trust/sourceBoard.tsx"]) {
      const source = readRepoFile(path);
      assert.doesNotMatch(source, /semantic-caution|line-crossed/, `${path} prints no caveat in the crossed red`);
      assert.match(source, /caveat-/, `${path} uses the caveat role`);
    }
    // And its own shape: the hollow ring already means "where a reading was" on
    // the score ladder, so a caveat is the diamond, not a ring (2026-10-14).
    for (const path of ["app/components/trustStrip.tsx", "app/components/historicalBanner.tsx", "app/components/CadenceCallCard.tsx", "app/signals/components/signalReadingPanel.tsx"]) {
      assert.match(readRepoFile(path), /weather-caveat-mark/, `${path} marks its caveat with the diamond`);
    }
    assert.match(readRepoFile("app/styles/feedback.css"), /\.weather-caveat-mark::before\s*\{[^}]*rotate\(45deg\)/, "the caveat mark is a diamond");
  });

  it("paints one atmosphere from the token on both shells", () => {
    // The brief's container and the report backdrop each carried their own
    // regime → tint table; the report one had Sunny in teal. Both now read
    // `--regime-atmosphere`, resolved in the data-regime map beside the accent.
    const tokens = readRepoFile("app/styles/tokens.css");
    for (const regime of Object.keys(REGIME_HEX_COLORS)) {
      const rule = new RegExp(`\\[data-regime="${regime}"\\]\\s*\\{[^}]*--regime-atmosphere:\\s*var\\(--atmosphere-`);
      assert.match(tokens, rule, `${regime} resolves its atmosphere in the token layer`);
    }
    for (const path of ["app/components/Shell.tsx", "app/components/climateBackdrop.tsx"]) {
      assert.match(readRepoFile(path), /weather-regime-ground/, `${path} paints the shared wash`);
      assert.doesNotMatch(readRepoFile(path), /rgba\(|--atmosphere-/, `${path} carries no tint of its own`);
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
    // slate under a call the intro line named.
    //
    // Two pages are exceptions, for one reason: the accent is the page's
    // weather, and a page about several weeks has none to state.
    // /history/compare shows two, and keying it to either would mislead.
    // /history shows 176 months and counts all four regimes in a panel of its
    // own; keyed to the newest of them it rendered its whole chrome Sunny on a
    // week the brief was calling Freezing, so a reader one click from `/` saw
    // the site change its mind. Its intro line still names the archive's own
    // regime — that line describes the numbers on the page, which the accent
    // does not.
    const callers = [
      "app/signals/page.tsx",
      "app/operate/planningPageModel.ts",
      "app/operate/[workstream]/page.tsx",
      "app/trust/trustPageModel.ts",
    ];
    for (const path of callers) {
      const source = readRepoFile(path);
      assert.match(source, /regime[:=]\s*\{?\s*(\w+\??\.)*(assessment\.regime|currentRegime)/, `${path} passes the week's regime into its shell`);
    }

    for (const path of ["app/history/page.tsx", "app/history/compare/page.tsx"]) {
      const source = readRepoFile(path);
      assert.doesNotMatch(
        source,
        /regime:\s*(\w+\??\.)*(assessment\.regime|currentRegime)/,
        `${path} covers several weeks, so the chrome must not claim a single regime`,
      );
    }
  });

  it("keeps the img/svg reset in the base layer so max-w-* on a chart is honoured", () => {
    const typography = readRepoFile("app/styles/typography.css");
    assert.match(typography, /@layer base \{\s*img,\s*svg \{/, "an unlayered reset outranks every utility");
  });
});
