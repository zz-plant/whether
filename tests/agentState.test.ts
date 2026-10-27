import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET as getAgent } from "../app/api/agent/route";
import { loadAgentInterfaceContext, type AgentInterfaceContext } from "../lib/agentInterface";
import { agentStateSchema, buildAgentState, nextWeeklyCallDue } from "../lib/agentState";
import { buildCliStatusContract } from "../lib/cli/contracts";
import { resolvePublishedConfidence } from "../lib/report/confidence";
import { asLiveMacroSeries } from "./fixtures/reportFixtures";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * The state is what an agent decides from, so it has to hold up against the page's own
 * numbers: each score against the line it is held to, what its move is made of, and whether
 * it is sound to act on at all.
 */

const MS_PER_DAY = 86_400_000;

const withScores = (context: AgentInterfaceContext, scores: { tightness: number; riskAppetite: number }): AgentInterfaceContext => ({
  ...context,
  reportData: {
    ...context.reportData,
    assessment: {
      ...context.reportData.assessment,
      scores: { ...context.reportData.assessment.scores, ...scores },
    },
  },
});

/** A reading as a live fetch would leave it, dated `recordDate`. */
const asLiveReading = (context: AgentInterfaceContext, recordDate: string): AgentInterfaceContext => ({
  ...context,
  degraded: false,
  reportData: {
    ...context.reportData,
    treasury: {
      ...context.reportData.treasury,
      isLive: true,
      fallback_at: null,
      fallback_reason: null,
      record_date: recordDate,
    },
    macroSeries: asLiveMacroSeries(context.reportData.macroSeries),
  },
});

