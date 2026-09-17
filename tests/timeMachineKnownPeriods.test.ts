import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { KNOWN_PERIODS } from "../app/components/TimeMachineCalendarPicker";
import { hasTimeMachineEntry } from "../lib/timeMachine/timeMachineCache";
import { resolveTimeMachineSelection } from "../lib/timeMachine/timeMachineSelection";
import { getMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";

/*
 * The picker offers four months by name above its trailing three-year grid.
 * Each one sends the reader to `/?month=&year=`, and `resolveTimeMachineSelection`
 * checks coverage before honouring that — so a preset outside the snapshot
 * store would silently land on the live brief with no archived banner, which
 * is the one outcome a "replay" chip cannot have. Asserted against the store
 * and the resolver rather than the chip's own list.
 */
describe("time machine known periods", () => {
  it("every offered period resolves to an archived brief, not the live one", () => {
    for (const period of KNOWN_PERIODS) {
      assert.ok(
        hasTimeMachineEntry(period.year, period.month),
        `${period.label} (${period.year}-${period.month}) has no snapshot`,
      );
      const selection = resolveTimeMachineSelection({
        month: String(period.month),
        year: String(period.year),
      });
      assert.ok(selection, `${period.label} does not resolve to a historical selection`);
      assert.equal(selection.year, period.year);
      assert.equal(selection.month, period.month);
    }
  });

  it("every offered period has a recorded call to print on its chip", () => {
    const history = getMonthlyRegimeHistory();
    for (const period of KNOWN_PERIODS) {
      const entry = history.find((candidate) => {
        const date = new Date(candidate.record_date);
        return date.getUTCFullYear() === period.year && date.getUTCMonth() + 1 === period.month;
      });
      assert.ok(entry, `${period.label} has no month in the regime history`);
    }
  });

  it("describes each period by what happened, not by how it felt", () => {
    // Editorial guardrails: no fear-based or sensational copy on a product surface.
    for (const period of KNOWN_PERIODS) {
      assert.doesNotMatch(period.label, /crash|crisis|panic|collapse|meltdown|iconic/i, period.label);
    }
  });
});
