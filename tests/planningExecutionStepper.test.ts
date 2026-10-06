import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  OperationsExecutionStepper,
  buildOperationsExecutionStepHref,
  resolveOperationsExecutionStepActionLabel,
  resolveOperationsExecutionStepId,
  resolveOperationsExecutionStepIdFromLocation,
  resolveInitialOpenStepIds,
} from "../app/operate/components/planningExecutionStepper";

describe("resolveOperationsExecutionStepId", () => {
  const steps = [
    {
      id: "ops-monthly-action-summary",
      label: "Plan",
      title: "Weekly plan",
      description: "Plan",
      summary: "Plan",
      owner: "Finance",
      approvalStatus: "Ready for weekly review",
      changeSignal: "Cash posture shifts",
      hashAliases: ["ops-monthly-action-summary-panel"],
      children: null,
    },
    {
      id: "ops-export-briefs",
      label: "Share",
      title: "Share brief",
      description: "Share",
      summary: "Share",
      owner: "Leadership",
      approvalStatus: "Ready to circulate",
      changeSignal: "Artifact no longer matches posture",
      hashAliases: ["ops-export-briefs-panel", "ops-operator-requests", "ops-operator-requests-panel"],
      children: null,
    },
  ];

  it("builds hash links for opening a step", () => {
    assert.equal(buildOperationsExecutionStepHref("ops-export-briefs"), "#ops-export-briefs");
  });

  it("uses action labels that make the stepper feel navigable", () => {
    assert.equal(resolveOperationsExecutionStepActionLabel(true), "Current step");
    assert.equal(resolveOperationsExecutionStepActionLabel(false), "Open step");
  });

  it("keeps canonical step ids when the hash already matches a step", () => {
    assert.equal(
      resolveOperationsExecutionStepId({
        hashId: "ops-export-briefs",
        firstStepId: "ops-monthly-action-summary",
        steps,
      }),
      "ops-export-briefs",
    );
  });

  it("maps legacy section hashes to their containing step", () => {
    assert.equal(
      resolveOperationsExecutionStepId({
        hashId: "ops-operator-requests",
        firstStepId: "ops-monthly-action-summary",
        steps,
      }),
      "ops-export-briefs",
    );
  });

  it("uses the location hash sync so direct share links open the export panel after hydration", () => {
    assert.equal(
      resolveOperationsExecutionStepIdFromLocation({
        hash: "#ops-export-briefs",
        firstStepId: "ops-monthly-action-summary",
        steps,
      }),
      "ops-export-briefs",
    );
    assert.equal(
      resolveOperationsExecutionStepIdFromLocation({
        hash: "#ops-operator-requests-panel",
        firstStepId: "ops-monthly-action-summary",
        steps,
      }),
      "ops-export-briefs",
    );
  });

  it("falls back to the first step when the hash is unknown", () => {
    assert.equal(
      resolveOperationsExecutionStepId({
        hashId: "unknown",
        firstStepId: "ops-monthly-action-summary",
        steps,
      }),
      "ops-monthly-action-summary",
    );
  });
});

/*
 * The panel used to render one body at a time, so every step but the first was
 * a header until clicked — including the per-area rules, which is the content
 * this page owns and the weekly brief was carrying a second copy of.
 */
describe("resolveInitialOpenStepIds", () => {
  const steps = [
    { id: "first", label: "A", title: "A", description: "A", children: null },
    { id: "middle", label: "B", title: "B", description: "B", children: null },
    { id: "rules", label: "C", title: "C", description: "C", defaultOpen: true, children: null },
  ];

  it("opens the first step and anything marked defaultOpen", () => {
    assert.deepEqual(resolveInitialOpenStepIds({ steps }), ["first", "rules"]);
  });

  it("adds a hash target without closing the defaults", () => {
    assert.deepEqual(
      resolveInitialOpenStepIds({ steps, hash: "#middle" }),
      ["first", "rules", "middle"],
    );
  });

  it("ignores a hash that matches no step", () => {
    assert.deepEqual(resolveInitialOpenStepIds({ steps, hash: "#nope" }), ["first", "rules"]);
  });

  it("never lists a step twice when the hash targets a default", () => {
    assert.deepEqual(resolveInitialOpenStepIds({ steps, hash: "#rules" }), ["first", "rules"]);
  });
});

/*
 * The current step is a fact assistive tech reads off `aria-current`, and the
 * owner, status and change signal are facts about the step. Neither is a
 * control, so neither is drawn as one: no "Active" stamp restating the state,
 * no pills around the facts, and no ring or gradient hairline on the card.
 */
describe("OperationsExecutionStepper markup", () => {
  const steps = [
    {
      id: "first",
      label: "A",
      title: "Weekly plan",
      description: "Plan",
      owner: "Finance",
      approvalStatus: "Ready for weekly review",
      changeSignal: "Cash posture shifts",
      children: null,
    },
    { id: "second", label: "B", title: "Share", description: "Share", children: null },
  ];

  it("carries the current step on aria-current and nowhere else", () => {
    const html = renderToStaticMarkup(createElement(OperationsExecutionStepper, { steps }));

    assert.equal((html.match(/aria-current="step"/g) ?? []).length, 1);
    assert.match(html, /id="first"[^>]*aria-current="step"|aria-current="step"[^>]*id="first"/);
    assert.doesNotMatch(html, />Active</);
    assert.doesNotMatch(html, /ring-1|bg-gradient-to-r/);
  });

  it("prints owner, status and change signal as facts, not pills", () => {
    const html = renderToStaticMarkup(createElement(OperationsExecutionStepper, { steps }));

    assert.doesNotMatch(html, /weather-pill/);
    assert.match(html, /<dt[^>]*>Owner: <\/dt><dd[^>]*>Finance<\/dd>/);
    assert.match(html, /<dd[^>]*>Ready for weekly review<\/dd>/);
    assert.match(html, /<dt[^>]*>Check again if: <\/dt><dd[^>]*>Cash posture shifts<\/dd>/);
  });
});
