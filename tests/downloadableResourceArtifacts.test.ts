import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "bun:test";
import { downloadableResources } from "../lib/downloadableResources";

/**
 * What the three files under `public/downloads/` have to be.
 *
 * All three shipped as ~300-byte skeletons of empty headings. For the template
 * and the checklist that is correct — a blank form is what a template is. For
 * the third it was not: it is titled "Example", sold as "a memo example for
 * board updates", and contained no example. A reader who already had the
 * template downloaded the same blank document under a second name.
 *
 * So the rule is asymmetric, and this pins both halves: a file that calls
 * itself an example carries filled content, and a worked example that quotes
 * figures says in the file that they are illustrative — otherwise it is a live
 * claim, and it goes stale the week after it ships.
 */

const readDownload = (href: string) => readFile(`public${href}`, "utf8");

/**
 * A whole line that is a field label and nothing else — `- Current posture:`.
 * A form is made of these; a worked example has none left.
 *
 * Anchored with no leading whitespace on purpose: an indented line ending in a
 * colon is a wrapped sentence ("... On breach:" continuing below), and counting
 * those made the check fail on prose that was in fact filled in.
 */
const emptyFieldCount = (markdown: string) =>
  markdown.split("\n").filter((line) => /^(?:[-*]\s+)?\*{0,2}[A-Z][^.:|]{0,60}:\*{0,2}\s*$/.test(line)).length;

describe("downloadable resource artifacts", () => {
  it("serves a file for every advertised download", async () => {
    for (const [slug, config] of Object.entries(downloadableResources)) {
      const body = await readDownload(config.downloadCta.href);
      assert.ok(body.trim().length > 0, `${slug} advertises an empty download`);
      assert.match(body, /^# /m, `${slug}'s download has no heading`);
    }
  });

  it("gives the example actual content, not the template's blank form", async () => {
    const memo = await readDownload(
      downloadableResources["quarterly-capital-posture-memo-example"].downloadCta.href,
    );

    assert.ok(
      emptyFieldCount(memo) === 0,
      `the memo example still has ${emptyFieldCount(memo)} unfilled field(s); an example has to be worked`,
    );
    // The things a memo example exists to demonstrate, each of which the blank
    // version named as a heading and left empty.
    assert.match(memo, /Reversal trigger logic/i);
    assert.match(memo, /SAFE/);
    assert.match(memo, /DANGEROUS/);
    assert.ok(memo.length > 1500, "an example this short cannot be carrying worked content");
  });

  it("says in the file that the example's figures are illustrative", async () => {
    // Without this the memo reads as a published reading, and the archive is the
    // only place this product makes those.
    const memo = await readDownload(
      downloadableResources["quarterly-capital-posture-memo-example"].downloadCta.href,
    );

    assert.match(memo, /not a live reading/i);
    assert.match(memo, /whether\.work/);
  });

  it("leaves the template and the checklist as forms", async () => {
    // The inverse of the rule above: these two are meant to be filled in by the
    // reader, so a "worked" version of either would be the wrong fix.
    const template = await readDownload(
      downloadableResources["capital-posture-template"].downloadCta.href,
    );
    assert.ok(emptyFieldCount(template) > 0, "the template stopped being a blank form");

    const checklist = await readDownload(
      downloadableResources["reversal-trigger-checklist"].downloadCta.href,
    );
    assert.match(checklist, /- \[ \]/, "the checklist stopped offering unchecked boxes");
  });
});
