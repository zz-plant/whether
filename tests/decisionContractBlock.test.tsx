import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionContractBlock } from "../app/components/decisionContractBlock";

/*
 * The signal pages printed the call-change line under "Resume when", the
 * label for an area's resume line, so a reader waiting to resume at 66 read
 * "Resume when: Funding pressure falls 20 pts to 70". The regime word printed
 * under "Guidance", a label for a sentence.
 */
const html = renderToStaticMarkup(
  <DecisionContractBlock
    conditions="Freezing"
    action="Freeze new commitments and protect runway."
    pauseIf="Funding pressure rises above 76 or risk appetite falls below 44"
    callChangesIf="Funding pressure falls 20 pts to 70 or below (90 today)"
    evidence="Short-term Treasury rates."
  />,
);
const text = html.replace(/<[^>]+>/g, "").replaceAll("&#x27;", "'");

describe("the bounded guidance on a signal page", () => {
  it("prints the call-change line under its own label, not the resume label", () => {
    assert.match(text, /Conditions change if: Funding pressure falls 20 pts to 70/);
    assert.doesNotMatch(text, /Resume when/);
  });

  it("names the week's word as conditions, and links to the brief in plain words", () => {
    assert.match(text, /Conditions: Freezing/);
    assert.doesNotMatch(text, /Guidance: Freezing/);
    assert.match(text, /Open this week's brief/);
    assert.doesNotMatch(text, /handoff/i);
  });
});
