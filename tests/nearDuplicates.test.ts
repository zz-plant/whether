import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
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

  it("ends a function before following declarations and their comments", () => {
    const functionSource = [
      "export const normalizeEmail = (value: string) => {",
      "  const trimmed = value.trim();",
      "  if (!trimmed) return null;",
      "  const normalized = trimmed.toLowerCase();",
      "  return normalized;",
      "};",
    ].join("\n");
    const followingDeclarations = [
      "export class Customer {\n  email = '';\n}",
      "export type Customer = {\n  email: string;\n};",
      "export interface Customer {\n  email: string;\n}",
      "let lastEmail: string | undefined;",
      "var emailCount = 0;",
      "export enum Status {\n  Active,\n}",
      'import { Customer } from "./customer";',
      'export { Customer } from "./customer";',
      "",
    ];

    for (const following of followingDeclarations) {
      const fixture = `${functionSource}\n\n/** Documentation for what follows.\n * It does not describe normalizeEmail.\n */\n// Another unrelated comment.\n${following}`;
      const units = extractUnits(fixture, "lib/customers.ts");
      assert.equal(units.length, 1, following);
      assert.equal(units[0]?.text, functionSource, following);
    }
  });

  it("does not make a tiny function eligible by appending the following class", () => {
    const units = extractUnits([
      "export const normalizeEmail = (value: string) => value.trim().toLowerCase();",
      "",
      "export class Customer {",
      "  email = '';",
      "  name = '';",
      "  active = true;",
      "}",
    ].join("\n"), "lib/customers.ts");

    assert.deepEqual(units, []);
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

  it("keeps signs and comparison operators distinct when deduplicating sentences", () => {
    const signed = ["The yield changed by +25 basis points.", "The yield changed by -25 basis points."];
    const comparisons = ["<", ">", "<=", ">="].map((operator) => `Pause hiring when runway is ${operator} 12 months.`);
    const sentences = [...signed, ...comparisons];
    assert.deepEqual(sentenceUnits([{ route: "/", sentences }]).map(({ text }) => text), sentences);
  });

  it("does not classify opposite comparisons on separate routes as shared chrome", () => {
    const units = sentenceUnits([
      { route: "/", sentences: ["Pause hiring when runway is < 12 months."] },
      { route: "/operate", sentences: ["Pause hiring when runway is > 12 months."] },
    ]);
    assert.equal(units.length, 2);
  });

  it("reports similar decision sentences with different thresholds in copy mode", async () => {
    const server = createServer((request, response) => {
      if (request.url === "/api/embed") {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ model: "fixture", embeddings: [[1, 0], [1, 0]] }));
      } else {
        response.end("<p>Pause hiring when cash runway falls below 12 months.</p><p>Pause hiring when cash runway falls below 18 months.</p>");
      }
    });
    const reportRoot = mkdtempSync(join(tmpdir(), "whether-near-duplicates-"));
    try {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      assert.ok(address && typeof address === "object");
      const baseUrl = `http://127.0.0.1:${address.port}`;
      await promisify(execFile)("bun", [
        fileURLToPath(new URL("../scripts/near-duplicates.ts", import.meta.url)),
        "--copy", "--base-url", baseUrl, "--routes", "/", "--host", baseUrl, "--model", "fixture",
      ], { cwd: reportRoot, timeout: 10_000 });
      const report = JSON.parse(readFileSync(join(reportRoot, "artifacts/near-duplicates/report.copy.json"), "utf8"));
      assert.equal(report.sentences, 2);
      assert.equal(report.pairs.length, 1);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      rmSync(reportRoot, { recursive: true, force: true });
    }
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
