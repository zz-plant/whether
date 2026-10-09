import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

import { ADVICE_STANCE_DEFINITIONS, ADVICE_STANCES } from "../lib/adviceStance";
import { buildClassifierInput, clipQuote, isVerbatim, parseLabel, PROMPT_VERSION, SYSTEM_PROMPT } from "../scripts/advice-corpus/rubric";

/*
 * The advice corpus's rubric is registered in docs/research/advice-corpus-preregistration.md
 * before any post was labelled. These pin the parts a label depends on: the prompt cannot
 * change without a registered hash, and the parser applies exactly the registered
 * post-processing.
 */

const answer = (fields: Record<string, unknown>) =>
  JSON.stringify({
    capital_relevant: false,
    audience: "founders",
    stance: "craft",
    metrics_named: [],
    evidence: "",
    confidence: "high",
    ...fields,
  });

describe("the registered prompt", () => {
  it("is a version whose hash the pre-registration records", () => {
    const hash = createHash("sha256").update(SYSTEM_PROMPT).digest("hex");
    const registration = readFileSync("docs/research/advice-corpus-preregistration.md", "utf8");
    assert.ok(registration.includes(hash), `prompt ${PROMPT_VERSION} hashes to ${hash}, which the pre-registration does not record`);
  });

  it("carries the three stance definitions from the one place they are defined", () => {
    for (const stance of ADVICE_STANCES) assert.ok(SYSTEM_PROMPT.includes(ADVICE_STANCE_DEFINITIONS[stance].corpusDefinition), stance);
  });
});

describe("parseLabel", () => {
  it("reads a well-formed answer", () => {
    const parsed = parseLabel(answer({ stance: "craft", evidence: "Write the memo before the meeting." }), "Write the memo before the meeting.");
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.label, {
      capitalRelevant: false,
      audience: "founders",
      stance: "craft",
      metrics: [],
      evidence: "Write the memo before the meeting.",
      confidence: "high",
    });
  });

  it("makes an expand or conserve post capital-relevant (rule 5)", () => {
    for (const stance of ["expand", "conserve"]) {
      const parsed = parseLabel(answer({ stance, capital_relevant: false, evidence: "cut burn now" }));
      assert.ok(parsed.ok && parsed.label.capitalRelevant, stance);
    }
    const craft = parseLabel(answer({ stance: "craft", capital_relevant: false }));
    assert.ok(craft.ok && !craft.label.capitalRelevant);
  });

  it("keeps a metric only when the model names it and its words are in the input", () => {
    const input = "Our burn multiple fell below one while the runway grew to thirty months.";
    const parsed = parseLabel(answer({ metrics_named: ["burn_multiple", "runway", "rule_of_40", "made_up", "runway"] }), input);
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.label.metrics, ["burn_multiple", "runway"]);
  });

  it("clips the quote to fifteen words and drops it for none", () => {
    const long = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen";
    const parsed = parseLabel(answer({ stance: "expand", evidence: `"${long}"` }));
    assert.ok(parsed.ok);
    assert.equal(parsed.label.evidence.split(" ").length, 15);
    const none = parseLabel(answer({ stance: "none", evidence: "anything at all" }));
    assert.ok(none.ok && none.label.evidence === "");
  });

  it("finds the object inside chatter, and refuses what it cannot read", () => {
    assert.ok(parseLabel(`Here you go: ${answer({})} done`).ok);
    const bad = parseLabel(answer({ stance: "grow" }));
    assert.ok(!bad.ok && bad.error.includes("stance"));
    assert.equal(parseLabel("no json here").ok, false);
  });
});

describe("the classifier input", () => {
  it("is the title and the head of the post, with no date, firm or author", () => {
    const input = buildClassifierInput("Raise less", "Short post about runway.");
    assert.equal(input, "Title: Raise less\n\nShort post about runway.");
  });

  it("quotes windows around capital terms past the head of a long post", () => {
    const filler = Array.from({ length: 1200 }, (_, index) => `word${index}`).join(" ");
    const input = buildClassifierInput("Long", `${filler} then cut your burn rate and extend runway now ${filler}`);
    assert.ok(input.includes("[Later in the post]"));
    assert.ok(input.includes("burn rate"));
    assert.ok(input.includes("word1099") && !input.includes("word1100 word1101"), "the head stops at 1,100 words");
  });
});

describe("quotes", () => {
  it("clips and checks a quote against the text, ignoring punctuation and case", () => {
    assert.equal(clipQuote("“Default alive.”"), "Default alive.");
    assert.ok(isVerbatim("default alive", "Are you DEFAULT-alive, or default dead?"));
    assert.ok(!isVerbatim("raise a huge round", "Raise less, and later."));
  });
});
