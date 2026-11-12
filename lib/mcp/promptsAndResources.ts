import { AgentInputError, type AgentToolTransport } from "../agent/registry";
import { runAgentTool } from "../agent/tools";
import { getPublishedBriefs } from "../report/publishedBriefs";

/**
 * MCP prompts and resources, over the same tools every transport serves.
 *
 * Tools are for a model to call; prompts and resources are for the person using the client.
 * A client shows prompts as commands ("/check-plan") and resources as things to attach, so
 * someone who never asks the model to call get_state can still bring this week's call into a
 * conversation. Neither adds data or logic: each one runs a tool from `lib/agent/tools.ts`
 * and is counted in telemetry as that tool, because it is that answer.
 *
 * Prompts carry their answer with them. `check-plan` runs stress_test_plan before the model
 * sees anything, so the verdict, the pause line and the restart line arrive as data rather
 * than as an instruction to go and call a tool the client may not allow.
 *
 * No subscriptions: the remote transport is stateless (a fresh server per request), so it has
 * nowhere to hold one. A client that wants to know when the call changes reads `get_state`'s
 * `freshness.nextCallDue` and comes back then.
 */

const JSON_MIME = "application/json";

/** How many frozen weeks `resources/list` names; every other week is reachable by the template. */
const LISTED_WEEKS = 8;

const STATE_URI = "whether://state";
const WEEKLY_BRIEF_URI = "whether://brief/weekly";
const WEEK_URI_PREFIX = "whether://weeks/";
const WEEK_URI_TEMPLATE = `${WEEK_URI_PREFIX}{week}`;

const asJson = (value: unknown) => JSON.stringify(value);

export const listWhetherResources = () => ({
  resources: [
    {
      uri: STATE_URI,
      name: "state",
      title: "This week's call",
      description:
        "The current conditions, each score against its pause and restart lines, the guidance and whether the data is current (about 3KB). The same answer as get_state.",
      mimeType: JSON_MIME,
    },
    {
      uri: WEEKLY_BRIEF_URI,
      name: "weekly-brief",
      title: "The full weekly brief",
      description: "Summary, decision delta, flip watch and provenance (about 22KB). The same answer as get_brief.",
      mimeType: JSON_MIME,
    },
    ...getPublishedBriefs()
      .slice(0, LISTED_WEEKS)
      .map((brief) => ({
        uri: `${WEEK_URI_PREFIX}${brief.slug}`,
        name: `week-${brief.slug}`,
        title: `Published brief, ${brief.recordDateLabel}`,
        description: `The frozen brief for ${brief.slug}, as published.`,
        mimeType: JSON_MIME,
      })),
  ],
});

export const listWhetherResourceTemplates = () => ({
  resourceTemplates: [
    {
      uriTemplate: WEEK_URI_TEMPLATE,
      name: "published-week",
      title: "A published week's brief",
      description: "The frozen brief for one published week, by slug (e.g. 2026-w41). The same answer as get_brief with week.",
      mimeType: JSON_MIME,
    },
  ],
});

/** Which tool answers a resource, and with what. Null for a URI this server does not serve. */
const toolForUri = (uri: string): { tool: string; args: Record<string, string> } | null => {
  if (uri === STATE_URI) return { tool: "get_state", args: {} };
  if (uri === WEEKLY_BRIEF_URI) return { tool: "get_brief", args: { cadence: "weekly" } };
  if (uri.startsWith(WEEK_URI_PREFIX)) {
    const week = decodeURIComponent(uri.slice(WEEK_URI_PREFIX.length));
    if (/^\d{4}-w\d{1,2}$/i.test(week)) return { tool: "get_brief", args: { week } };
  }
  return null;
};

/** Thrown for a URI or prompt this server does not have; the transport answers it as invalid params. */
export class McpItemRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpItemRequestError";
  }
}

export const readWhetherResource = async (uri: string, transport: AgentToolTransport) => {
  const target = toolForUri(uri);
  if (!target) {
    throw new McpItemRequestError(
      `Unknown resource ${JSON.stringify(uri)}. Served: ${STATE_URI}, ${WEEKLY_BRIEF_URI}, ${WEEK_URI_TEMPLATE}.`,
    );
  }
  let result: Record<string, unknown>;
  try {
    result = await runAgentTool(target.tool, target.args, transport);
  } catch (error) {
    // get_brief refuses an unknown week with the list of weeks it has; that is the caller's URI, not a fault.
    if (target.args.week) throw new McpItemRequestError(error instanceof Error ? error.message : String(error));
    throw error;
  }
  return { contents: [{ uri, mimeType: JSON_MIME, text: asJson(result) }] };
};

type PromptArgument = { name: string; description: string; required: boolean };

type WhetherPrompt = {
  name: string;
  title: string;
  description: string;
  arguments: readonly PromptArgument[];
  build: (args: Record<string, string>, transport: AgentToolTransport) => Promise<string>;
};

