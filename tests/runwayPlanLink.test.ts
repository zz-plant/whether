import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  buildSharedRunwayPlanQuery,
  plannerEditStands,
  readSharedRunwayPlan,
  resolveSharedRunwayProfile,
} from "../app/operate/components/runwayPlanLink";
import { EMPTY_OPERATOR_PROFILE, OPERATOR_PROFILE_LIMITS } from "../lib/operatorProfile";

/**
 * A runway plan you can send someone.
 *
 * The scenario studio beside it has had `?rate=` and `?slope=` since it was
 * written and `/history/compare` takes its two months from the URL; the planner
 * kept its figures in local storage, so the one output on that page built to be
 * taken to a board meeting existed only in the browser that typed it.
 *
 * The thing worth guarding is not the round trip but the refusals: a URL is
 * written by whoever sends it, and this is the one path by which a figure could
 * reach a board memo without passing the validator the input box enforces.
 */

const profile = { ...EMPTY_OPERATOR_PROFILE, runwayMonths: 14, monthlyBurnUsd: 220000, sector: "b2b-saas" as const };

describe("shared runway plan link", () => {
  it("round-trips a plan", () => {
    const query = buildSharedRunwayPlanQuery(profile, "seed");
    const read = readSharedRunwayPlan(new URLSearchParams(query));

    assert.equal(read.profile.runwayMonths, 14);
    assert.equal(read.profile.monthlyBurnUsd, 220000);
    assert.equal(read.profile.sector, "b2b-saas");
    assert.equal(read.stage, "seed");
  });

  /*
   * `lib/operatorProfile` drops a figure outside its limits rather than
   * clamping it, because beyond them a value is a typo or a units mix-up. A
   * link must not be the way around that.
   */
  it("refuses a figure the input box would refuse", () => {
    const beyond = OPERATOR_PROFILE_LIMITS.runwayMonths.max + 1;
    const read = readSharedRunwayPlan(new URLSearchParams(`runway=${beyond}&burn=-5`));

    assert.equal(read.profile.runwayMonths, undefined, "a runway past the limit is a units mix-up, not a long runway");
    assert.equal(read.profile.monthlyBurnUsd, undefined);
  });

  it("refuses a sector or stage the dropdown does not offer", () => {
    const read = readSharedRunwayPlan(new URLSearchParams("sector=crypto&stage=unicorn"));
    assert.equal(read.profile.sector, undefined);
    assert.equal(read.stage, null);
  });

  it("ignores junk rather than treating it as zero", () => {
    const read = readSharedRunwayPlan(new URLSearchParams("runway=&burn=lots&growth=NaN"));
    assert.deepEqual(read.profile, {});
    assert.equal(read.stage, null);
  });

  it("reads the whole value or none of it, and money's own shorthand", () => {
    // parseFloat read `cash=2.1M` as $2.10 and `runway=14months` as 14.
    const read = readSharedRunwayPlan(new URLSearchParams("cash=2.1M&burn=150k&revenue=0&runway=14months&growth=12abc&margin=7O"));
    assert.deepEqual(read.profile, { cashUsd: 2_100_000, monthlyBurnUsd: 150_000, monthlyRevenueUsd: 0 });
    // A suffix means nothing on a figure that is not money.
    assert.equal(readSharedRunwayPlan(new URLSearchParams("runway=2k")).profile.runwayMonths, undefined);
  });

  it("round-trips every figure the planner writes, decimals and negatives included", () => {
    const full = {
      ...EMPTY_OPERATOR_PROFILE,
      cashUsd: 2_100_000.5,
      monthlyBurnUsd: 220_000,
      monthlyRevenueUsd: 0,
      monthlyGrowthPct: -2.5,
      grossMarginPct: 71.25,
    };
    const read = readSharedRunwayPlan(new URLSearchParams(buildSharedRunwayPlanQuery(full, null)));
    assert.deepEqual(read.profile, {
      cashUsd: 2_100_000.5,
      monthlyBurnUsd: 220_000,
      monthlyRevenueUsd: 0,
      monthlyGrowthPct: -2.5,
      grossMarginPct: 71.25,
    });
  });

  /* A half-filled planner produces a short link rather than one asserting zeros
     nobody typed — the same reason the panel refuses to size a plan until the
     three required figures are there. */
  it("omits what was never entered", () => {
    const query = buildSharedRunwayPlanQuery({ ...EMPTY_OPERATOR_PROFILE, runwayMonths: 9 }, null);
    assert.equal(query, "runway=9");
    assert.equal(buildSharedRunwayPlanQuery(EMPTY_OPERATOR_PROFILE, null), "");
  });

  /* The default stage is what a reader who has chosen nothing already has, so
     carrying it would put a parameter in every link to say nothing. */
  it("leaves the default stage out of the link", () => {
    assert.equal(buildSharedRunwayPlanQuery(EMPTY_OPERATOR_PROFILE, "series-a"), "");
    assert.equal(buildSharedRunwayPlanQuery(EMPTY_OPERATOR_PROFILE, "series-b"), "stage=series-b");
  });

  /*
   * Following a link shows the sender's plan and leaves the recipient's saved
   * figures alone. Merging in this direction is what makes that true, and it is
   * also what lets a link carry one figure without blanking the rest.
   */
  it("lets the link win where it speaks and the stored profile fill the rest", () => {
    const stored = { ...EMPTY_OPERATOR_PROFILE, runwayMonths: 30, monthlyBurnUsd: 10000 };
    const merged = resolveSharedRunwayProfile(stored, { runwayMonths: 6 });

    assert.equal(merged.runwayMonths, 6);
    assert.equal(merged.monthlyBurnUsd, 10000, "a link that says nothing about burn must not blank it");
    assert.equal(stored.runwayMonths, 30, "and the stored profile is not written by being read");
  });

  it("lets a link's runway or cash replace both of the recipient's, so one company's figures are never mixed with another's", () => {
    const storedCash = { ...EMPTY_OPERATOR_PROFILE, cashUsd: 900_000, monthlyBurnUsd: 10000 };
    const fromRunwayLink = resolveSharedRunwayProfile(storedCash, { runwayMonths: 6 });
    assert.equal(fromRunwayLink.runwayMonths, 6);
    assert.equal(fromRunwayLink.cashUsd, undefined, "the recipient's cash would otherwise outrank the sender's runway");

    const storedRunway = { ...EMPTY_OPERATOR_PROFILE, runwayMonths: 30 };
    const fromCashLink = resolveSharedRunwayProfile(storedRunway, { cashUsd: 400_000 });
    assert.equal(fromCashLink.cashUsd, 400_000);
    assert.equal(fromCashLink.runwayMonths, undefined);

    assert.equal(resolveSharedRunwayProfile(storedCash, { monthlyRevenueUsd: 5 }).cashUsd, 900_000);
  });

  it("carries the company's own runway lines, so the people it is sent to see the lines agreed", () => {
    const query = buildSharedRunwayPlanQuery({ ...EMPTY_OPERATOR_PROFILE, raiseAtRunwayMonths: 12, hiringPauseAtRunwayMonths: 9 }, null);
    assert.equal(query, "raiseAt=12&hirePauseAt=9");
    const read = readSharedRunwayPlan(new URLSearchParams(query)).profile;
    assert.equal(read.raiseAtRunwayMonths, 12);
    assert.equal(read.hiringPauseAtRunwayMonths, 9);
    assert.equal(readSharedRunwayPlan(new URLSearchParams("raiseAt=0")).profile.raiseAtRunwayMonths, undefined);
  });

  it("carries cash as a short param and round-trips it", () => {
    const query = buildSharedRunwayPlanQuery({ ...EMPTY_OPERATOR_PROFILE, cashUsd: 2_100_000 }, null);
    assert.equal(query, "cash=2100000");
    assert.equal(readSharedRunwayPlan(new URLSearchParams(query)).profile.cashUsd, 2_100_000);
  });

  /*
   * The planner's projects travel with the plan, one `project` per row. A
   * figure outside its limits is dropped like any other, and the row stays.
   */
  it("carries the engineer-week cost and each project row, blank rows included", () => {
    const query = buildSharedRunwayPlanQuery(
      {
        ...EMPTY_OPERATOR_PROFILE,
        engineerWeekCostUsd: 4500,
        paybackProjects: [{ name: "Importer_v2", weeksToShip: 6, engineers: 2, hoursSavedPerMonth: 160, hourlyCostUsd: 80 }, {}],
      },
      null,
    );
    const read = readSharedRunwayPlan(new URLSearchParams(query));
    assert.equal(read.profile.engineerWeekCostUsd, 4500);
    assert.deepEqual(read.profile.paybackProjects, [
      { name: "Importer_v2", weeksToShip: 6, engineers: 2, hoursSavedPerMonth: 160, hourlyCostUsd: 80 },
      {},
    ]);
    assert.match(query, /project=6_2_160_80__Importer_v2&project=_____/, "the link reads as typed, with no escaped separators");
    assert.equal(readSharedRunwayPlan(new URLSearchParams("engWeek=4.5k")).profile.engineerWeekCostUsd, 4500);
  });

  it("drops a project's out-of-range or malformed figure and keeps the rest of the row", () => {
    const read = readSharedRunwayPlan(new URLSearchParams("project=6_500_12abc_80__Importer"));
    assert.deepEqual(read.profile.paybackProjects, [{ name: "Importer", weeksToShip: 6, hourlyCostUsd: 80 }]);
    const many = new URLSearchParams(Array.from({ length: 6 }, (_, index) => ["project", `${index + 1}_1____`]));
    assert.equal(readSharedRunwayPlan(many).profile.paybackProjects?.length, 4);
  });

  /*
   * `router.replace` lands a server round trip after an edit. Read back as "the
   * link wins", the link before it was the base the next edit was built on, so a
   * second field typed inside that trip wrote the first back to its old value.
   */
  it("keeps an edit over the address bar until the bar shows the edit's own address", () => {
    const queries = ["runway=11", "runway=11&engWeek=4500", "runway=11&engWeek=4500&project=4_____"];
    assert.equal(plannerEditStands(queries, "runway=11"), true, "nothing has landed yet");
    assert.equal(plannerEditStands(queries, "runway=11&engWeek=4500"), true, "an earlier write landed; the last has not");
    assert.equal(plannerEditStands(queries, "runway=11&engWeek=4500&project=4_____"), false, "caught up: the link says the same");
    assert.equal(plannerEditStands(queries, "runway=20"), false, "someone else's link, which wins");
  });

  it("resolves precedence in render rather than racing effects", async () => {
    const panel = await readFile("app/operate/components/runwayPlannerPanel.tsx", "utf8");
    assert.match(panel, /const linkedProfile = useMemo\(\(\) => resolveSharedRunwayProfile\(storedProfile, shared\.profile\)/);
    /* An edit made here stands until the address bar catches up with it: the
       link it replaced is not a base for the next edit (2026-10-13). */
    assert.match(panel, /const profile = ownEdit\?\.profile \?\? linkedProfile;/);
    assert.match(panel, /const stage = ownEdit \? ownEdit\.stage : shared\.stage \?\? storedStage;/);
    /* replace, not push: a history entry per keystroke in a number field turns
       the back button into a rubout key. */
    assert.match(panel, /router\.replace\(/);
    assert.doesNotMatch(panel, /router\.push\(/);
  });
});
