import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";
import { isLightField } from "../lib/report/recordBandCodec";
import type { RegimeKey } from "../lib/types";

/*
 * The Forecast visual world (2026-11-12; .impeccable/surfaces/app-page-tsx.md).
 *
 * The homepage's first screen sits on a sky tinted by the week's condition, full width,
 * with the two scores on a panel of paper; cards and buttons carry a layered depth. The
 * palette and the two voices are the token layer itself (tokens.css, fonts.css), held by
 * tests/regimeColourContract.test.tsx and tests/fontAssets.test.ts. These hold the sky:
 * where it is drawn, that every condition has one in both themes that the text can be
 * read on, and that the panel puts back every ink the sky changes.
 */

const tokens = readFileSync("app/styles/tokens.css", "utf8");
const forecast = readFileSync("app/styles/forecast.css", "utf8");
const surfaces = readFileSync("app/styles/surfaces.css", "utf8");
const controls = readFileSync("app/styles/controls.css", "utf8");
const globals = readFileSync("app/globals.css", "utf8");

const REGIMES: readonly RegimeKey[] = ["EXPANSION", "DEFENSIVE", "VOLATILE", "SCARCITY"];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Every rule whose selector is exactly this, at the start of a line, run together: the
   sky's tokens share their selectors with the regime map's. */
const ruleBody = (css: string, selector: string) => {
  const bodies = [...css.matchAll(new RegExp(`^${escape(selector)} \\{([^}]*)\\}`, "gm"))].map((match) => match[1] ?? "");
  assert.ok(bodies.length > 0, `${selector} has a rule`);
  return bodies.join("\n");
};

const declarations = (body: string) =>
  new Map([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1] ?? "", (match[2] ?? "").trim()]));

/* WCAG 2 relative luminance and contrast, on #rrggbb. */
const luminance = (hex: string) => {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
};

