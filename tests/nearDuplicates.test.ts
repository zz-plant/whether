import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { extractUnits, nearestPairs, type CodeUnit } from "../scripts/near-duplicates";

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
});
