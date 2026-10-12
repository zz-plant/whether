import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv-provider.js";
import { REGIME_KEYS } from "../lib/agent/inputs";
import { z } from "zod";
import { AgentInputError, createAgentToolRegistry, defineTool, describeToolParams, labelChoices } from "../lib/agent/registry";
import { callAgentTool, describeAgentTools, listAgentTools, runAgentTool } from "../lib/agent/tools";
import { loadAgentInterfaceContext } from "../lib/agentInterface";
import { buildAgentState } from "../lib/agentState";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";

/*
 * The registry is what every transport and every catalogue reads, so what an agent is told
 * here is what it is told everywhere: what a tool takes, what it will accept, and what it was
 * told when it was wrong. These pin the behaviours the dogfooding found missing: "SUNNY" (the
 * page's own word) answered as a success with no history, a cadence the server did not know
 * quietly becoming weekly, `riskAppetite=0` refused as missing, and a refusal that said what
 * was missing without saying what was allowed.
 */

const REGIME_CHOICES = "SCARCITY (Freezing), DEFENSIVE (Cloudy), VOLATILE (Stormy), EXPANSION (Sunny)";

const refusal = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof AgentInputError, `expected a refusal of the caller's input, got ${String(error)}`);
    return error;
  }
  return assert.fail("expected the call to be refused");
};

describe("the agent tool registry", () => {
  it("lists every tool with a schema a client can read, and nothing it would have to ignore", () => {
    const tools = listAgentTools("stdio");
    const names = tools.map((tool) => tool.name);

    assert.equal(new Set(names).size, names.length, "names are unique");
    for (const tool of tools) {
      assert.ok(tool.title && tool.description, `${tool.name} says what it is`);
      assert.equal(tool.inputSchema.type, "object", `${tool.name}: an object schema`);
      assert.equal(tool.inputSchema.additionalProperties, false, `${tool.name}: closed to arguments it does not take`);
      assert.ok(!("$schema" in tool.inputSchema), `${tool.name}: no dialect marker to compile`);
      assert.deepEqual(tool.annotations.readOnlyHint, true, `${tool.name}: a client may run it without asking`);
      assert.equal(tool.annotations.destructiveHint, false);
    }
  });

  it("offers over HTTP everything but the tool that only makes sense on a local checkout", () => {
    const http = listAgentTools("http").map((tool) => tool.name);
    const stdio = listAgentTools("stdio").map((tool) => tool.name);

    assert.deepEqual(stdio.filter((name) => !http.includes(name)), ["pull_recent_site_info"]);
    assert.deepEqual(http.filter((name) => !stdio.includes(name)), []);
    assert.equal(http[0], "get_state", "the tool to start with comes first");
  });

  it("answers under the names it used to be called", async () => {
    const byAlias = await runAgentTool("get_agent_brief", { cadence: "monthly" }, "stdio");
    const byName = await runAgentTool("get_brief", { cadence: "monthly" }, "stdio");

    assert.equal(byAlias.cadence, "monthly");
    assert.deepEqual(Object.keys(byAlias).sort(), Object.keys(byName).sort());
    assert.ok(!listAgentTools("stdio").some((tool) => tool.name === "get_agent_brief"), "an alias is not listed twice");
  });

  it("refuses a tool that does not exist, and lists the ones that do", async () => {
    const error = await refusal(runAgentTool("get_weather", {}, "http"));

    assert.equal(error.code, "unknown_tool");
    assert.match(error.message, /Unknown tool: "get_weather"\. Available: get_state, get_brief,/);
    assert.ok(!error.message.includes("pull_recent_site_info"), "not the local-only tool, over HTTP");
    assert.ok(error.problems[0]?.allowed?.includes("get_state"));
  });

  it("gives get_state's result in the compact text and the structured object, and validates against its own schema", async () => {
    const result = await callAgentTool("get_state", {}, "http");
    const state = listAgentTools("http").find((tool) => tool.name === "get_state");
    assert.ok(state?.outputSchema, "get_state publishes the shape of what it returns");

    assert.ok(result.structuredContent);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent, "the text is the same object");
    assert.ok(!result.content[0].text.includes("\n"), "compact, not indented");
    const validate = new AjvJsonSchemaValidator().getValidator(state.outputSchema);
    const verdict = validate(result.structuredContent);
    assert.ok(verdict.valid, `the result matches its published schema: ${verdict.valid ? "" : verdict.errorMessage}`);
  });
});

