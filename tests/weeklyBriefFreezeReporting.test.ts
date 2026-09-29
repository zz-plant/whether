import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "bun:test";
import { z } from "zod";
import { PublishedBriefSchema, type PublishedBrief } from "../lib/report/publishedBriefs";

/* bun's typings omit `mock.module`; the hero suites take the same escape hatch. */
const mockAny: any = mock;

/* `cloudflare:workers` only resolves inside the Workers runtime, so this file
   supplies the one export it imports. Installed here rather than relied on from
   another suite, for the reason decisionHeroSignalBreakdown records: a
   process-wide module mock makes a file pass by ordering luck otherwise. */
mockAny.module("cloudflare:workers", () => ({
  WorkflowEntrypoint: class {
    protected env: unknown;
    constructor(_ctx: unknown, env: unknown) {
      this.env = env;
    }
  },
}));

/*
 * The trial could not conclude, because nothing recorded what the workflow did.
 *
 * The Monday cron calls `create()` on the Workflow and logs a `cron-step` row
 * the moment that resolves — which is before the freeze has read anything. The
 * workflow then ran for up to five hourly retries and reported nowhere. So the
 * trust page's "Scheduled runs" showed a green Monday row whether the week was
 * frozen, refused as stale, or given up on, and `data/published_briefs.json`
 * sitting at one week was the only signal that something was wrong. A step that
 * reports success for work it did not observe is worse than one that reports
 * nothing, because it gets read as evidence.
 */

type AnalyticsRow = { indexes?: string[]; blobs?: string[] };

const cronStepSchema = z.object({
  step: z.string(),
  ok: z.boolean(),
  error: z.string().optional(),
  detail: z.string().optional(),
});

const installAnalyticsCapture = (): AnalyticsRow[] => {
  const rows: AnalyticsRow[] = [];
  Reflect.set(globalThis, "ANALYTICS", { writeDataPoint: (row: AnalyticsRow) => rows.push(row) });
  return rows;
};

/** The `cron-step` rows captured, parsed rather than asserted into shape. */
const cronSteps = (rows: AnalyticsRow[]) =>
  rows
    .filter((row) => row.indexes?.[0] === "cron-step")
    .flatMap((row) => {
      const parsed = cronStepSchema.safeParse(JSON.parse(row.blobs?.[1] ?? "{}"));
      return parsed.success ? [parsed.data] : [];
    });

/** Runs each step inline. The real runner adds retries and durability, neither of which this measures. */
const inlineSteps = {
  do: <T,>(_name: string, optionsOrRun: (() => Promise<T>) | object, run?: () => Promise<T>): Promise<T> => {
    if (typeof optionsOrRun === "function") return optionsOrRun();
    if (!run) throw new Error("step.do was called with options but no body");
    return run();
  },
  /* Part of the interface; the freeze never sleeps, and a call would be a change worth noticing. */
  sleep: () => {
    throw new Error("the freeze workflow does not sleep");
  },
};

type AssembleResult = Awaited<ReturnType<WeeklyBriefFreeze["assembleWeek"]>>;
type WeeklyBriefFreeze = InstanceType<
  Awaited<typeof import("../worker/workflows/weeklyBriefFreeze")>["WeeklyBriefFreezeWorkflow"]
>;

/* The live read is overridden by subclassing the workflow's own seam. `mock.module`
   on `publishedBriefRecord` would patch the registry process-wide and broke
   publishedBriefPullRequest.test.ts the moment both files ran, which is the hazard
   docs/agents/lessons/automation-and-deploy-gate.md records for this suite. */
const freezeWorkflow = async (env: Record<string, unknown>, assemble: () => Promise<AssembleResult>) => {
  const { WeeklyBriefFreezeWorkflow } = await import("../worker/workflows/weeklyBriefFreeze");
  class StubbedFreeze extends WeeklyBriefFreezeWorkflow {
    protected override assembleWeek() {
      return assemble();
    }
  }
  const ctx: ConstructorParameters<typeof WeeklyBriefFreezeWorkflow>[0] = {
    waitUntil: () => {},
    passThroughOnException: () => {},
    props: {},
    exports: {},
  };
  return new StubbedFreeze(ctx, env);
};

const runFreeze = (workflow: WeeklyBriefFreeze) => {
  const event: Parameters<WeeklyBriefFreeze["run"]>[0] = {
    payload: { base: "main" },
    timestamp: new Date(),
    instanceId: "test",
  };
  return workflow.run(event, inlineSteps);
};

/* Parsed by the real schema, so a shape drift fails here rather than passing a
   hand-rolled object the production type would reject. */
const publishedBriefFixture: PublishedBrief = PublishedBriefSchema.parse({
  slug: "2026-w38",
  year: 2026,
  week: 38,
  publishedAt: "2026-09-14T00:00:00.000Z",
  recordDate: "2026-09-14",
  recordDateLabel: "Sep 14, 2026",
  headline: "Cloudy — week of Sep 14, 2026",
  summary: "Hold the line.",
  postureLabel: "Cloudy",
  regime: "VOLATILE",
  confidenceLabel: "MED",
  whatChanged: "Nothing material.",
  actionNow: "Hold.",
  guardrailThreshold: "Pause above 85.",
  flipThreshold: "Re-open below 65.",
  decisions: [],
  evidence: [],
  sourceLabel: "US Treasury via FRED",
  sourceUrl: "https://fred.stlouisfed.org/",
  freshnessLabel: "Fresh",
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "ANALYTICS");
});

describe("weekly brief freeze reporting", () => {
  it("records a failed outcome when the week is not publishable", async () => {
    const rows = installAnalyticsCapture();
    const workflow = await freezeWorkflow({ GITHUB_TOKEN: "t" }, async () => ({
      ok: false,
      reason: "live data unavailable",
      recordDate: "2026-09-14",
    }));

    await assert.rejects(() => runFreeze(workflow));

    const steps = cronSteps(rows);
    const outcome = steps.find((step) => step.step === "brief-freeze");
    assert.ok(outcome, `no brief-freeze row written; saw ${JSON.stringify(steps)}`);
    assert.equal(outcome?.ok, false);
    assert.match(outcome?.error ?? "", /not ready to publish/);
  });

  /*
   * The token is checked before the live read, not between the read and the pull
   * request, and that ordering is the assertion. It is what lets the flag and the
   * secret be set in either order when the freeze is promoted out of the preview
   * lane: below the assemble step, a run missing the token spends a live provider
   * read and — when the week is not publishable yet — five hourly retries before
   * reporting a fact that was already true at hand-off. `assembleWeek` never being
   * called is what pins that.
   */
  it("refuses before reading anything when the token needed to open the pull request is absent", async () => {
    const rows = installAnalyticsCapture();
    let assembleCalls = 0;
    const workflow = await freezeWorkflow({}, async () => {
      assembleCalls += 1;
      return { ok: true, slug: "2026-w38", recordDate: "2026-09-14", record: publishedBriefFixture };
    });

    await assert.rejects(() => runFreeze(workflow));

    assert.equal(assembleCalls, 0, "the live read ran before the configuration it depends on was checked");
    const outcome = cronSteps(rows).find((step) => step.step === "brief-freeze");
    assert.equal(outcome?.ok, false);
    assert.match(outcome?.error ?? "", /GITHUB_TOKEN/);
  });
});