/* The words every prompt ends on, from the use limits get_state carries: an answer quotes the
   reading's date and links its page, and is checked by a person when the data is not current. */
const ANSWER_RULES =
  "Quote the reading's date and link the page the answer came from. " +
  "If automation.ready is false, say the reading is not current and do not present the call as this week's. " +
  "The call is the same for every company: apply it to the company's own runway and stage where they are given, and do not assume a team, a board or an approver the user has not mentioned.";

const block = (label: string, value: unknown) => `${label}:\n${asJson(value)}`;

/* A tool's refusal is an answer a prompt can carry; anything else is a fault and propagates. */
const runOrRefusal = async (tool: string, args: Record<string, unknown>, transport: AgentToolTransport) => {
  try {
    return await runAgentTool(tool, args, transport);
  } catch (error) {
    if (error instanceof AgentInputError) return { refused: error.message };
    throw error;
  }
};

const optionalNumber = (value: string | undefined) => {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const PROMPTS: readonly WhetherPrompt[] = [
  {
    name: "check-plan",
    title: "Check a plan against this week's call",
    description: "Grades a planned decision (a hire, a cloud commitment, a lease, a raise) against this week's conditions, with its pause and restart lines.",
    arguments: [
      { name: "plan", description: "The plan in plain English, e.g. 'hire two engineers in Q1'.", required: true },
      { name: "runway_months", description: "Months of runway, if known.", required: false },
    ],
    build: async ({ plan, runway_months }, transport) => {
      const runwayMonths = optionalNumber(runway_months);
      const [state, test] = await Promise.all([
        runAgentTool("get_state", {}, transport),
        runOrRefusal("stress_test_plan", { planText: plan, ...(runwayMonths === undefined ? {} : { runwayMonths }) }, transport),
      ]);
      return [
        `Does this plan hold up under this week's conditions? Plan: ${plan}`,
        "Lead with the verdict, then the line that would pause it and the line that would let it go ahead. " +
          "Name the fragile assumptions the test found. If the verdict is null, say the test has no rules for this kind of decision and point to the answer it names.",
        ANSWER_RULES,
        block("Stress test (stress_test_plan)", test),
        block("This week's state (get_state)", state),
      ].join("\n\n");
    },
  },
  {
    name: "answer-question",
    title: "Answer an operating question",
    description: "Answers a hiring, fundraising, burn or pricing question with this week's standing and the rules in force.",
    arguments: [{ name: "question", description: "The question as asked, e.g. 'should we raise now or wait?'.", required: true }],
    build: async ({ question }, transport) => {
      const answer = await runOrRefusal("get_answer", { question }, transport);
      return [
        `Answer this question from Whether's guidance: ${question}`,
        "Give the short answer first, then the rules in force that bear on it. " +
          "If the answer was refused, say Whether has no answer for this question and pass on where the refusal points, rather than stretching another answer to fit.",
        ANSWER_RULES,
        block("Answer (get_answer)", answer),
      ].join("\n\n");
    },
  },
  {
    name: "share-this-week",
    title: "Write this week's call to share",
    description: "A short paste-ready note: the call, the line that would change it, and the date, for a channel, a doc or your own notes.",
    arguments: [],
    build: async (_args, transport) => {
      const [state, standup] = await Promise.all([
        runAgentTool("get_state", {}, transport),
        runAgentTool("get_standup_line", {}, transport),
      ]);
      return [
        "Write this week's Whether call as a note of at most four lines that someone can paste as is: " +
          "the conditions and the call, what changed since the earlier reading, the line that would change the call, and the reading's date with a link.",
        "Use the state's own words for the conditions and the guidance; do not add advice it does not give.",
        ANSWER_RULES,
        block("Standup line (get_standup_line)", standup),
        block("This week's state (get_state)", state),
      ].join("\n\n");
    },
  },
];

export const listWhetherPrompts = () => ({
  prompts: PROMPTS.map(({ name, title, description, arguments: args }) => ({ name, title, description, arguments: [...args] })),
});

export const getWhetherPrompt = async (name: string, args: Record<string, string> | undefined, transport: AgentToolTransport) => {
  const prompt = PROMPTS.find((candidate) => candidate.name === name);
  if (!prompt) {
    throw new McpItemRequestError(`Unknown prompt ${JSON.stringify(name)}. Available: ${PROMPTS.map((candidate) => candidate.name).join(", ")}.`);
  }
  const given = args ?? {};
  const missing = prompt.arguments.filter((arg) => arg.required && !given[arg.name]?.trim()).map((arg) => arg.name);
  if (missing.length > 0) {
    throw new McpItemRequestError(`Prompt ${name} needs ${missing.join(" and ")}.`);
  }
  const text = await prompt.build(given, transport);
  return {
    description: prompt.description,
    messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
  };
};
