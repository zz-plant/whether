import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveOperationsExecutionStepId } from "../app/operations/components/operationsExecutionStepper";

describe("resolveOperationsExecutionStepId", () => {
  const steps = [
    {
      id: "ops-monthly-action-summary",
      label: "Plan",
      title: "Weekly plan",
      description: "Plan",
      summary: "Plan",
      hashAliases: ["ops-monthly-action-summary-panel"],
      children: null,
    },
    {
      id: "ops-export-briefs",
      label: "Share",
      title: "Share brief",
      description: "Share",
      summary: "Share",
      hashAliases: ["ops-export-briefs-panel", "ops-operator-requests", "ops-operator-requests-panel"],
      children: null,
    },
  ];

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
