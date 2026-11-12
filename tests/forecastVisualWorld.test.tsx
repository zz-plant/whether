import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { Shell } from "../app/components/Shell";

/*
 * The Forecast visual world (2026-11-12).
 *
 * The homepage ground follows the week's condition, so a storm week and a
 * sunny week look like different apps. This holds the wiring that makes that
 * true: the shell carries data-forecast + the condition slug, and the layer
 * defines one palette per condition plus the reduced-eyebrow rule.
 */

const forecastCss = readFileSync("app/styles/forecast.css", "utf8");
const globalsCss = readFileSync("app/globals.css", "utf8");

describe("the Forecast world is wired to the shell", () => {
  it("marks the homepage shell with data-forecast and the condition slug", () => {
    const markup = renderToStaticMarkup(<Shell regime="DEFENSIVE">hello</Shell>);
    assert.match(markup, /data-forecast=""/);
    assert.match(markup, /data-condition="cloudy"/);
  });

  it("maps each regime key to its public condition slug", () => {
    assert.match(renderToStaticMarkup(<Shell regime="EXPANSION">x</Shell>), /data-condition="sunny"/);
    assert.match(renderToStaticMarkup(<Shell regime="VOLATILE">x</Shell>), /data-condition="stormy"/);
    assert.match(renderToStaticMarkup(<Shell regime="SCARCITY">x</Shell>), /data-condition="freezing"/);
    const unknown = renderToStaticMarkup(<Shell regime="nonsense">x</Shell>);
    assert.doesNotMatch(unknown, /data-condition=/);
  });
});

describe("the Forecast layer defines one palette per condition", () => {
  for (const condition of ["sunny", "cloudy", "stormy", "freezing"]) {
    it(`carries a [data-condition="${condition}"] block`, () => {
      assert.match(forecastCss, new RegExp(`\\[data-forecast\\]\\[data-condition="${condition}"\\]`));
    });
  }

  it("is imported after the incumbent tokens so it can override them", () => {
    assert.match(globalsCss, /styles\/forecast\.css/);
    assert.ok(
      globalsCss.indexOf("forecast.css") > globalsCss.indexOf("tokens.css"),
      "forecast.css must load after tokens.css",
    );
  });

  it("reduces eyebrows: the label rule is sentence case, not tracked uppercase", () => {
    assert.match(forecastCss, /\.f-label\s*\{[^}]*text-transform:\s*none/s);
    assert.match(forecastCss, /\.f-label\s*\{[^}]*letter-spacing:\s*0/s);
  });
});
