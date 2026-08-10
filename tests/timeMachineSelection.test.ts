import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
  parseTimeMachineRequest,
} from "../lib/timeMachine/timeMachineSelection";

describe("time machine selection helpers", () => {
  it("parses valid month/year requests", () => {
    assert.deepEqual(parseTimeMachineRequest({ month: "5", year: "2024" }), {
      month: 5,
      year: 2024,
    });
  });

  it("returns null for invalid month/year inputs", () => {
    assert.equal(parseTimeMachineRequest({ month: "13", year: "2024" }), null);
    assert.equal(parseTimeMachineRequest({ month: "5", year: "1999" }), null);
    assert.equal(parseTimeMachineRequest({ month: "foo", year: "2024" }), null);
  });

  it("appends month/year params to handoff links", () => {
    assert.equal(
      buildTimeMachineHref("/operate", { month: 3, year: 2023 }),
      "/operate?month=3&year=2023"
    );
  });

  it("preserves existing query/hash while overriding month/year", () => {
    assert.equal(
      buildTimeMachineHref(
        "/planning?tab=checklist&month=1&year=2020#ops-playbook",
        { month: 7, year: 2025 }
      ),
      "/planning?tab=checklist&month=7&year=2025#ops-playbook"
    );
  });

  it("returns previous snapshot when one exists", () => {
    assert.deepEqual(getAdjacentTimeMachineRequest({ month: 10, year: 2024 }, "previous"), {
      month: 9,
      year: 2024,
    });
  });

});
