import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { formatBriefArtifact } from "../lib/report/briefArtifact";
import { parseSlackMrkdwn, slackMrkdwnHasFormatting } from "../lib/export/slackMrkdwn";
import { fixtureBriefDocument } from "./factories/exportFixtures";

/*
 * `/share` drew the Slack post as raw markup. The preview reads the same text
 * into blocks now, so these hold what it reads: the subset the chat formats
 * write, and nothing it would invent from text that only looks like markup.
 */
describe("parseSlackMrkdwn", () => {
  it("groups quoted lines into one block and strips the marker", () => {
    const blocks = parseSlackMrkdwn("*Title*\n> one\n> two\n\nafter");
    assert.deepEqual(
      blocks.map((block) => ({ quote: block.quote, lines: block.lines.length })),
      [
        { quote: false, lines: 1 },
        { quote: true, lines: 2 },
        { quote: false, lines: 2 },
      ],
    );
    assert.deepEqual(blocks[1]?.lines[0], [{ kind: "text", text: "one" }]);
    // The blank line survives as an empty line, so the gap the channel shows is drawn.
    assert.deepEqual(blocks[2]?.lines[0], []);
  });

  it("reads bold and italic only where Slack would", () => {
    assert.deepEqual(parseSlackMrkdwn("> *Guidance:* hold")[0]?.lines[0], [
      { kind: "bold", text: "Guidance:" },
      { kind: "text", text: " hold" },
    ]);
    assert.deepEqual(parseSlackMrkdwn("a _quiet_ week")[0]?.lines[0], [
      { kind: "text", text: "a " },
      { kind: "italic", text: "quiet" },
      { kind: "text", text: " week" },
    ]);
    for (const plain of ["5 * 3 * 2", "snake_case_name", "risk appetite < 44", "*not closed"]) {
      assert.deepEqual(parseSlackMrkdwn(plain)[0]?.lines[0], [{ kind: "text", text: plain }], plain);
    }
  });

  it("links a bare http(s) URL without its trailing punctuation, and nothing else", () => {
    assert.deepEqual(parseSlackMrkdwn("Full brief: https://whether.work/brief/2026-w40?ref=share.")[0]?.lines[0], [
      { kind: "text", text: "Full brief: " },
      { kind: "link", href: "https://whether.work/brief/2026-w40?ref=share" },
      { kind: "text", text: "." },
    ]);
    assert.deepEqual(parseSlackMrkdwn("javascript:alert(1)")[0]?.lines[0], [{ kind: "text", text: "javascript:alert(1)" }]);
  });

  it("reads this week's Slack post as a bold title over a quoted block", () => {
    const blocks = parseSlackMrkdwn(formatBriefArtifact(fixtureBriefDocument(), "slack", "https://whether.work"));
    assert.equal(blocks[0]?.lines[0]?.[0]?.kind, "bold", "the title is bold");
    assert.equal(blocks[1]?.quote, true, "the guidance and its lines sit under one quote bar");
    assert.ok(blocks.some((block) => block.lines.some((line) => line.some((inline) => inline.kind === "link"))), "the brief link is a link");
    assert.equal(slackMrkdwnHasFormatting(blocks), true);
  });

  it("says when the drawing would read the same as the text", () => {
    assert.equal(slackMrkdwnHasFormatting(parseSlackMrkdwn("Call unchanged, 0.2% from flip; no pace change.")), false);
    assert.equal(slackMrkdwnHasFormatting(parseSlackMrkdwn("See https://whether.work")), false, "a link reads the same either way");
  });
});
