import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { extractUnits, nearestPairs, sentenceTemplate, sentenceUnits, type CodeUnit } from "../scripts/near-duplicates";

const source = [
  'import { z } from "zod";',
  "",
  "/** Clamp a score into the printed range. */",
  "export const clampScore = (value: number) => {",
  "  if (!Number.isFinite(value)) return 0;",
  "  if (value < 0) return 0;",
  "  if (value > 100) return 100;",
  "  return Math.round(value);",
  "};",
  "",
  "export const LABELS = {",
  '  a: "one",',
  '  b: "two",',
  '  c: "three",',
  '  d: "four",',
  "};",
  "",
  "export async function loadThing(id: string) {",
  "  const response = await fetch(id);",
  "  if (!response.ok) return null;",
  "  const body = await response.json();",
  "  return body;",
  "}",
  "",
  "const tiny = () => 1;",
  "",
  "export async function GET(request: Request) {",
  "  const url = new URL(request.url);",
  "  const id = url.searchParams.get(\"id\");",
  "  if (!id) return new Response(null, { status: 400 });",
  "  return Response.json(await loadThing(id));",
  "}",
].join("\n");

describe("near-duplicate audit", () => {
  it("takes top-level functions long enough to compare, and leaves tables and route handlers out", () => {
    const units = extractUnits(source, "lib/example.ts");
    assert.deepEqual(units.map(({ name, line }) => ({ name, line })), [
      { name: "clampScore", line: 4 },
      { name: "loadThing", line: 18 },
    ]);
    const [clamp] = units;
    assert.ok(clamp);
    assert.ok(clamp.text.startsWith("export const clampScore"));
    assert.ok(clamp.text.endsWith("};"));
  });

  it("ranks cross-file pairs by cosine, closest first, and skips same-file pairs", () => {
    const unit = (file: string, name: string): CodeUnit => ({ file, name, line: 1, text: "" });
    /* Unnormalized on purpose: a truncated or raw vector must still score as a cosine. */
    const embedded = [
      { unit: unit("lib/a.ts", "clamp"), vector: [2, 0] },
      { unit: unit("lib/b.ts", "bound"), vector: [1, 0.1] },
      { unit: unit("lib/a.ts", "clampAgain"), vector: [3, 0] },
      { unit: unit("lib/c.ts", "other"), vector: [0, 1] },
    ];

    const pairs = nearestPairs(embedded, 0.9, 10);
    assert.deepEqual(pairs.map(({ a, b }) => `${a.name}~${b.name}`), ["clamp~bound", "bound~clampAgain"]);
    const [closest] = pairs;
    assert.ok(closest && closest.score > 0.99 && closest.score <= 1);
    assert.equal(nearestPairs(embedded, 0.9, 1).length, 1);
  });

  it("makes one unit of a sentence printed on several routes, and drops one printed on all", () => {
    const units = sentenceUnits([
      { route: "/", sentences: ["Pause if funding pressure is above 76.", "Read the method on the trust page."] },
      { route: "/trust", sentences: ["Read the method on the trust page.", "• Pause if: funding pressure is above 76"] },
      { route: "/share", sentences: ["Read the method on the trust page.", "Subscribe for the Monday brief."] },
    ]);
    assert.deepEqual(units.map(({ file, line, text }) => ({ file, line, text })), [
      { file: "/, /trust", line: 1, text: "Pause if funding pressure is above 76." },
      { file: "/share", line: 2, text: "Subscribe for the Monday brief." },
    ]);
  });

  it("keeps same-route sentence pairs when asked, and skips what the caller rules out", () => {
    const unit = (file: string, text: string): CodeUnit => ({ file, name: text, line: 1, text });
    const embedded = [
      { unit: unit("/operate", "Resume line A and B"), vector: [1, 0] },
      { unit: unit("/operate", "Resume line B and A"), vector: [1, 0.05] },
      { unit: unit("/history", "Freezing week of Sep 29"), vector: [0, 1] },
      { unit: unit("/history", "Freezing week of Sep 22"), vector: [0.02, 1] },
    ];
    const skip = (a: CodeUnit, b: CodeUnit) => sentenceTemplate(a.text) === sentenceTemplate(b.text);

    assert.equal(nearestPairs(embedded, 0.9, 10).length, 0);
    assert.deepEqual(
      nearestPairs(embedded, 0.9, 10, { sameFile: true, skip }).map(({ a, b }) => `${a.name}~${b.name}`),
      ["Resume line A and B~Resume line B and A"],
    );
  });

  it("reads table rows filled from one template as the same sentence", () => {
    assert.equal(sentenceTemplate("Mar 2022 · 2Y +84 bp · 10Y +49 bp."), sentenceTemplate("Sep 2026 · 2Y +54 bp · 10Y +54 bp."));
    assert.notEqual(sentenceTemplate("Inflation Live Monthly release"), sentenceTemplate("Labor Live Monthly release"));
  });
});