describe("what an agent may pass, and what it is told when it passes something else", () => {
  it("takes a regime by key or by the word the site prints, in any case, and answers on the key", async () => {
    for (const spelling of ["EXPANSION", "expansion", "Sunny", "SUNNY", " sunny "]) {
      const context = await runAgentTool("get_context", { regime: spelling }, "http");
      assert.equal(context.currentRegime, "EXPANSION", spelling);
    }
    const rules = await runAgentTool("get_decision_rules", { regime: "cloudy" }, "http");
    assert.deepEqual(Object.keys(rules), ["DEFENSIVE"]);
  });

  it("refuses a regime it does not know with every one it does", async () => {
    const error = await refusal(runAgentTool("get_context", { regime: "rainy" }, "http"));

    assert.equal(error.message, `Unknown regime "rainy". Use one of: ${REGIME_CHOICES}.`);
    assert.deepEqual(error.toJSON().problems, [
      { argument: "regime", message: error.message, allowed: REGIME_CHOICES.split(", ") },
    ]);
  });

  it("says an argument is missing, with what it takes, and treats an empty one as missing", async () => {
    for (const empty of [undefined, "", "  ", null]) {
      const error = await refusal(runAgentTool("get_recent_history", { signal_key: empty }, "http"));
      assert.match(error.message, /^Missing required argument: signal_key\. Use one of: TREASURY_1M, TREASURY_3M,/);
    }
    const noText = await refusal(runAgentTool("stress_test_plan", {}, "http"));
    assert.equal(noText.message, "Missing required argument: planText.");
  });

  it("names an argument it does not take, instead of defaulting past a typo", async () => {
    const error = await refusal(runAgentTool("get_context", { regim: "Sunny" }, "http"));

    assert.equal(error.message, 'Unknown argument "regim". get_context takes: regime.');
    const none = await refusal(runAgentTool("get_state", { cadence: "weekly" }, "http"));
    assert.equal(none.message, 'Unknown argument "cadence". get_state takes no arguments.');
    const notAnObject = await refusal(runAgentTool("get_state", "weekly", "http"));
    assert.match(notAnObject.message, /must be an object/);
  });

  it("refuses a cadence it does not know, where it used to answer weekly under that name", async () => {
    const error = await refusal(runAgentTool("get_brief", { cadence: "daily" }, "http"));

    assert.equal(error.message, 'Unknown cadence "daily". Use one of: weekly, monthly, quarterly, yearly.');
  });

  it("takes a number as a number or as text, and zero is a value", async () => {
    const projection = await runAgentTool(
      "get_projection",
      { regime: "DEFENSIVE", tightness: "74", riskAppetite: 0, tightnessDelta: " 4 ", riskAppetiteDelta: -2 },
      "http",
    );

    assert.deepEqual(projection.inputs, {
      regime: { value: "DEFENSIVE", from: "given" },
      tightness: { value: 74, from: "given" },
      riskAppetite: { value: 0, from: "given" },
      tightnessDelta: { value: 4, from: "given" },
      riskAppetiteDelta: { value: -2, from: "given" },
    });

    const error = await refusal(runAgentTool("get_projection", { tightness: "high" }, "http"));
    assert.equal(error.message, 'Argument tightness must be a number; got "high".');

    const text = await refusal(runAgentTool("stress_test_plan", { planText: 5 }, "http"));
    assert.equal(text.message, "Argument planText must be text; got 5.");
  });

  it("takes a lifecycle stage in any case, and refuses one it does not know", async () => {
    const plan = await runAgentTool("stress_test_plan", { planText: "Hire four engineers", lifecycle: "scale" }, "http");
    assert.ok(plan.verdict);

    const error = await refusal(runAgentTool("lint_sprint_goal", { goalText: "Ship it", lifecycle: "seed" }, "http"));
    assert.equal(error.message, 'Unknown lifecycle "seed". Use one of: DISCOVERY, GROWTH, SCALE, MATURE.');
  });

  it("turns a refusal into a result the model reads, with no structured content to validate", async () => {
    const result = await callAgentTool("get_context", { regime: "rainy" }, "http");

    assert.equal(result.isError, true);
    assert.equal(result.content[0].text, `Unknown regime "rainy". Use one of: ${REGIME_CHOICES}.`);
    assert.equal(result.structuredContent, undefined);
  });
});

/*
 * `get_context` reported `weeksActive` and `historicalAvgWeeks` from the Time Machine's regime series,
 * which is one entry per month-end: an agent told "8 weeks" was being told 8 months. Its only caller is
 * this tool, so the fields say what they count.
 */
describe("get_context's counts", () => {
  it("are months, and name the month-end snapshot they run to", async () => {
    const last = getTimeMachineRegimeSeries().at(-1);
    assert.ok(last, "the record has a latest snapshot");
    const context = await runAgentTool("get_context", { regime: last.regime }, "http");

    assert.ok(!("weeksActive" in context) && !("historicalAvgWeeks" in context), "no weeks that are months");
    assert.ok(typeof context.monthsActive === "number" && context.monthsActive >= 1);
    assert.deepEqual(context.latestSnapshot, { recordDate: last.recordDate, regime: last.regime });
    assert.ok(!("note" in context), "a regime that is in the record has nothing to explain");
  });

  it("explain a zero, which is a fact about the record and reads like a finding", async () => {
    const last = getTimeMachineRegimeSeries().at(-1);
    const other = REGIME_KEYS.find((key) => key !== last?.regime);
    assert.ok(last && other);
    const context = await runAgentTool("get_context", { regime: other }, "http");

    assert.equal(context.monthsActive, 0);
    assert.equal(context.note, `No month-end snapshot through ${last.recordDate} was in this regime (that one was ${last.regime}), so a run of it began after that date or has not happened.`);
  });
});

