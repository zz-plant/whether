import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv-provider.js";
import { REGIME_KEYS } from "../lib/agent/inputs";
import { z } from "zod";
import { AgentInputError, createAgentToolRegistry, defineTool, describeToolParams, labelChoices } from "../lib/agent/registry";
import { callAgentTool, decisionAnswerOutputSchema, describeAgentTools, listAgentTools, runAgentTool } from "../lib/agent/tools";
import { loadAgentInterfaceContext } from "../lib/agentInterface";
import { answerPages, matchDecisionPage } from "../app/answers/decisionPages";
import { buildAgentState } from "../lib/agentState";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

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

  it("returns a frozen published brief when requested by week, and posture archive when requested by period", async () => {
    const w41 = await runAgentTool("get_brief", { week: "2026-w41" }, "http");
    assert.equal(w41.type, "published_brief");
    assert.equal(w41.slug, "2026-w41");
    assert.ok(w41.headline);

    const period = await runAgentTool("get_brief", { period: "2024-q1" }, "http");
    assert.equal(period.type, "posture_archive_period");
    assert.equal(period.slug, "2024-q1");
    assert.equal(period.kind, "quarter");
  });

  it("answers a decision question through get_answer with structured guidance and citeable quote", async () => {
    const bySlug = decisionAnswerOutputSchema.parse(
      await runAgentTool("get_answer", { question: "should-startups-raise-capital-now" }, "http"),
    );
    assert.equal(bySlug.type, "decision_answer");
    assert.equal(bySlug.slug, "should-startups-raise-capital-now");
    assert.ok(bySlug.shortAnswer.length > 0);
    assert.ok(bySlug.directAnswer.length > 0);
    assert.ok(bySlug.currentStanding.recordDate.length > 0);
    assert.ok(bySlug.citation.includes("https://whether.work/answers/should-startups-raise-capital-now"));
    assert.ok(bySlug.attributionSnippet.includes("According to Whether's weekly guidance"));

    // A natural-language question resolves through the page's own keyword and title.
    const byQuestion = decisionAnswerOutputSchema.parse(
      await runAgentTool("get_answer", { question: "should we freeze hiring" }, "http"),
    );
    assert.equal(byQuestion.slug, "should-we-freeze-or-selectively-hire");

    // A slug fragment resolves through the hyphenated form.
    const byFragment = decisionAnswerOutputSchema.parse(
      await runAgentTool("get_answer", { question: "cut burn" }, "http"),
    );
    assert.equal(byFragment.slug, "when-should-startups-cut-burn");

    // A topic the answers don't cover is refused with the list of what does exist, by title.
    const unknown = await refusal(runAgentTool("get_answer", { question: "cryptocurrency" }, "http"));
    assert.match(unknown.message, /Available decision topics: Startup funding climate this week \(startup-funding-climate-this-week\)/);
    assert.match(unknown.message, /get_state answers it/);
    assert.ok(unknown.problems.some((problem) => problem.allowed?.includes("should-startups-raise-capital-now")));
  });

  it("sends a question no page answers to the tool that grades it, and that tool grades it", async () => {
    /* Each was refused with the list of pages until 2026-11-04, though the stress test has rules for it. */
    const plans: Record<string, string> = {
      "should we sign a three year office lease?": "INFRASTRUCTURE",
      "how much should we budget for AI and GPU spend?": "INFRASTRUCTURE",
      /* "spend" and "more" are not a topic: these reached the go-to-market answer through its ad phrasing. */
      "should we spend more on AWS": "INFRASTRUCTURE",
      "should we spend more on GPUs": "INFRASTRUCTURE",
      "should we spend more on office rent": "INFRASTRUCTURE",
      "should we increase spend on AWS": "INFRASTRUCTURE",
      "should we buy a smaller competitor?": "M_AND_A",
      "should we push customers to annual contracts?": "PRICING",
    };
    for (const [question, category] of Object.entries(plans)) {
      const refused = await refusal(runAgentTool("get_answer", { question }, "http"));
      assert.match(refused.message, /stress_test_plan grades this kind of decision/, question);
      assert.doesNotMatch(refused.message, /Available decision topics/, question);
      const graded = await runAgentTool("stress_test_plan", { planText: question }, "http");
      assert.equal(graded.detectedCategory, category, question);
    }
  });

  it("names the nearest answer as the nearest when the stress test already points to one", async () => {
    const nearest: Record<string, RegExp> = {
      "should we take an angel check?": /The nearest is Should startups raise capital now\? \(should-startups-raise-capital-now\)/,
      "should we offer a secondary sale to employees?": /The nearest is Should startups change compensation now\? \(should-startups-change-compensation-now\)/,
    };
    for (const [question, named] of Object.entries(nearest)) {
      const refused = await refusal(runAgentTool("get_answer", { question }, "http"));
      assert.match(refused.message, named, question);
      assert.match(refused.message, /not one about this question/, question);
      assert.equal(refused.problems[0]?.next, "get_answer", question);
    }
  });

  it("answers venture debt from its own page", async () => {
    for (const question of ["should I take venture debt?", "is venture debt a good idea", "should we borrow instead of selling equity"]) {
      assert.equal(matchDecisionPage(question)?.slug, "should-startups-take-venture-debt-now", question);
    }
    /* "take" names the page and is no topic. */
    assert.equal(matchDecisionPage("should we take a break"), undefined);
  });

  it("says plainly when nothing covers a question, and lists what does", async () => {
    const refused = await refusal(runAgentTool("get_answer", { question: "should I quit my job to start a company?" }, "http"));
    assert.match(refused.message, /tell the user it has no answer for this/);
    assert.match(refused.message, /Available decision topics/);
    assert.doesNotMatch(refused.message, /stress_test_plan/);
    assert.equal(refused.problems[0]?.next, undefined);
  });

  it("counts a call by tool and outcome, and never keeps what was sent", async () => {
    const rows: unknown[] = [];
    const written: string[] = [];
    Reflect.set(globalThis, "ANALYTICS", {
      writeDataPoint: (point: { blobs?: string[] }) => {
        const blob = point.blobs?.[1] ?? "";
        written.push(blob);
        rows.push(JSON.parse(blob));
      },
    });
    try {
      await runAgentTool("get_answer", { question: "Should I hire a second engineer for Project Falcon?" }, "http");
      await refusal(runAgentTool("get_answer", { question: "should we sign the Falcon office lease?" }, "http"));
      await refusal(runAgentTool("get_answer", { question: "Falcon pizza recipes" }, "http"));
      await runAgentTool("stress_test_plan", { planText: "Hire one Falcon engineer", cashUsd: 1_234_567 }, "http");
      await runAgentTool("stress_test_plan", { planText: "Falcon pizza party" }, "http");
      await refusal(runAgentTool("get_answer", {}, "http"));
      await callAgentTool("get_answer", { question: "Falcon pizza recipes" }, "stdio");
    } finally {
      Reflect.deleteProperty(globalThis, "ANALYTICS");
    }
    assert.deepEqual(rows, [
      { tool: "get_answer", outcome: "answered", detail: "should-startups-hire-engineers-right-now" },
      { tool: "get_answer", outcome: "refused", detail: "stress_test_plan" },
      { tool: "get_answer", outcome: "refused", detail: null },
      { tool: "stress_test_plan", outcome: "answered", detail: "HIRING" },
      { tool: "stress_test_plan", outcome: "not_graded", detail: null },
      { tool: "get_answer", outcome: "refused", detail: null },
    ]);
    assert.doesNotMatch(written.join(" "), /Falcon|pizza|1234567/);
  });

  it("returns each curated question's own answer before fuzzy topic ranking", () => {
    for (const page of answerPages) {
      for (const question of [page.slug, page.title, page.keyword, ...page.askedAs]) {
        assert.equal(matchDecisionPage(question)?.slug, page.slug, question);
        assert.equal(matchDecisionPage(`  ${question.toUpperCase()}?  `)?.slug, page.slug, question);
      }
    }
  });

  it("finds the answer for a question as a user asks it, not only as a page's title reads", () => {
    /* An agent passes the user's words. Each of these was refused until 2026-10-28, when a
       question had to repeat every one of its words from one page's title. */
    const asked: Record<string, string> = {
      "Should I hire a second engineer?": "should-startups-hire-engineers-right-now",
      "is now a good time to raise a seed round": "should-startups-raise-capital-now",
      "should we raise a series A or wait": "should-startups-raise-capital-now",
      "how is the VC funding market right now": "startup-funding-climate-this-week",
      "what do interest rates mean for my startup": "startup-funding-climate-this-week",
      "do we need to cut costs": "when-should-startups-cut-burn",
      "should we slow down hiring": "should-we-freeze-or-selectively-hire",
      "should we hire": "should-we-freeze-or-selectively-hire",
      "should we hire sales reps": "should-we-expand-sales-headcount-now",
      "when should I hire my first AE": "should-we-hire-our-first-salesperson-now",
      "is a recession coming": "what-should-startups-do-before-a-downturn",
      "market context for our board update": "how-to-brief-executives-on-market-conditions",
      "do we have enough runway": "how-much-runway-should-we-have-before-we-raise",
      "freeze-or-selectively": "should-we-freeze-or-selectively-hire",
      "how much cash do we need": "how-much-runway-should-we-have-before-we-raise",
      // Sent to cutting burn until 2026-11-04: "cut" and the "rate" in "burn rate".
      "do rate cuts help my startup": "startup-funding-climate-this-week",
      "will rate cuts help us": "startup-funding-climate-this-week",
      "should we spend more on ads": "how-fast-should-we-scale-go-to-market",
      "should we spend more on advertising": "how-fast-should-we-scale-go-to-market",
      "should we increase our ad spend": "how-fast-should-we-scale-go-to-market",
      // What a model passed in a headless run on 2026-11-02, the company's details and all.
      "should I hire two more engineers this quarter with 14 months of runway": "should-startups-hire-engineers-right-now",
    };
    for (const [question, slug] of Object.entries(asked)) {
      assert.equal(matchDecisionPage(question)?.slug, slug, question);
    }
    // One incidental word a page's phrasing happens to use is not a match.
    for (const offTopic of ["pizza recipes", "cryptocurrency", "", "   ", "should I start a company now", "how much should we budget for AI and GPU spend", "should our support agent offer a 20% discount to save this customer"]) {
      assert.equal(matchDecisionPage(offTopic), undefined, JSON.stringify(offTopic));
    }
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

  it("prints the rules without a reading nobody took", async () => {
    const rules = await runAgentTool("get_decision_rules", {}, "http");
    assert.ok(Object.keys(rules).length > 0);
    assert.doesNotMatch(JSON.stringify(rules), /\bis 50\b/);
  });

  it("says when a plan has no rules, and where to look instead", async () => {
    const price = await runAgentTool("stress_test_plan", { planText: "Raise prices from $9 to $19 a month" }, "http");
    assert.equal(price.verdict, null);
    assert.match(JSON.stringify(price.answer), /"slug":"should-startups-raise-prices-now"/);
    const angel = await runAgentTool("stress_test_plan", { planText: "Take a $50k angel check" }, "http");
    assert.equal(angel.verdict, null);
    assert.match(JSON.stringify(angel.answer), /"slug":"should-startups-raise-capital-now"/);
    const ads = await runAgentTool("lint_sprint_goal", { goalText: "Spend $300 a month on ads for six weeks" }, "http");
    assert.equal(ads.verdict, "not_graded");
    assert.match(JSON.stringify(ads.answer), /"slug":"how-fast-should-we-scale-go-to-market"/);
    const secondary = await runAgentTool("stress_test_plan", { planText: "Offer employees a secondary sale" }, "http");
    assert.equal(secondary.verdict, null);
    assert.match(JSON.stringify(secondary.answer), /"slug":"should-startups-change-compensation-now"/);
    const ungraded = await runAgentTool("stress_test_plan", { planText: "Quit my contract work" }, "http");
    assert.equal(ungraded.answer, null);
    const debt = await runAgentTool("stress_test_plan", { planText: "Take $2M of venture debt" }, "http");
    assert.equal(debt.verdict, null);
    assert.match(JSON.stringify(debt.answer), /"slug":"should-startups-take-venture-debt-now"/);
    const retro = await runAgentTool("audit_sprint_retro", { planText: "Quit my contract work" }, "http");
    assert.equal(retro.verdict, null);
    assert.equal(retro.violationCount, 0);
  });

  it("sizes a plan against the figures an agent passes", async () => {
    const plan = { planText: "Hire 1 engineer at $200k" };
    const unsized = await runAgentTool("stress_test_plan", plan, "http");
    assert.equal(unsized.runwayShare, null);
    const sized = await runAgentTool("stress_test_plan", { ...plan, cashUsd: "300000", monthlySpendUsd: 10_000, monthlyRevenueUsd: 5_000 }, "http");
    assert.equal(sized.verdict, "DANGEROUS");
    assert.equal(sized.verdictDriver, "SIZE");
    assert.match(String(sized.sizingNote), /67% of \$300k cash on hand/);
  });

  it("grades what the wording could not when the agent names the category", async () => {
    const plan = await runAgentTool("stress_test_plan", { planText: "Raise prices", category: "pricing" }, "http");
    assert.equal(plan.detectedCategory, "PRICING");
    const refused = await refusal(runAgentTool("stress_test_plan", { planText: "Raise prices", category: "ADS" }, "http"));
    assert.ok(refused.toJSON().problems.some((problem) => problem.argument === "category"));
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
    const result = await runAgentTool("get_standup_line", {}, "http");
    const standupLine = result.standupLine;
    assert.ok(typeof standupLine === "string");
    assert.match(standupLine, /Guidance|Conditions/);
    assert.match(standupLine, /Conditions change if/);
    assert.ok(result.regime);
  });

  it("audit_sprint_retro audits commitments against today's pause lines", async () => {
    const report = await runAgentTool("audit_sprint_retro", { planText: "Hire 4 engineers with 8 months cash" }, "http");
    assert.ok(report.regime);
    assert.ok(typeof report.headline === "string");
    assert.ok(Array.isArray(report.activePauseTriggers));
    assert.ok(typeof report.markdown === "string");
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
    assert.equal(
      describeToolParams(brief.arguments),
      "cadence (optional: weekly/monthly/quarterly/yearly), week (optional), period (optional)",
    );
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
