import { z } from "zod";
import { buildAgentInterfaceResponse, loadAgentInterfaceContext, pullRecentSiteInfo, supportedAgentCadences } from "../agentInterface";
import { agentSkills } from "../agentSkills";
import { agentStateSchema, buildAgentState } from "../agentState";
import { getHistoricalAnalogPlaybook } from "../analogPlaybook";
import { stressTestDecisionPlan } from "../decisionShield";
import { loadCanonicalReportInputs } from "../ingestion/materialized";
import { DEFAULT_THRESHOLDS } from "../regimeEngineCore";
import { buildCanonicalBoundedDecisionRules, formatBoundedDecisionTriplet } from "../report/boundedDecisionRules";
import { getRegimeContext, getRegimeProjection } from "../report/regimeContext";
import { buildUseConstraint } from "../report/useConstraint";
import { loadWeeklyBriefSnapshot } from "../report/weeklyBriefSnapshot";
import { fetchSaaSValuations } from "../saasMultiples";
import { getTimeMachineMonthsByYear } from "../timeMachine/timeMachineCache";
import {
  AgentInputError,
  REGIME_KEYS,
  SIGNAL_KEYS,
  lifecycleInput,
  lowerCasedInput,
  numberInput,
  parseToolArguments,
  regimeInput,
  signalKeyInput,
  textInput,
} from "./inputs";
import { toPublishedJsonSchema } from "./jsonSchema";

/**
 * Every tool an agent can call, defined once.
 *
 * There were two MCP servers, five tools against twelve, under two names, with the input
 * vocabulary and the refusals written out separately in each, plus a plain-GET catalogue
 * that listed six and a discovery manifest that listed none. A tool added to one was
 * missing from the rest, and nothing said so. Now a tool is one definition here, and the
 * remote server, the local server, the GET shim, the manifest and `/llms.txt` all read it.
 *
 * `execute` parses its own arguments (see `inputs.ts`) so a caller that is wrong is told
 * what would have been right, and returns an object: MCP's `structuredContent` must be one.
 */

type AgentToolTransport = "http" | "stdio";

type ToolArgument = {
  name: string;
  required: boolean;
  type: string | null;
  description: string | null;
  values: readonly string[] | null;
};

type AgentTool = {
  name: string;
  title: string;
  description: string;
  /** Names it has answered to before, so a client configured against one keeps working. */
  aliases: readonly string[];
  transports: readonly AgentToolTransport[];
  annotations: { readOnlyHint: true; destructiveHint: false; idempotentHint: true; openWorldHint: boolean };
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown> | null;
  arguments: readonly ToolArgument[];
  schema: z.ZodObject<z.ZodRawShape, z.core.$ZodObjectConfig>;
  /** One call that works, as arguments: what the docs and the plain-GET catalogue show. */
  example: Record<string, string | number>;
  /** Where the plain-GET answer differs from the MCP one, for a catalogue to say so. */
  plainGetNote: string | null;
  execute: (args: unknown) => Promise<Record<string, unknown>>;
};

const describeArguments = (schema: z.ZodObject<z.ZodRawShape, z.core.$ZodObjectConfig>): ToolArgument[] =>
  Object.entries(schema.shape).map(([name, field]) => {
    const json = z.toJSONSchema(field, { io: "input" });
    return {
      name,
      required: !z.safeParse(field, undefined).success,
      type: typeof json.type === "string" ? json.type : null,
      description: json.description ?? null,
      values: Array.isArray(json.enum) ? json.enum.map(String) : null,
    };
  });

const defineTool = <Shape extends z.ZodRawShape>(tool: {
  name: string;
  title: string;
  description: string;
  input: Shape;
  output?: z.ZodType;
  aliases?: readonly string[];
  transports?: readonly AgentToolTransport[];
  /** True when the tool reaches a source outside Whether's own data. */
  openWorld?: boolean;
  example?: Record<string, string | number>;
  plainGetNote?: string;
  run: (args: z.output<z.ZodObject<Shape, z.core.$strict>>) => Promise<Record<string, unknown>>;
}): AgentTool => {
  const schema = z.strictObject(tool.input);
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    aliases: tool.aliases ?? [],
    transports: tool.transports ?? ["http", "stdio"],
    // Everything here reads; nothing writes, so a client may run any of it without asking first.
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: tool.openWorld ?? false },
    inputSchema: toPublishedJsonSchema(schema),
    outputSchema: tool.output ? toPublishedJsonSchema(tool.output) : null,
    arguments: describeArguments(schema),
    schema,
    example: tool.example ?? {},
    plainGetNote: tool.plainGetNote ?? null,
    // Async, so a refusal is always a rejection: a caller that awaits or catches never has to also try/catch a synchronous throw.
    execute: async (args) => tool.run(parseToolArguments(tool.name, schema, args)),
  };
};

