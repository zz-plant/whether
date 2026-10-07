import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { buildReportDataFixture } from "./fixtures/reportFixtures";

/*
 * `/api/scores` answered `recordDate: "Oct 9, 2026"` for the Oct 5, 2026 reading:
 * it read the weekly card's `artifact.recordDateLabel`, which the card fills with
 * the week-ending Friday. The record date is the report shell's.
 *
 * The route reads the homepage through `unstable_cache`, which has no cache to
 * read offline, so the route itself does not run in this suite (see
 * docs/agents/lessons/tests-and-copy-rules.md). The two labels are checked on the
 * assembled model, and the route's choice between them at source level.
 */
describe("/api/scores recordDate", () => {
  it("is the reading's record date, not the card's week-ending label", async () => {
    const reportData = buildReportDataFixture();
    const homepage = await assembleHomePage(
      { searchParams: undefined },
      { loadHomePageReportData: async () => ({ ok: true, data: reportData }) },
    );

    assert.equal(homepage.reportShell.recordDateLabel, reportData.recordDateLabel);
    assert.equal(homepage.weeklyDecisionCardModel.artifact.recordDateLabel, reportData.weeklyRecordDateLabel);
    assert.notEqual(reportData.recordDateLabel, reportData.weeklyRecordDateLabel);

    const source = readFileSync(new URL("../app/api/scores/route.ts", import.meta.url), "utf8");
    assert.match(source, /recordDate: homepage\.reportShell\.recordDateLabel,/);
    assert.doesNotMatch(source, /recordDate: model\.artifact\./);
  });
});
