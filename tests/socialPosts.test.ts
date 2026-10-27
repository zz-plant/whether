import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildSocialComposeUrl, formatSocialPost } from "../lib/export/socialPosts";
import { evaluateRegime } from "../lib/regimeEngine";
import { buildBriefDocument } from "../lib/report/briefDocument";
import type { TreasuryData } from "../lib/types";
import { fixtureWeeklyCall } from "./factories/exportFixtures";

/*
 * A post cut off by the network's composer loses its link, the one part that
 * must survive. These count the way each network does (X: a link is 23, other
 * characters outside ASCII up to 2; Bluesky: graphemes, link in full) and hold
 * every post under its cap, including a week whose guidance alone overruns it.
 */

const ORIGIN = "https://origin.test";

const treasury: TreasuryData = {
  record_date: "2026-09-29",
  fetched_at: "2026-09-29T09:00:00Z",
  source: "U.S. Treasury",
  isLive: true,
  yields: { oneMonth: 4.3, threeMonth: 4.3, twoYear: 4.0, tenYear: 4.4 },
};

const build = (call?: string) => {
  const assessment = evaluateRegime(treasury);
  const document = buildBriefDocument(
    { assessment, treasury, macroSeries: [], recordDateLabel: "Sep 29, 2026", sourceLabel: "U.S. Treasury" },
    fixtureWeeklyCall(assessment),
  );
  return call ? { ...document, call } : document;
};

const xCount = (text: string) => {
  let sum = 0;
  for (const char of text.replace(/https?:\/\/\S+/g, "x".repeat(23))) sum += (char.codePointAt(0) ?? 0) > 0x7f ? 2 : 1;
  return sum;
};
const graphemes = (text: string) => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)].length;

const LONG_CALL = `${"Hold every commitment you cannot unwind inside a quarter while the scores settle ".repeat(5).trim()}. Then revisit.`;

describe("social posts", () => {
  for (const [label, document] of [["an ordinary week", build()], ["a week whose guidance overruns the cap", build(LONG_CALL)]] as const) {
    it(`keeps the X post within 280 and ends on the link, on ${label}`, () => {
      const post = formatSocialPost(document, "x", ORIGIN);
      assert.ok(xCount(post) <= 280, `X post counts ${xCount(post)}:\n${post}`);
      assert.match(post, /\n\nhttps:\/\/origin\.test\/\S*\?ref=share$/);
      assert.match(post, /^Startup operating conditions, Sep 29, 2026: /);
    });

    it(`keeps the Bluesky post within 300 graphemes and ends on the link, on ${label}`, () => {
      const post = formatSocialPost(document, "bluesky", ORIGIN);
      assert.ok(graphemes(post) <= 300, `Bluesky post counts ${graphemes(post)}:\n${post}`);
      assert.match(post, /\n\nhttps:\/\/origin\.test\/\S*\?ref=share$/);
    });
  }

  it("cuts an overlong guidance at a word, never mid-word, and marks the cut", () => {
    const post = formatSocialPost(build(LONG_CALL), "x", ORIGIN);
    assert.match(post, /[a-z]…\n\nhttps:/);
  });

  it("keeps the whole guidance and the pause line when they fit", () => {
    const document = build("Hold the plan.");
    const post = formatSocialPost(document, "bluesky", ORIGIN);
    assert.ok(post.includes("\n\nHold the plan.\n\n"));
    if (document.slots.pauseIf) assert.ok(post.includes(`Pause if: ${document.slots.pauseIf}`));
  });

  it("leads the LinkedIn post with the conditions and the guidance, and closes on the source and the link", () => {
    const document = build();
    const lines = formatSocialPost(document, "linkedin", ORIGIN).split("\n");
    assert.equal(lines[0], `Startup operating conditions, Sep 29, 2026: ${document.conditions.line}.`);
    assert.equal(lines[2], document.call);
    assert.ok(lines.some((line) => line.startsWith("Source: U.S. Treasury")));
    assert.match(lines.at(-1) ?? "", /^Full brief: https:\/\/origin\.test\/\S*\?ref=share$/);
  });

  it("opens each network's composer with the post filled in", () => {
    const text = "Line one\n\nhttps://origin.test/?ref=share & more";
    for (const [network, prefix] of [
      ["x", "https://x.com/intent/post?text="],
      ["bluesky", "https://bsky.app/intent/compose?text="],
      ["linkedin", "https://www.linkedin.com/feed/?shareActive=true&text="],
    ] as const) {
      const url = buildSocialComposeUrl(network, text);
      assert.ok(url.startsWith(prefix), url);
      assert.equal(new URL(url).searchParams.get("text"), text);
    }
  });
});