const REGIME_ARGUMENT =
  "A regime by key (SCARCITY, DEFENSIVE, VOLATILE, EXPANSION) or by the word the site prints (Freezing, Cloudy, Stormy, Sunny), in any case.";

const cadenceInput = z.preprocess(lowerCasedInput, z.enum(supportedAgentCadences));

/** Where an input came from, so an answer computed from today's reading says so instead of passing as the caller's own. */
const used = <Value extends string | number>(value: Value, from: "given" | "today" | "assumed") => ({ value, from });

const todayState = async () => buildAgentState(await loadAgentInterfaceContext("/api/mcp"));

const rulesFor = (regime: (typeof REGIME_KEYS)[number]) =>
  buildCanonicalBoundedDecisionRules({
    regime,
    thresholds: DEFAULT_THRESHOLDS,
    scores: { tightness: 50, riskAppetite: 50 },
  }).map((rule) => ({ area: rule.area, ...formatBoundedDecisionTriplet(rule) }));

const AGENT_TOOLS: readonly AgentTool[] = [
  defineTool({
    name: "get_state",
    title: "Get the current state",
    description:
      "Start here. The current reading in one small answer (about 3KB): the conditions and how sure, whether the data is live and current (automation.ready), where each score sits against its pause, resume and change lines, what moved each score since the earlier reading, and the guidance.",
    input: {},
    output: agentStateSchema,
    example: {},
    run: async () => ({ ...(await todayState()) }),
  }),
  defineTool({
    name: "get_brief",
    title: "Get the full weekly brief",
    description:
      "The full brief (about 22KB): summary prose, decision delta, flip watch, provenance and the agent handoff, for a cadence. Use get_state when you only need to decide; use this for the wording, the record, or a cadence other than weekly.",
    aliases: ["get_agent_brief"],
    input: { cadence: cadenceInput.optional().describe("weekly (default), monthly, quarterly or yearly.") },
    example: { cadence: "weekly" },
    plainGetNote: "Over plain GET it answers a summary instead (regime, action, confidence, record date); get_state is the answer to decide from.",
    run: async ({ cadence }) => ({ ...(await buildAgentInterfaceResponse(cadence ?? "weekly", { route: "/api/mcp" })), use: buildUseConstraint() }),
  }),
  defineTool({
    name: "get_decision_rules",
    title: "Get the bounded decision rules",
    description:
      "The bounded rules behind the guidance: for each operating area, the action, the line that pauses it and the trigger that reverses it. Keyed by regime; one regime, or all four when none is given. The rules are the same every week; get_state says where today's scores sit against the lines.",
    input: { regime: regimeInput.optional().describe(`${REGIME_ARGUMENT} Omit for all four.`) },
    example: { regime: "DEFENSIVE" },
    run: async ({ regime }) => Object.fromEntries((regime ? [regime] : REGIME_KEYS).map((key) => [key, rulesFor(key)])),
  }),
  defineTool({
    name: "get_context",
    title: "Get regime context",
    description:
      "How long a regime has lasted, how long its past runs lasted, and what most often came next, in months of month-end snapshots up to `latestSnapshot` (the record is monthly). Defaults to today's conditions; `inputs` says which values were yours and which were today's.",
    input: { regime: regimeInput.optional().describe(`${REGIME_ARGUMENT} Defaults to today's conditions.`) },
    example: { regime: "DEFENSIVE" },
    run: async ({ regime }) => {
      const resolved = regime ?? (await todayState()).conditions.key;
      const context = getRegimeContext(resolved);
      const { latestSnapshot } = context;
      return {
        ...context,
        /* Zero months is a fact about the record, and it reads like a finding: today's conditions
           can be newer than the last month-end, which is exactly when an agent asks. */
        ...(context.monthsActive === 0 && latestSnapshot
          ? { note: `No month-end snapshot through ${latestSnapshot.recordDate} was in this regime (that one was ${latestSnapshot.regime}), so a run of it began after that date or has not happened.` }
          : {}),
        inputs: { regime: used(resolved, regime === undefined ? "today" : "given") },
      };
    },
  }),
  defineTool({
    name: "get_projection",
    title: "Project weeks to a change in conditions",
    description:
      "Weeks until a score crosses the line where conditions change, at a given pace. With no arguments it uses today's scores and their pace; give scores to ask what-if, and any pace you leave out is taken as 0. `inputs` says which values were yours, which were today's, and which were assumed.",
    input: {
      regime: regimeInput.optional().describe(`${REGIME_ARGUMENT} Defaults to today's conditions.`),
      tightness: numberInput.optional().describe("Funding pressure, 0 to 100. Defaults to today's."),
      riskAppetite: numberInput.optional().describe("Risk appetite, 0 to 100. Defaults to today's."),
      tightnessDelta: numberInput.optional().describe("Funding pressure's pace in points per week, not the total change since an earlier reading. Defaults to today's pace when no score is given, else 0."),
      riskAppetiteDelta: numberInput.optional().describe("Risk appetite's pace in points per week, not the total change since an earlier reading. Defaults to today's pace when no score is given, else 0."),
    },
    example: { regime: "DEFENSIVE", tightness: 74, riskAppetite: 32, tightnessDelta: 4, riskAppetiteDelta: -2 },
    run: async ({ regime, tightness, riskAppetite, tightnessDelta, riskAppetiteDelta }) => {
      const today = regime === undefined || tightness === undefined || riskAppetite === undefined ? await todayState() : null;
      const resolvedRegime = regime ?? today?.conditions.key;
      const resolvedTightness = tightness ?? today?.scores.tightness.value;
      const resolvedRiskAppetite = riskAppetite ?? today?.scores.riskAppetite.value;
      if (resolvedRegime === undefined || resolvedTightness === undefined || resolvedRiskAppetite === undefined) {
        throw new Error("Today's reading is not available, so there is nothing to fill in the arguments you left out.");
      }
      // A scenario's scores are not today's, so today's pace does not describe them.
      const isScenario = tightness !== undefined || riskAppetite !== undefined;
      const pace = (given: number | undefined, metric: "tightness" | "riskAppetite") => {
        if (given !== undefined) return used(given, "given");
        const todays = isScenario ? null : today?.scores[metric].perWeek;
        return todays === null || todays === undefined ? used(0, "assumed") : used(todays, "today");
      };
      const inputs = {
        regime: used(resolvedRegime, regime === undefined ? "today" : "given"),
        tightness: used(resolvedTightness, tightness === undefined ? "today" : "given"),
        riskAppetite: used(resolvedRiskAppetite, riskAppetite === undefined ? "today" : "given"),
        tightnessDelta: pace(tightnessDelta, "tightness"),
        riskAppetiteDelta: pace(riskAppetiteDelta, "riskAppetite"),
      };
      return {
        ...getRegimeProjection(
          resolvedRegime,
          resolvedTightness,
          resolvedRiskAppetite,
          inputs.tightnessDelta.value,
          inputs.riskAppetiteDelta.value,
        ),
        inputs,
      };
    },
  }),
  defineTool({
    name: "get_comps",
    title: "Get SaaS valuation comps",
    description: "Median SaaS EV/Revenue multiple from 15 public companies, from live quotes. Fails with the source's reason when the quotes are unreachable.",
    openWorld: true,
    input: {},
    example: {},
    run: async () => ({ ...(await fetchSaaSValuations()) }),
  }),
  defineTool({
    name: "get_signals",
    title: "Get historical data coverage",
    description: "Which years and months the historical record covers.",
    input: {},
    example: {},
    run: async () => ({ coverage: getTimeMachineMonthsByYear() }),
  }),
  defineTool({
    name: "get_recent_history",
    title: "Get one signal's trailing history",
    description: "The trailing 92-day window for one signal from the materialized model, for temporal analysis without parsing the whole brief.",
    input: { signal_key: signalKeyInput.describe(`One of ${SIGNAL_KEYS.join(", ")}, in any case.`) },
    example: { signal_key: "VIX_INDEX" },
    run: async ({ signal_key }) => {
      // The same posture as the report read path: serve what is materialized, refresh off-request.
      const inputs = await loadCanonicalReportInputs({ refresh: "background" });
      const history = inputs?.materializedSignals.recentHistory?.[signal_key];
      if (!history) throw new Error(`No history is materialized for ${signal_key}.`);
      return { signal_key, history };
    },
  }),
  defineTool({
    name: "stress_test_plan",
    title: "Stress-test a planned decision against today's conditions",
    description:
      "Audits a proposed operational decision (hiring, cloud commit, office lease, GTM pricing) against today's funding pressure and risk appetite, and returns the fragile assumptions, the bounded guardrail and the reversal trigger.",
    input: {
      planText: textInput.describe("The planned decision or initiative in plain English."),
      lifecycle: lifecycleInput.optional().describe("Company lifecycle stage; defaults to GROWTH."),
    },
    example: { planText: "Sign a three-year cloud commitment" },
    run: async ({ planText, lifecycle }) => {
      const { snapshot } = await loadWeeklyBriefSnapshot();
      return { ...stressTestDecisionPlan(snapshot.reportData.assessment, { planText, lifecycle: lifecycle ?? "GROWTH" }) };
    },
  }),
  defineTool({
    name: "lint_commitment",
    title: "Lint a spec or contract for fixed commitments",
    description:
      "Scans an engineering PRD, RFC or contract for fixed capital lock-in (multi-year reservations, large upfront cash commitments) and offers reversible alternatives, against today's conditions.",
    input: { specText: textInput.describe("The PRD, RFC, or procurement specification text.") },
    example: { specText: "Reserve 3 years of capacity, paid upfront" },
    run: async ({ specText }) => {
      const { snapshot } = await loadWeeklyBriefSnapshot();
      return { ...stressTestDecisionPlan(snapshot.reportData.assessment, { planText: specText }) };
    },
  }),
  defineTool({
    name: "lint_sprint_goal",
    title: "Lint a sprint goal against today's conditions",
    description:
      "Takes a sprint goal or story-level plan and says whether it holds, pauses, or needs a reversal guardrail under today's conditions, with the bounded-rule trigger that would fire. A sprint goal is a planned decision at smaller granularity, so this reuses the stress-test engine.",
    input: {
      goalText: textInput.describe("The sprint goal or story-level plan in plain English."),
      lifecycle: lifecycleInput.optional().describe("Company lifecycle stage; defaults to GROWTH."),
    },
    example: { goalText: "Hire two contractors for the launch" },
    run: async ({ goalText, lifecycle }) => {
      const { snapshot } = await loadWeeklyBriefSnapshot();
      const plan = stressTestDecisionPlan(snapshot.reportData.assessment, { planText: goalText, lifecycle: lifecycle ?? "GROWTH" });
      /* The stress-test engine grades on SAFE/RISKY/DANGEROUS; a sprint goal needs a verdict an
         engineer can act on, mapped 1:1 so the source of the call stays visible: SAFE holds,
         RISKY pauses, DANGEROUS needs a reversal guardrail before it is pulled. */
      const verdict = plan.verdict === "SAFE" ? "holds" : plan.verdict === "RISKY" ? "pauses" : "needs_reversal_guardrail";
      return {
        verdict,
        headline: plan.headline,
        detectedCategory: plan.detectedCategory,
        detectedAction: plan.detectedAction,
        detectionConfidence: plan.detectionConfidence,
        // The pause line and reversal trigger are the bounded rule's own, so the caller can paste them without re-deriving them.
        pauseTrigger: plan.boundedGuardrail,
        reversalTrigger: plan.reversalTrigger,
        fragileAssumptions: plan.fragileAssumptions,
        sizingNote: plan.sizingNote,
      };
    },
  }),
  defineTool({
    name: "get_analog_playbook",
    title: "Get the historical analog playbook",
    description:
      "Matches today's conditions against historical analogs (Q3 2007, Q4 2018, Q2 2022) and returns what peer startups got wrong and what the winners did.",
    input: {},
    example: {},
    run: async () => {
      const { snapshot } = await loadWeeklyBriefSnapshot();
      return { ...getHistoricalAnalogPlaybook(snapshot.reportData.assessment) };
    },
  }),
  defineTool({
    name: "list_agent_skills",
    title: "List the agent skills",
    description: "The skill ids and output order an agent runtime should follow when working from a Whether brief.",
    input: {},
    example: {},
    run: async () => ({ skills: agentSkills }),
  }),
  defineTool({
    name: "pull_recent_site_info",
    title: "Pull the brief from a Whether site",
    description:
      "Fetches /api/agent from a Whether site over HTTP, for a local agent that has no other way to reach it. Only on the local server: the remote one is the site.",
    transports: ["stdio"],
    openWorld: true,
    input: {
      cadence: cadenceInput.optional().describe("weekly (default), monthly, quarterly or yearly."),
      siteUrl: textInput.optional().describe("The site to read; defaults to the production site."),
    },
    example: {},
    run: async ({ cadence, siteUrl }) => ({ ...(await pullRecentSiteInfo({ cadence: cadence ?? "weekly", siteBaseUrl: siteUrl })) }),
  }),
];

