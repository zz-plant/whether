import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { normalize, pageDate, pageTextOf } from "../scripts/evals/lib";

/*
 * The eval scripts' pure functions, verified without Ollama or a running app.
 * These are the functions a failed comprehension finding is read through, so a
 * normalization bug here would make a real finding look like a harness bug —
 * which is why they are held directly (2026-10-22).
 */
describe("eval lib", () => {
  it("normalizes smart quotes, whitespace and case", () => {
    assert.equal(normalize("Commit to what\u2019s right"), "commit to what's right");
    assert.equal(normalize("  Multiple   spaces\tand\nnewlines  "), "multiple spaces and newlines");
    assert.equal(normalize("\u201CQuoted\u201D"), '"quoted"');
  });

  it("formats an ISO date the way the pages print it", () => {
    assert.equal(pageDate("2026-10-20"), "Oct 20, 2026");
    // Not the visitor's timezone: a UTC reading is October in UTC even for a
    // browser west of the line.
    assert.equal(pageDate("2026-01-01"), "Jan 1, 2026");
  });

  it("extracts readable text from rendered HTML", () => {
    const html = `<html><head><script>var x = 1;</script><style>.a { color: red }</style></head>
      <body><!-- comment --><h1>Test</h1><p>Hello&nbsp;&amp; world&#39;s</p></body></html>`;
    assert.equal(pageTextOf(html), "Test Hello & world's");
  });

  it("keeps entity-decoded apostrophes in extracted text", () => {
    // The containment checks compare quotes against extracted page text, so an
    // apostrophe that survives as &#x27; would break every "was not found".
    const html = "<p>What&#x27;s the plan?</p>";
    assert.equal(pageTextOf(html), "What's the plan?");
  });
});