describe("the agent state", () => {
  it("fits its published schema, with nothing the schema does not describe", async () => {
    const state = buildAgentState(await loadAgentInterfaceContext("test"));

    assert.deepEqual(agentStateSchema.parse(state), state);
  });

  it("agrees with the page on the conditions, the confidence and both scores", async () => {
    const context = await loadAgentInterfaceContext("test");
    const { assessment, treasury } = context.reportData;
    const published = resolvePublishedConfidence({ assessment, record: treasury });
    const state = buildAgentState(context);

    assert.equal(state.conditions.key, assessment.regime);
    assert.equal(state.confidence.label, published.label);
    assert.equal(state.confidence.percent, published.percent);
    assert.equal(state.scores.tightness.value, assessment.scores.tightness);
    assert.equal(state.scores.riskAppetite.value, assessment.scores.riskAppetite);
    assert.ok(state.headline.includes(state.conditions.label), "the sentence names the conditions");
    assert.ok(state.headline.includes(state.recordDate), "and the reading it is about");
  });

  it("puts each score against its own lines, and says which side of a line pauses", async () => {
    const context = await loadAgentInterfaceContext("test");
    const baseline = buildAgentState(context);
    const tightnessLine = baseline.scores.tightness.pause?.line;
    const riskLine = baseline.scores.riskAppetite.pause?.line;
    assert.ok(tightnessLine !== undefined && riskLine !== undefined, "the fixture week states a pause line for both scores");

    // Funding pressure pauses above its line; risk appetite pauses below its line.
    const pastBoth = buildAgentState(withScores(context, { tightness: tightnessLine + 5, riskAppetite: riskLine - 5 }));
    assert.deepEqual(pastBoth.scores.tightness.pause, { line: tightnessLine, distance: 5, side: "above", met: true });
    assert.deepEqual(pastBoth.scores.riskAppetite.pause, { line: riskLine, distance: 5, side: "below", met: true });
    assert.match(pastBoth.headline, /5 above its pause line of \d+, so the pause applies/);

    const insideBoth = buildAgentState(withScores(context, { tightness: tightnessLine - 5, riskAppetite: riskLine + 5 }));
    assert.deepEqual(insideBoth.scores.tightness.pause, { line: tightnessLine, distance: 5, side: "below", met: false });
    assert.deepEqual(insideBoth.scores.riskAppetite.pause, { line: riskLine, distance: 5, side: "above", met: false });
    assert.doesNotMatch(insideBoth.headline, /so the pause applies/);

    const onTheLine = buildAgentState(withScores(context, { tightness: tightnessLine, riskAppetite: riskLine }));
    assert.equal(onTheLine.scores.tightness.pause?.side, "at");
    assert.equal(onTheLine.scores.tightness.pause?.distance, 0);
  });

  it("puts each score against the line where the conditions themselves change", async () => {
    const context = await loadAgentInterfaceContext("test");
    const { thresholds, scores } = context.reportData.assessment;
    const state = buildAgentState(context);

    assert.equal(state.scores.tightness.change.line, thresholds.tightnessRegime);
    assert.equal(state.scores.tightness.change.distance, Math.abs(scores.tightness - thresholds.tightnessRegime));
    assert.equal(state.scores.riskAppetite.change.line, thresholds.riskAppetiteRegime);
    assert.equal(state.scores.riskAppetite.change.distance, Math.abs(scores.riskAppetite - thresholds.riskAppetiteRegime));
  });

  it("names what each move is made of and says it per week, against the reading it was measured from", async () => {
    const state = buildAgentState(await loadAgentInterfaceContext("test"));
    const compared = state.change.comparedWith;
    assert.ok(compared, "the fixture week has a comparison");
    const days = (Date.parse(state.recordDate) - Date.parse(compared.recordDate)) / MS_PER_DAY;

    assert.equal(state.change.days, days);
    for (const score of [state.scores.tightness, state.scores.riskAppetite]) {
      assert.ok(score.delta !== null && score.previous !== null && score.perWeek !== null, `${score.label} has a move`);
      assert.ok(Math.abs(score.previous + score.delta - score.value) < 0.11, `${score.label}: was, plus the move, is today's score`);
      assert.equal(score.perWeek, Math.round(((score.delta * 7) / days) * 10) / 10, `${score.label}: per week is the move over the days`);
      const parts = score.moved.reduce((sum, part) => sum + part.points, 0);
      assert.ok(score.moved.length === 0 || Math.abs(parts - score.delta) < 0.11, `${score.label}: the parts add up to the move`);
    }
  });

  it("says what the change did to the decisions, from the same lines the scores are read against", async () => {
    const context = await loadAgentInterfaceContext("test");
    const state = buildAgentState(context);

    assert.match(state.change.summary ?? "", /^Since [A-Z][a-z]{2} \d{1,2}, /, "the summary names the reading it is against");
    for (const group of state.change.crossed) {
      assert.ok(group.areas.length > 0 && group.because.length > 0, "a group names its areas and the lines that decided it");
      for (const line of group.because) {
        // A pause moved on a pause line and a resume moved on a resume line: the ones in `scores`.
        const named = group.moved === "paused" || group.moved === "lifted" ? state.scores[line.score].pause : state.scores[line.score].resume;
        assert.equal(line.line, named?.line, `${group.moved} on ${line.score} names the line the score is read against`);
      }
    }

    // A week that moved nothing across a line says so once, and lists no area.
    const held = buildAgentState({
      ...context,
      reportData: {
        ...context.reportData,
        reportDynamics: { ...context.reportData.reportDynamics, directionLabel: "stable", changedSignals: [], anomalySignals: [], movement: undefined },
      },
    });
    assert.match(held.change.summary ?? "", /^Conditions held steady since [A-Z][a-z]{2} \d{1,2}; no pause or resume line was crossed\. The guidance stands\.$/);
    assert.deepEqual(held.change.crossed, []);
  });

  it("says nothing about movement when nothing was compared, rather than a move of zero", async () => {
    const context = await loadAgentInterfaceContext("test");
    const uncompared: AgentInterfaceContext = {
      ...context,
      reportData: {
        ...context.reportData,
        reportDynamics: {
          ...context.reportData.reportDynamics,
          directionLabel: "unavailable",
          changedSignals: [],
          anomalySignals: [],
          comparedWith: undefined,
          movement: undefined,
        },
      },
    };
    const state = buildAgentState(uncompared);

    for (const score of [state.scores.tightness, state.scores.riskAppetite]) {
      assert.deepEqual(
        { previous: score.previous, delta: score.delta, perWeek: score.perWeek, moved: score.moved },
        { previous: null, delta: null, perWeek: null, moved: [] },
        score.label,
      );
    }
    assert.deepEqual(state.change, {
      direction: "unavailable",
      regimeChanged: state.change.regimeChanged,
      comparedWith: null,
      days: null,
      note: null,
      summary: null,
      crossed: [],
    });
  });

  it("names the next Monday 14:00 UTC publication, strictly after now", () => {
    assert.equal(nextWeeklyCallDue(new Date("2026-10-19T13:59:00Z")), "2026-10-19T14:00:00.000Z");
    assert.equal(nextWeeklyCallDue(new Date("2026-10-19T14:00:00Z")), "2026-10-26T14:00:00.000Z");
    assert.equal(nextWeeklyCallDue(new Date("2026-10-25T23:00:00Z")), "2026-10-26T14:00:00.000Z");
  });

  it("says the data is live and current only for a live reading that is recent", async () => {
    const context = await loadAgentInterfaceContext("test");
    const now = new Date("2026-09-29T12:00:00Z");
    const live = asLiveReading(context, "2026-09-25");

    const ready = buildAgentState(live, now);
    assert.deepEqual(ready.automation, { ready: true, refusal: null });
    assert.deepEqual(ready.freshness, { fetchedAt: live.reportData.treasury.fetched_at, recordAgeDays: 4, live: true, fallback: false, nextCallDue: "2026-10-05T14:00:00.000Z" });
    assert.match(ready.headline, /The data is live and current\.$/);

    const savedCopy = buildAgentState(
      { ...live, reportData: { ...live.reportData, treasury: { ...live.reportData.treasury, isLive: false, fallback_reason: "FRED unreachable" } } },
      now,
    );
    assert.equal(savedCopy.automation.ready, false);
    assert.match(savedCopy.automation.refusal ?? "", /fallback snapshot.*FRED unreachable/);
    assert.equal(savedCopy.freshness.fallback, true);
    assert.match(savedCopy.headline, /Do not automate on this: Data is a fallback snapshot/);

    const stale = buildAgentState(live, new Date("2026-10-20T12:00:00Z"));
    assert.equal(stale.automation.ready, false);
    assert.match(stale.automation.refusal ?? "", /25 days old/);
    assert.equal(stale.freshness.recordAgeDays, 25);

    const cachedMacro = buildAgentState(
      {
        ...live,
        reportData: {
          ...live.reportData,
          macroSeries: live.reportData.macroSeries.map((series) =>
            series.id === "VIX_INDEX" ? { ...series, isLive: false } : series,
          ),
        },
      },
      now,
    );
    assert.equal(cachedMacro.automation.ready, false);
    assert.match(cachedMacro.automation.refusal ?? "", /Macro inputs are snapshot values/);

    const degraded = buildAgentState({ ...live, degraded: true }, now);
    assert.equal(degraded.automation.ready, false);
    assert.match(degraded.automation.refusal ?? "", /assembly failed/);
  });

  it("carries the use limits and the ways to read more", async () => {
    const state = buildAgentState(await loadAgentInterfaceContext("test"));

    assert.match(state.use.humanReview, /Human review is required/);
    assert.match(state.links.full, /\/api\/agent\?cadence=weekly$/);
    assert.match(state.links.brief, /\/brief\.md$/);
  });
});