const sky = (theme: "dark" | "light", regime: RegimeKey) => {
  const selector = theme === "light" ? `html[data-theme="light"] [data-regime="${regime}"]` : `[data-regime="${regime}"]`;
  const values = declarations(ruleBody(tokens, selector));
  const read = (name: string) => {
    const value = values.get(name);
    assert.ok(value && /^#[0-9a-f]{6}$/i.test(value), `${theme} ${regime} sets ${name} as a hex`);
    return value;
  };
  return { top: read("--regime-sky-top"), base: read("--regime-sky"), ink: read("--regime-sky-ink"), muted: read("--regime-sky-muted") };
};

describe("the sky is drawn where the hero has a margin", () => {
  const hero = (aside?: React.ReactNode) =>
    renderToStaticMarkup(<DecisionHero weeklyCall="Hold." regime="VOLATILE" phoneFigure={<p>the ladder</p>} aside={aside} />);

  it("puts the condition and the guidance on the sky, and the scores on a panel of paper on it", () => {
    const html = hero(<p>the scores</p>);
    const skyAt = html.indexOf('<div class="weather-hero-sky" data-hero-sky="true">');
    assert.ok(skyAt >= 0, "the homepage hero draws the sky");
    assert.ok(skyAt < html.indexOf('id="weekly-call-title"'), "the guidance is on the sky");
    assert.match(html, /<div class="weather-hero-aside weather-hero-sky-panel [^"]*"><div class="max-md:hidden"><p>the scores<\/p>/);
    assert.match(html, /<div class="weather-hero-sky-panel md:hidden" data-hero-phone-figure="true"><p>the ladder<\/p>/, "on a phone the scores follow the guidance, on the same paper");
  });

  it("draws the clouds as decoration nobody reads", () => {
    assert.match(hero(<p>the scores</p>), /<span aria-hidden="true" class="weather-hero-sky-clouds">(<span><\/span>){4}<\/span>/);
  });

  it("leaves the answer pages, which pass no margin, on the paper in one column", () => {
    assert.doesNotMatch(hero(), /data-hero-sky|weather-hero-sky-panel/);
  });
});

describe("every condition has a sky in both themes, and the text on it can be read", () => {
  for (const theme of ["dark", "light"] as const) {
    for (const regime of REGIMES) {
      it(`${theme} ${regime}: both inks clear 4.5:1 at both ends of the gradient`, () => {
        const { top, base, ink, muted } = sky(theme, regime);
        for (const ground of [top, base]) {
          assert.ok(contrast(ink, ground) >= 4.5, `${ink} on ${ground}: ${contrast(ink, ground).toFixed(2)}`);
          assert.ok(contrast(muted, ground) >= 4.5, `${muted} on ${ground}: ${contrast(muted, ground).toFixed(2)}`);
        }
      });
    }
  }

  it("on the light theme, a sky is light where its fill is, so Stormy is the one dark sky (as on the record band)", () => {
    for (const regime of REGIMES) {
      const { base, ink } = sky("light", regime);
      assert.equal(luminance(ink) < luminance(base), isLightField(regime), regime);
    }
  });

  it("falls back to the paper under no regime, so an unknown week draws no colour", () => {
    const fallback = declarations(ruleBody(tokens, ":root"));
    assert.equal(fallback.get("--regime-sky-top"), "var(--bg-panel)");
    assert.equal(fallback.get("--regime-sky"), "var(--bg-body)");
    assert.equal(fallback.get("--regime-sky-ink"), "var(--app-text)");
  });
});

describe("the sky changes the inks and the panel puts every one back", () => {
  const captured = declarations(ruleBody(forecast, ".weather-hero-card"));
  const onSky = declarations(ruleBody(forecast, ".weather-hero-sky"));
  const restored = declarations(ruleBody(forecast, ".weather-hero-sky .weather-hero-sky-panel"));

  /* --page-text holds var(--app-text): which page ink each capture holds, by the ink. */
  const captureOf = new Map([...captured].map(([page, value]) => [value.replace(/^var\((--[\w-]+)\)$/, "$1"), page]));

  it("captures each ink the sky overrides, on the block, before the sky overrides it", () => {
    assert.ok(onSky.size >= 10);
    for (const name of onSky.keys()) {
      assert.match(captureOf.get(name) ?? "", /^--page-/, `${name} is captured on the block`);
    }
  });

  it("restores each one on the panel, so the ladders' red and ink read there as everywhere else", () => {
    for (const name of onSky.keys()) {
      assert.equal(restored.get(name), `var(${captureOf.get(name)})`, `${name} is restored on the panel`);
    }
  });

  it("gives the condition's glyph and an earlier week's stamp the sky's ink, not their own condition's", () => {
    assert.match(forecast, /\.weather-hero-sky :is\(\.weather-tag-placard, \.weather-tag-placard \[data-regime\]\) \{\s*--regime-ink: var\(--app-text\);/);
  });

  it("holds the clouds still for a reader who asks for less motion", () => {
    assert.match(forecast, /@media \(prefers-reduced-motion: reduce\) \{\s*\.weather-hero-sky-clouds > span \{ animation: none; \}/);
    /* Only transform moves, so the blur is drawn once and the compositor carries the rest. */
    const drift = forecast.slice(forecast.indexOf("@keyframes weather-sky-drift"), forecast.indexOf("@media (prefers-reduced-motion"));
    assert.match(drift, /transform:/);
    assert.doesNotMatch(drift, /opacity|filter|width|height|top|left/);
  });

  it("de-escalates the panel like any other container (surfaces.css)", () => {
    assert.match(surfaces, /\.weather-hero-sky-panel/);
  });

  it("loads after the tokens it reads", () => {
    assert.ok(globals.indexOf("forecast.css") > globals.indexOf("tokens.css"));
  });
});

describe("cards and buttons carry a layered depth", () => {
  const layers = (token: string) => {
    const start = tokens.indexOf(`${token}:`);
    assert.ok(start >= 0, `${token} is declared`);
    return tokens.slice(start + token.length + 1, tokens.indexOf(";", start)).split(/,\s*(?![^()]*\))/);
  };

  it("draws three layers, each offset downward, for a card and for a control", () => {
    for (const token of ["--elev-card", "--elev-control"]) {
      const stack = layers(token);
      assert.equal(stack.length, 3, token);
      for (const layer of stack) {
        assert.match(layer.trim(), /^0 calc\([1-9]\d* \* var\(--sh\)\)/, `${token}: no zero-offset layer (a glow), ${layer}`);
      }
    }
  });

  it("puts the card depth on the outermost surfaces and the control depth on buttons", () => {
    assert.match(ruleBody(surfaces, ".weather-surface"), /box-shadow: var\(--elev-card\)/);
    assert.match(ruleBody(controls, ".weather-button"), /box-shadow: var\(--elev-control\)/);
    assert.match(tokens, /--cta-shadow: var\(--elev-control\);\s*--cta-shadow-hover: var\(--elev-card\);/);
  });
});