const availableOn = (transport: AgentToolTransport) => AGENT_TOOLS.filter((tool) => tool.transports.includes(transport));

const requireTool = (name: string, transport: AgentToolTransport): AgentTool => {
  const tool = availableOn(transport).find((candidate) => candidate.name === name || candidate.aliases.includes(name));
  if (tool) return tool;
  const available = availableOn(transport).map((candidate) => candidate.name);
  const message = `Unknown tool: ${name ? JSON.stringify(name) : "(missing name)"}. Available: ${available.join(", ")}.`;
  throw new AgentInputError(message, "unknown_tool", [{ argument: "name", message, allowed: available }]);
};

/** What `tools/list` answers: the fields a client reads, and nothing it would have to ignore. */
export const listAgentTools = (transport: AgentToolTransport) =>
  availableOn(transport).map(({ name, title, description, inputSchema, outputSchema, annotations }) => ({
    name,
    title,
    description,
    inputSchema,
    ...(outputSchema ? { outputSchema } : {}),
    annotations,
  }));

/** The same tools with what a page or a manifest wants: the arguments, an example, the transports. */
export const describeAgentTools = (transport: AgentToolTransport) =>
  availableOn(transport).map(({ name, title, description, aliases, transports, annotations, arguments: args, example, plainGetNote }) => ({
    name,
    title,
    description,
    aliases,
    transports,
    readOnly: annotations.readOnlyHint,
    arguments: args,
    example,
    plainGetNote,
  }));

