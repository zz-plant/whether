import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildOperationsExecutionStepHref,
  resolveOperationsExecutionStepActionLabel,
  resolveOperationsExecutionStepReturnLabel,
  resolveOperationsExecutionStepId,
} from "../app/planning/components/planningExecutionStepper";

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
    assert.equal(resolveOperationsExecutionStepReturnLabel(), "Back to steps");
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
