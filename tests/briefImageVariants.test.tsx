import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { ImageResponse } from "next/og";
import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildShareImageArtifacts, ShareImageArtifacts } from "../app/share/shareImageArtifacts";
import { buildScoreReadings } from "../lib/export/scoreReference";
import { parseBriefImageVariant, renderBriefImage, type BriefImageProps } from "../lib/image/briefImageTemplate";
import { OG_FONT_BODY, OG_FONT_DISPLAY, OG_FONT_STAMP } from "../lib/image/ogFonts";
import { buildRuleCondition } from "../lib/report/boundedDecisionRules";
import { buildSharedCorridorRails } from "../lib/report/operatingCalls";

const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return isValidElement<{ children?: ReactNode }>(node) ? textOf(node.props.children) : "";
};

const props: BriefImageProps = {
  decision: "Hold net-new hiring and freeze discretionary spend until funding pressure falls back under the resume line and stays there for two readings in a row.",
  regime: "SCARCITY",
  readings: buildScoreReadings({
    scores: { tightness: 100, riskAppetite: 43 },
    previous: {
      tightness: 63,
      riskAppetite: 56,
      comparedWith: { recordDate: "2025-12-31", label: "Dec 31, 2025" },
    },
    rails: buildSharedCorridorRails([{
      pauseConditions: [buildRuleCondition("tightness", ">", 76), buildRuleCondition("riskAppetite", "<", 44)],
      resumeConditions: [buildRuleCondition("tightness", "<", 66), buildRuleCondition("riskAppetite", ">", 54)],
    }], { tightness: 100, riskAppetite: 43 }),
  }),
  confidenceLabel: "MED",
  recordDate: "Oct 23, 2026",
  briefLabel: "Weekly Brief",
  contextLabel: "Historical mode active · March 2026 · Fintech · Series B+",
  sourceLabel: "US Treasury and the St. Louis Fed (FRED), plus a curated startup-market snapshot",
};

const fonts = [
  { name: OG_FONT_DISPLAY, data: readFileSync("public/fonts/og/archivo-semicondensed-700.ttf"), weight: 700 as const, style: "normal" as const },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/archivo-400.ttf"), weight: 400 as const, style: "normal" as const },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/archivo-600.ttf"), weight: 600 as const, style: "normal" as const },
  { name: OG_FONT_STAMP, data: readFileSync("public/fonts/og/archivo-expanded-700.ttf"), weight: 700 as const, style: "normal" as const },
];

describe("brief image variants", () => {
  it("keeps the default card size and falls back safely for unknown options", () => {
    for (const query of ["", "layout=unknown&theme=neon"]) {
      assert.deepEqual(parseBriefImageVariant(new URLSearchParams(query)), {
        layout: "standard", theme: "dark", width: 1200, height: 800,
      });
    }
    assert.deepEqual(renderBriefImage(props), renderBriefImage(props, parseBriefImageVariant(new URLSearchParams())));
  });

  it("applies the selected stage and supported brief context to the chosen file and preview", () => {
    const artifacts = buildShareImageArtifacts("series-b", new URLSearchParams("stage=seed&sector=fintech&ticker=acme&month=3&year=2026&utm_source=ignored"), "portrait", "light");
    const card = artifacts.find((artifact) => artifact.title === "Brief card");
    assert.ok(card);
    const url = new URL(card.preview.src, "https://whether.work");
    assert.equal(url.pathname, "/api/image/brief");
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      month: "3", year: "2026", sector: "fintech", stage: "series-b", ticker: "ACME", layout: "portrait", theme: "light",
    });
    assert.equal(card.preview.width, 1080);
    assert.equal(card.preview.height, 1350);
    assert.ok(card.files.every((file) => file.href === card.preview.src));
  });

  it("offers the shapes and themes around a single brief preview", () => {
    const html = renderToStaticMarkup(<ShareImageArtifacts />);
    const card = html.slice(html.indexOf('data-image-artifact="Brief card"'));
    assert.equal((card.match(/<img /g) ?? []).length, 1);
    for (const name of ["Card shape", "Card theme", "Landscape", "Square", "Portrait", "Light", "Dark", "Download PNG"]) {
      assert.ok(card.includes(name), `the picker exposes ${name}`);
    }
  });

  for (const [layout, width, height] of [
    ["landscape", 1200, 675],
    ["square", 1080, 1080],
    ["portrait", 1080, 1350],
  ] as const) {
    for (const theme of ["dark", "light"] as const) {
      it(`renders ${layout} ${theme} with its full call, readings and trust context`, async () => {
        const variant = parseBriefImageVariant(new URLSearchParams({ layout, theme }));
        assert.deepEqual(variant, { layout, theme, width, height });
        const tree = renderBriefImage(props, variant);
        const text = textOf(tree);
        for (const part of [props.decision, props.contextLabel, props.sourceLabel, props.recordDate, "WITHIN REACH OF THE LINE", "whether.work"]) {
          assert.ok(part && text.includes(part), `the ${layout} card must carry "${part}" without cutting it`);
        }
        for (const reading of props.readings) {
          for (const part of [reading.label, reading.value, reading.meaning, reading.line, reading.distance, reading.previous, reading.resume]) {
            assert.ok(part && text.includes(part), `the ${layout} card must carry "${part}"`);
          }
        }
        assert.doesNotMatch(text, /last week|…/);
        const bytes = new Uint8Array(await new ImageResponse(tree, { width, height, fonts }).arrayBuffer());
        assert.ok(bytes.byteLength > 1000, "Satori must produce a complete PNG");
        assert.deepEqual(Array.from(bytes.slice(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
        const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        assert.equal(header.getUint32(16), width);
        assert.equal(header.getUint32(20), height);
      });
    }
  }
});