/** One line per tool argument, for a catalogue read by something that has no schema parser: "regime (optional: SCARCITY/DEFENSIVE)". */
export const describeToolParams = (args: readonly ToolArgument[]) =>
  args.length === 0
    ? "none"
    : args
        .map(({ name, required, type, values }) => {
          const qualifiers = [required ? "required" : "optional", ...(type === "number" ? ["number"] : [])].join(" ");
          return `${name} (${qualifiers}${values ? `: ${values.join("/")}` : ""})`;
        })
        .join(", ");

/** Runs a tool and returns its object; throws `AgentInputError` for a caller's mistake, anything else for a fault. */
export const runAgentTool = async (name: string, args: unknown, transport: AgentToolTransport) => requireTool(name, transport).execute(args);

/** Refuses arguments the tool would refuse, without running it, for a caller that builds its own answer. */
export const checkAgentToolArguments = (name: string, args: unknown, transport: AgentToolTransport): void => {
  const tool = requireTool(name, transport);
  parseToolArguments(tool.name, tool.schema, args);
};

type AgentToolCallResult = {
  content: [{ type: "text"; text: string }];
  structuredContent?: Record<string, unknown>;
  isError?: true;
};

/**
 * A tool call as MCP answers it. The text is compact JSON of the same object as
 * `structuredContent`, which the spec asks for so a client that reads only text still gets
 * everything, and which indentation would have made a quarter longer. A refusal or a failure
 * is a result with `isError`, in plain words the model reads; it carries no `structuredContent`,
 * because a client validating against a tool's `outputSchema` would reject it. An unknown tool
 * is the caller's protocol mistake and throws.
 */
export const callAgentTool = async (name: string, args: unknown, transport: AgentToolTransport): Promise<AgentToolCallResult> => {
  const tool = requireTool(name, transport);
  try {
    const structured = await tool.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(structured) }], structuredContent: structured };
  } catch (error) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }], isError: true };
  }
};