describe("the arguments an agent leaves out", () => {
  it("get_context defaults to today's conditions, and says so", async () => {
    const today = buildAgentState(await loadAgentInterfaceContext("test"));
    const context = await runAgentTool("get_context", {}, "http");

    assert.equal(context.currentRegime, today.conditions.key);
    assert.deepEqual(context.inputs, { regime: { value: today.conditions.key, from: "today" } });
  });

  it("get_projection with nothing given projects today's scores at today's pace", async () => {
    const today = buildAgentState(await loadAgentInterfaceContext("test"));
    const projection = await runAgentTool("get_projection", {}, "http");

    assert.deepEqual(projection.inputs, {
      regime: { value: today.conditions.key, from: "today" },
      tightness: { value: today.scores.tightness.value, from: "today" },
      riskAppetite: { value: today.scores.riskAppetite.value, from: "today" },
      tightnessDelta: { value: today.scores.tightness.perWeek, from: "today" },
      riskAppetiteDelta: { value: today.scores.riskAppetite.perWeek, from: "today" },
    });
  });

  it("get_projection assumes no pace for a what-if, rather than borrowing today's for other scores", async () => {
    const projection = await runAgentTool("get_projection", { tightness: 90, riskAppetite: 20 }, "http");

    assert.deepEqual(projection.inputs, {
      regime: projection.inputs && typeof projection.inputs === "object" && "regime" in projection.inputs ? projection.inputs.regime : null,
      tightness: { value: 90, from: "given" },
      riskAppetite: { value: 20, from: "given" },
      tightnessDelta: { value: 0, from: "assumed" },
      riskAppetiteDelta: { value: 0, from: "assumed" },
    });
    assert.match(String(projection.velocityLabel), /Stable/);
  });

  it("get_standup_line returns the standup one-liner for today's conditions", async () => {
    const result = (await runAgentTool("get_standup_line", {}, "http")) as { standupLine: string; regime: string };
    assert.ok(result.standupLine && typeof result.standupLine === "string");
    assert.match(result.standupLine, /Guidance|Conditions/);
    assert.match(result.standupLine, /Conditions change if/);
    assert.ok(result.regime);
  });
});

describe("the catalogue rows", () => {
  it("describe each tool's arguments the way a page or a manifest would print them", () => {
    const rows = describeAgentTools("http");
    const projection = rows.find((row) => row.name === "get_projection");
    const brief = rows.find((row) => row.name === "get_brief");
    const history = rows.find((row) => row.name === "get_recent_history");

    assert.ok(projection && brief && history);
    assert.equal(describeToolParams(rows.find((row) => row.name === "get_state")?.arguments ?? []), "none");
    assert.equal(describeToolParams(brief.arguments), "cadence (optional: weekly/monthly/quarterly/yearly)");
    assert.match(describeToolParams(history.arguments), /^signal_key \(required: TREASURY_1M\/TREASURY_3M/);
    assert.match(describeToolParams(projection.arguments), /tightness \(optional number\), riskAppetite \(optional number\)/);
    assert.deepEqual(brief.aliases, ["get_agent_brief"]);
  });
});

/*
 * The mechanism under the tools knows nothing about Whether: an input says how its own choices
 * read in a refusal (the regime input lists each key with its weather word), and a tool is
 * read-only unless its definition says otherwise.
 */
describe("the registry mechanism", () => {
  const registry = createAgentToolRegistry([
    defineTool({
      name: "labelled",
      title: "t",
      description: "d",
      input: { pick: labelChoices(z.preprocess((value) => value, z.enum(["A", "B"])), (choice) => `${choice} (the ${choice.toLowerCase()} one)`).optional() },
      run: async () => ({}),
    }),
    defineTool({ name: "plain", title: "t", description: "d", input: { pick: z.enum(["A", "B"]).optional() }, run: async () => ({}) }),
    defineTool({ name: "writes", title: "t", description: "d", readOnly: false, input: {}, run: async () => ({}) }),
  ]);

  it("lists an input's choices in the words the input gives them, and as themselves otherwise", () => {
    assert.throws(() => registry.checkAgentToolArguments("labelled", { pick: "C" }, "http"), {
      message: 'Unknown pick "C". Use one of: A (the a one), B (the b one).',
    });
    assert.throws(() => registry.checkAgentToolArguments("plain", { pick: "C" }, "http"), { message: 'Unknown pick "C". Use one of: A, B.' });
  });

  it("annotates a tool as read-only unless its definition says it writes", () => {
    const [labelled, , writes] = registry.listAgentTools("http");

    assert.deepEqual(labelled.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
    assert.deepEqual(writes.annotations, { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false });
    assert.equal(registry.describeAgentTools("http")[2].readOnly, false);
  });
});
