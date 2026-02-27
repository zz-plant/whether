import assert from "node:assert/strict";
import { describe, it } from "node:test";
import PlanPage from "../app/plan/page";
import EvidencePage from "../app/evidence/page";

describe("legacy route canonicalization", () => {
  it("redirects /plan to /operations/plan", () => {
    assert.throws(
      () => PlanPage(),
      (error: unknown) =>
        typeof (error as { digest?: unknown })?.digest === "string" &&
        (error as { digest: string }).digest.includes("/operations/plan"),
    );
  });

  it("redirects /evidence to /signals", () => {
    assert.throws(
      () => EvidencePage(),
      (error: unknown) =>
        typeof (error as { digest?: unknown })?.digest === "string" &&
        (error as { digest: string }).digest.includes("/signals"),
    );
  });
});
