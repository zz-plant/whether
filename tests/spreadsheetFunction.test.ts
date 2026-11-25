import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { describe, it } from "bun:test";
import type { z } from "zod";
import { GET as getAgent } from "../app/api/agent/route";
import { loadAgentInterfaceContext } from "../lib/agentInterface";
import { agentStateSchema, buildAgentState } from "../lib/agentState";
import { areaLinesFromActionStrip, areaStateAt } from "../lib/report/decisionMovement";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * The Google Sheets function (`docs/developer/spreadsheets/whether.gs`) reads the state over
 * HTTP in a runtime this repo never builds or type-checks. These tests run that file as written,
 * with Apps Script's two services stubbed, against the state the route serves, so a key that
 * points at a field the payload no longer has fails here and not in someone's spreadsheet.
 */

type AgentState = z.infer<typeof agentStateSchema>;
type ScoreState = AgentState["scores"]["tightness"];

const SCRIPT_PATH = "docs/developer/spreadsheets/whether.gs";
const DOC_PATH = "docs/developer/spreadsheets/README.md";
const STATE_URL = "https://whether.work/api/agent?view=state";

/* What each key should read, through the schema's own types: a field renamed in `agentStateSchema` fails typecheck here. */
const READS: Record<string, (state: AgentState) => unknown> = {
  regime: (state) => state.conditions.key,
  conditions: (state) => state.conditions.label,
  headline: (state) => state.headline,
  guidance: (state) => state.guidance.call,
  do_now: (state) => state.guidance.doNow,
  avoid_now: (state) => state.guidance.avoidNow,
  flip_conditions: (state) => state.guidance.flipConditions,
  confidence: (state) => state.confidence.label,
  confidence_percent: (state) => state.confidence.percent,
  record_date: (state) => state.recordDate,
  next_call_due: (state) => state.freshness.nextCallDue,
  automation_ready: (state) => state.automation.ready,
  automation_refusal: (state) => state.automation.refusal,
  direction: (state) => state.change.direction,
  regime_changed: (state) => state.change.regimeChanged,
  change_summary: (state) => state.change.summary,
  tightness: (state) => state.scores.tightness.value,
  risk_appetite: (state) => state.scores.riskAppetite.value,
};

const PER_SCORE_READS: Record<string, (score: ScoreState) => unknown> = {
  score: (score) => score.value,
  pause_line: (score) => score.pause?.line ?? null,
  pause_met: (score) => score.pause?.met ?? null,
  resume_line: (score) => score.resume?.line ?? null,
  resume_met: (score) => score.resume?.met ?? null,
  change_line: (score) => score.change.line,
  delta: (score) => score.delta,
  per_week: (score) => score.perWeek,
};

const SCORE_ARGUMENTS = [
  ["tightness", "tightness"],
  ["risk_appetite", "riskAppetite"],
] as const;

/** What a cell shows for a payload value: blank for null or an empty list, a column for a list. */
const asCell = (value: unknown): unknown => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.length === 0 ? "" : value.map((item) => [item]);
  return value;
};

/* Values made inside the script's context carry its Array prototype; compare them as data. */
const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

type Script = {
  WHETHER: (key?: unknown, score?: unknown) => unknown;
  whetherValue_: (state: unknown, key?: unknown, score?: unknown) => unknown;
  keys: Record<string, string>;
  fetches: string[];
};

