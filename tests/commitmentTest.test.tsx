import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CommitmentTest, CommitmentTestDisclosure } from "../app/components/home/CommitmentTest";
import { decisionAreaLabel, decisionAreaOrder } from "../lib/report/boundedDecisionRules";

/**
 * "Test it against your runway" asks for what a founder without a finance lead
 * knows, and a returning reader can reach it from the full brief.
 */
describe("the commitment test", () => {
  it("asks for cash, spend and revenue, not a runway figure", () => {
    const html = renderToStaticMarkup(<CommitmentTest regime="DEFENSIVE" area="hiring" />);
    for (const label of ["Cash in the bank", "Monthly spend", "Monthly revenue", "This decision adds, per month"]) {
      assert.ok(html.includes(label), `missing field: ${label}`);
    }
    assert.ok(!html.includes("Runway (months)"));
    // No figures on the server: the profile is the browser's, so nothing is sized.
    assert.ok(!html.includes("data-testid=\"commitment-runway\""));
  });

  it("has a folded copy for returning readers that names every area", () => {
    const html = renderToStaticMarkup(<CommitmentTestDisclosure regime="DEFENSIVE" />);
    assert.match(html, /<details[^>]*data-testid="commitment-test-disclosure"(?![^>]*\sopen)/, "folded by default");
    assert.ok(html.includes("Test a decision against your runway"));
    for (const area of decisionAreaOrder) {
      assert.ok(html.includes(`>${decisionAreaLabel(area)}</option>`), `missing area: ${area}`);
    }
    assert.ok(html.includes("data-testid=\"commitment-test\""), "the same test, not a second one");
  });
});
