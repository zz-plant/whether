import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { REGIME_ICONS, REGIME_LABELS, REGIME_ORDER } from "../lib/regimePresentation";
import { DECISION_AREA_ICONS, decisionAreaLabel, decisionAreaOrder } from "../lib/report/boundedDecisionRules";
import { LINE_STATE_ICONS } from "../lib/report/operatingCalls";
import { createVisualAssets, buildVisualAssetGallery, buildVisualAssetMotionExample, VISUAL_ASSET_THEMES } from "../lib/image/visualAssetKit";

describe("downloadable visual asset kit", () => {
  const assets = () => createVisualAssets();

  it("covers every canonical condition, operating area and line state in both themes", () => {
    for (const theme of ["dark", "light"] as const) {
      for (const regime of REGIME_ORDER) {
        const asset = assets().find((item) => item.id === `condition-${regime.toLowerCase()}-tile` && item.theme === theme);
        assert.ok(asset, `${theme} ${regime}`);
        assert.ok(asset.svg.includes(REGIME_LABELS[regime]));
        const glyph = renderToStaticMarkup(createElement(REGIME_ICONS[regime]));
        assert.ok(asset.svg.includes(glyph.match(/<path[^>]*d="([^"]+)"/)?.[1] ?? glyph.match(/<circle[^>]*cx="([^"]+)"/)?.[1] ?? "missing glyph"));
      }
      for (const area of decisionAreaOrder) {
        const asset = assets().find((item) => item.id === `area-${area}-glyph` && item.theme === theme);
        assert.ok(asset, `${theme} ${area}`);
        assert.ok(asset.svg.includes(decisionAreaLabel(area)));
        const glyph = renderToStaticMarkup(createElement(DECISION_AREA_ICONS[area]));
        assert.ok(asset.svg.includes(glyph.match(/<path[^>]*d="([^"]+)"/)?.[1] ?? "missing glyph"));
      }
      for (const state of Object.keys(LINE_STATE_ICONS)) {
        assert.ok(assets().some((item) => item.id === `line-${state}-stamp` && item.theme === theme));
      }
    }
  });

  it("labels each numerical or blank template visibly and describes it without current facts", () => {
    const kit = assets();
    assert.ok(kit.some((asset) => asset.group === "charts"));
    assert.ok(kit.some((asset) => asset.group === "frames"));
    for (const asset of kit) {
      assert.match(asset.svg, /<title(?:\s|>)/);
      assert.match(asset.svg, /<desc(?:\s|>)/);
      assert.ok(asset.alt.length > 30, asset.id);
      if (asset.example) {
        assert.match(asset.svg, /<text[^>]*>[^<]*(?:Template|Illustrative)/i, asset.id);
        assert.match(asset.alt, /template|illustrative/i, asset.id);
      }
      assert.doesNotMatch(asset.svg, /<script|https?:\/\/(?!www\.w3\.org)/, asset.id);
    }
  });

  it("keeps condition references semantically correct and neutral glyphs out of condition colors", () => {
    for (const asset of assets()) {
      if (asset.id === "conditions-plane") {
        const readable = asset.svg.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
        assert.match(readable, /Money is cheap but investors are wary/);
        assert.match(readable, /Money is available but pricey/);
        assert.match(asset.svg, /Funding pressure/);
        assert.match(asset.svg, /Risk appetite/);
      }
      if (asset.group === "areas" || asset.group === "status") {
        assert.doesNotMatch(asset.svg, /#d9a82c|#9d7a4a|#8f96e0|#3a6fa3|#f2685c|#b4232a/);
      }
    }
  });

  it("matches the light and dark surface and condition inks to the site's actual tokens", () => {
    const tokens = readFileSync(new URL("../app/styles/tokens.css", import.meta.url), "utf8");
    const light = tokens.match(/html\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    for (const [name, theme] of Object.entries(VISUAL_ASSET_THEMES)) {
      const source = name === "light" ? light : tokens.slice(0, tokens.indexOf('html[data-theme="light"]'));
      for (const [role, token] of [["bg", "bg-body"], ["panel", "bg-panel"], ["ink", "app-text"], ["muted", "app-text-muted"], ["line", "line-crossed-ink"]] as const) {
        assert.ok(source.includes(`--${token}: ${theme[role]}`), `${name} ${token}`);
      }
      for (const color of Object.values(theme.conditionInk)) assert.ok(source.includes(color));
    }
  });

  it("generates stable unique files, an accessible gallery and motion with an immediate reduced-motion end state", () => {
    const first = assets();
    assert.deepEqual(first, assets());
    assert.equal(new Set(first.map((asset) => `${asset.theme}/${asset.id}`)).size, first.length);
    const gallery = buildVisualAssetGallery(first);
    assert.match(gallery, /<main/);
    assert.match(gallery, /download/);
    assert.match(gallery, /width="\d+" height="\d+"/);
    assert.doesNotMatch(gallery, /<script/);
    for (const theme of ["dark", "light"] as const) {
      const motion = buildVisualAssetMotionExample(theme);
      assert.match(motion, /prefers-reduced-motion:\s*reduce/);
      assert.match(motion, /animation:\s*none/);
      assert.match(motion, /Template/);
      assert.doesNotMatch(motion, /infinite|setInterval|requestAnimationFrame/);
    }
  });
});