/** Runs the script file in a fresh context, with UrlFetchApp answering `body` and an in-memory script cache. */
const loadScript = (body: string, status = 200): Script => {
  const fetches: string[] = [];
  const store = new Map<string, string>();
  const sandbox = createContext({
    UrlFetchApp: {
      fetch: (url: string) => {
        fetches.push(url);
        return { getResponseCode: () => status, getContentText: () => body };
      },
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key: string) => store.get(key) ?? null,
        put: (key: string, value: string) => void store.set(key, value),
      }),
    },
  });
  const exported: unknown = runInContext(
    `${readFileSync(SCRIPT_PATH, "utf8")}\n;({ WHETHER, whetherValue_, keys: WHETHER_KEYS_ });`,
    sandbox,
    { filename: SCRIPT_PATH },
  );
  assert.ok(exported !== null && typeof exported === "object", "the script evaluates to its exports");
  const WHETHER: unknown = Reflect.get(exported, "WHETHER");
  const whetherValue_: unknown = Reflect.get(exported, "whetherValue_");
  const keys: unknown = Reflect.get(exported, "keys");
  assert.ok(typeof WHETHER === "function" && typeof whetherValue_ === "function", "the script defines WHETHER and whetherValue_");
  assert.ok(keys !== null && typeof keys === "object", "the script defines WHETHER_KEYS_");
  const keyMap = Object.fromEntries(Object.entries(keys).map(([key, path]) => [key, String(path)]));
  return {
    WHETHER: (key, score) => WHETHER(key, score),
    whetherValue_: (state, key, score) => whetherValue_(state, key, score),
    keys: keyMap,
    fetches,
  };
};

/** The state as the route serves it, fetched by the URL the script fetches, read once per file. */
let servedOnce: Promise<{ body: string; state: AgentState }> | undefined;
const serve = () =>
  (servedOnce ??= (async () => {
    const response = await getAgent(new Request(STATE_URL));
    assert.equal(response.status, 200, "the URL the script fetches is answered by the state route");
    const body = await response.text();
    return { body, state: agentStateSchema.parse(JSON.parse(body)) };
  })());

describe("=WHETHER in Google Sheets", () => {
  it("names exactly the keys this test knows how to read, so a new key needs a check", async () => {
    const served = await serve();
    const { keys } = loadScript(served.body);
    assert.deepEqual(Object.keys(keys).sort(), [...Object.keys(READS), ...Object.keys(PER_SCORE_READS)].sort());
  });

  it("reads every key from the state the route serves", async () => {
    const served = await serve();
    const script = loadScript(served.body);
    for (const [key, read] of Object.entries(READS)) {
      assert.deepEqual(plain(script.WHETHER(key)), asCell(read(served.state)), key);
    }
    for (const [key, read] of Object.entries(PER_SCORE_READS)) {
      for (const [argument, field] of SCORE_ARGUMENTS) {
        assert.deepEqual(plain(script.WHETHER(key, argument)), asCell(read(served.state.scores[field])), `${key}, ${argument}`);
      }
    }
  });

  it("fetches the state once per cache lifetime, from the public URL", async () => {
    const served = await serve();
    const script = loadScript(served.body);
    script.WHETHER("regime");
    script.WHETHER("pause_line", "tightness");
    assert.deepEqual(script.fetches, [STATE_URL]);
  });

  it("reads blank where the state holds null: no pause or restart line stated this week", async () => {
    const context = await loadAgentInterfaceContext("test");
    const bare = buildAgentState({ ...context, reportData: { ...context.reportData, actionStripItems: [] } });
    assert.equal(bare.scores.tightness.pause, null, "with no area rows, no pause line is stated");
    const script = loadScript(JSON.stringify(bare));
    for (const key of ["pause_line", "pause_met", "resume_line", "resume_met"]) {
      assert.equal(script.WHETHER(key, "tightness"), "", key);
    }
    assert.equal(script.WHETHER("change_line", "tightness"), bare.scores.tightness.change.line, "the change line is always stated");
  });

  it("accepts a payload path as the key, the Field the Excel query lists", async () => {
    const served = await serve();
    const script = loadScript(served.body);
    assert.equal(script.WHETHER("scores.tightness.pause.line"), script.WHETHER("pause_line", "tightness"));
    assert.equal(script.WHETHER("guidance.doNow.0"), served.state.guidance.doNow[0]);
    assert.equal(script.WHETHER("change.comparedWith.recordDate"), served.state.change.comparedWith?.recordDate ?? "");
  });

  it("matches keys and scores in any case or spacing, including the score's printed name", async () => {
    const served = await serve();
    const script = loadScript(served.body);
    assert.equal(script.WHETHER("Pause Line", "Funding pressure"), script.WHETHER("pause_line", "tightness"));
    assert.equal(script.WHETHER("RISK_APPETITE"), served.state.scores.riskAppetite.value);
    assert.equal(script.WHETHER("delta", "riskAppetite"), asCell(served.state.scores.riskAppetite.delta));
  });

  it("refuses what it cannot serve, saying what would work", async () => {
    const served = await serve();
    const script = loadScript(served.body);
    assert.throws(() => script.WHETHER(), /Name a key/);
    assert.throws(() => script.WHETHER("hiring_stance"), /Unknown key "hiring_stance"\. Keys: regime, /);
    assert.throws(() => script.WHETHER("pause_line"), /needs a score: tightness or risk_appetite/);
    assert.throws(() => script.WHETHER("pause_line", "hiring"), /shared by every area/);
    assert.throws(() => script.WHETHER("regime", "tightness"), /takes no second argument/);
    assert.throws(() => script.WHETHER("scores.tightness"), /is a record; name one of its fields: label, value/);
    assert.throws(() => script.WHETHER("scores.tightness.moved"), /is a list of records/);
    assert.throws(() => script.WHETHER("scores.tightness.nope"), /has no field "scores\.tightness\.nope"/);
  });

  it("refuses an error status, and a state version it was not written for", async () => {
    const served = await serve();
    assert.throws(() => loadScript(served.body, 503).WHETHER("regime"), /HTTP 503/);
    const later = loadScript(JSON.stringify({ ...served.state, version: "v2" }));
    assert.throws(() => later.WHETHER("regime"), /version v2; this script reads v1/);
  });
});

