import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { buildMondayCalendarUrl } from "../app/components/calendarButton";

describe("buildMondayCalendarUrl", () => {
  /**
   * The link renders on the server (UTC) and hydrates in the reader's zone.
   * Local date getters gave the two sides different days after 7pm Central,
   * and React flagged the href as a hydration mismatch on every evening load
   * of the homepage. The times carry a Z, so the date must be UTC too.
   */
  it("dates the event by the UTC calendar day, matching the Z-suffixed times", () => {
    const url = new URL(buildMondayCalendarUrl());
    const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    assert.equal(url.searchParams.get("dates"), `${today}T130000Z/${today}T133000Z`);
  });

  it("produces the same href whatever zone the process runs in", () => {
    const previous = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Kiritimati";
      const east = buildMondayCalendarUrl();
      process.env.TZ = "Pacific/Pago_Pago";
      const west = buildMondayCalendarUrl();
      assert.equal(east, west);
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });

  it("keeps the weekly Monday recurrence and the shared title", () => {
    const url = new URL(buildMondayCalendarUrl("Sync", "Details"));
    assert.equal(url.searchParams.get("text"), "Sync");
    assert.equal(url.searchParams.get("details"), "Details");
    assert.equal(url.searchParams.get("recur"), "RRULE:FREQ=WEEKLY;BYDAY=MO");
  });
});
