import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HearingBubbles } from "../app/components/ui/hearingBubbles";

const entries = [
  { from: "Hiring manager", question: "Is this role still open?", answer: "Not this quarter." },
  { from: "Investors", question: "Why not raise now?", answer: "The terms would be worse than the delay." },
];

describe("hearing bubbles", () => {
  /*
   * WCAG 2.5.3 (Label in Name). The visible label is "Copy script", and the
   * accessible name used to be "Copy reply to Hiring manager" — a speech-input
   * user saying what they can see had nothing to say (2026-11-02).
   */
  it("names the copy control with the words the reader can see", () => {
    const html = renderToStaticMarkup(<HearingBubbles entries={entries} />);
    const labels = [...html.matchAll(/aria-label="(Copy[^"]*)"/g)].map((match) => match[1]);
    assert.equal(labels.length, entries.length, "one copy control per bubble");
    for (const label of labels) {
      assert.ok(label?.startsWith("Copy script"), `"${label}" must open with the visible label`);
    }
    assert.match(html, /aria-label="Copy script — reply to Hiring manager"/);
    assert.doesNotMatch(html, /aria-label="Copy reply to /);
  });

  /* The repo's floor is 44px on touch; 24px was under it. */
  it("gives the copy control a 44px floor", () => {
    const html = renderToStaticMarkup(<HearingBubbles entries={entries} />);
    assert.match(html, /min-h-11/);
    assert.doesNotMatch(html, /min-h-\[24px\]/);
  });
});