describe("the spreadsheet doc", () => {
  it("flags planned hires exactly when hiring's rule pauses net-new hiring: either pause_met cell TRUE", async () => {
    const served = await serve();
    const context = await loadAgentInterfaceContext("test");
    const hiring = areaLinesFromActionStrip(context.reportData.actionStripItems ?? []).find((lines) => lines.area === "hiring");
    assert.ok(hiring, "the fixture week has a hiring row");
    const tightnessLine: number | undefined = served.state.scores.tightness.pause?.line;
    const riskLine: number | undefined = served.state.scores.riskAppetite.pause?.line;
    assert.ok(tightnessLine !== undefined && riskLine !== undefined, "the fixture week states both pause lines");
    for (const t of [tightnessLine - 3, tightnessLine + 3]) {
      for (const r of [riskLine - 3, riskLine + 3]) {
        const scores: { tightness: number; riskAppetite: number } = { tightness: t, riskAppetite: r };
        const state = buildAgentState({
          ...context,
          reportData: { ...context.reportData, assessment: { ...context.reportData.assessment, scores: { ...context.reportData.assessment.scores, ...scores } } },
        });
        const script = loadScript(JSON.stringify(state));
        const flagged = script.WHETHER("pause_met", "tightness") === true || script.WHETHER("pause_met", "risk_appetite") === true;
        assert.equal(flagged, areaStateAt(hiring, scores) === "pause", `tightness ${t}, risk appetite ${r}`);
      }
    }
  });

  it("lists every key with the field the script reads, and no other", async () => {
    const served = await serve();
    const { keys } = loadScript(served.body);
    const doc = readFileSync(DOC_PATH, "utf8");
    const listed = Object.fromEntries([...doc.matchAll(/^\| `([a-z_]+)` \| `([^`]+)` \|/gm)].map((row) => [row[1], row[2]]));
    assert.deepEqual(listed, plain(keys));
  });

  it("carries no copy of the script or the query, only links to them", () => {
    const doc = readFileSync(DOC_PATH, "utf8");
    assert.doesNotMatch(doc, /function WHETHER|UrlFetchApp\.fetch|Json\.Document/);
    assert.match(doc, /\]\(whether\.gs\)/);
    assert.match(doc, /\]\(whether-state\.pq\)/);
  });
});