describe("/api/agent?view=state", () => {
  const get = (query: string) => getAgent(new Request(`https://whether.work/api/agent${query}`));

  it("serves the state, at a fraction of the full brief's size", async () => {
    const response = await get("?view=state");
    const body = await response.text();
    const full = await (await get("")).text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
    agentStateSchema.parse(JSON.parse(body));
    assert.ok(body.length * 4 < full.length, `the state (${body.length}B) is under a quarter of the full brief (${full.length}B)`);
  });

  it("leaves the full brief the default", async () => {
    const asked = await (await get("?view=full")).json();
    const bare = await (await get("")).json();

    assert.equal(asked.version, "v1");
    assert.deepEqual(Object.keys(asked).sort(), Object.keys(bare).sort());
    assert.ok("agentHandoff" in bare, "the brief, not the state");
  });

  it("names the views there are when asked for one there is not", async () => {
    const response = await get("?view=compact");
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body.allowedViews, ["full", "state"]);
  });

  it("does not mix with the Jev request, which carries its own state", async () => {
    const response = await get("?view=state&format=jev");

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /view=state cannot be combined with format=jev/);
  });

  it("takes no other cadence, instead of answering the weekly state under another name", async () => {
    const monthly = await get("?view=state&cadence=monthly");
    assert.equal(monthly.status, 400);
    assert.deepEqual((await monthly.json()).allowedCadences, ["weekly"]);

    const weekly = await get("?view=state&cadence=weekly");
    assert.equal(weekly.status, 200);

    const bogus = await get("?view=state&cadence=hourly");
    assert.equal(bogus.status, 400);
  });
});

/* `/api/cli/status` predates the state and overlaps it. Its guidance is the state's, read by the
   same builder under the names the CLI had first, so the two cannot disagree about one reading. */
describe("the CLI status beside the state", () => {
  it("prints the state's guidance, conditions and confidence for the same reading", async () => {
    const context = await loadAgentInterfaceContext("test");
    const state = buildAgentState(context);
    const status = buildCliStatusContract(context);

    assert.deepEqual(status.call, {
      summary: state.guidance.call,
      do: state.guidance.doNow,
      avoid: state.guidance.avoidNow,
      flipConditions: state.guidance.flipConditions,
    });
    assert.equal(status.regime, state.conditions.label);
    assert.deepEqual(status.confidence, { label: state.confidence.label, score: state.confidence.percent });
    assert.equal(status.updatedAt, state.freshness.fetchedAt);
  });
});
