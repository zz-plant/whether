import { z } from "zod";
import { buildAgentInterfaceResponse, loadAgentInterfaceContext, pullRecentSiteInfo, supportedAgentCadences } from "../agentInterface";
import { agentSkills } from "../agentSkills";
import { agentStateSchema, buildAgentState } from "../agentState";
import { getHistoricalAnalogPlaybook } from "../analogPlaybook";
import { stressTestDecisionPlan } from "../decisionShield";
import { loadCanonicalReportInputs } from "../ingestion/materialized";
import { DEFAULT_THRESHOLDS } from "../regimeEngineCore";
import { buildCanonicalBoundedDecisionRules, formatBoundedDecisionTriplet } from "../report/boundedDecisionRules";
import { getRegimeContext, projectRegimeFromPace } from "../report/regimeContext";
import { buildUseConstraint } from "../report/useConstraint";
import { fetchSaaSValuations, SAAS_BASKET } from "../saasMultiples";
import { getTimeMachineMonthsByYear } from "../timeMachine/timeMachineCache";
import { buildStandupLine } from "../report/decisionMovement";
import { auditSprintDecisions, type SprintDecisionCandidate } from "../report/sprintRetro";
import { loadWeeklyBriefSnapshot } from "../report/weeklyBriefSnapshot";
import {
  findPublishedBrief,
  getPublishedBriefs,
  publishedBriefDisplay,
  publishedBriefHeadline,
  buildPublishedBriefPath,
} from "../report/publishedBriefs";
import {
  findPostureArchivePeriod,
  getPostureArchivePeriods,
  buildPostureArchivePath,
} from "../summary/postureArchive";
import { answerPages, matchDecisionPage } from "../../app/answers/decisionPages";
import { getRegimePublicLabel } from "../regimePresentation";
import { buildCanonicalUrl } from "../seo";
import { REGIME_KEYS, SIGNAL_KEYS, lifecycleInput, lowerCasedInput, numberInput, regimeInput, signalKeyInput, textInput } from "./inputs";
import { AgentInputError, createAgentToolRegistry, defineTool } from "./registry";

/**
 * Every tool an agent can call, defined once.
 *
 * There were two MCP servers, five tools against twelve, under two names, with the input
 * vocabulary and the refusals written out separately in each, plus a plain-GET catalogue
 * that listed six and a discovery manifest that listed none. A tool added to one was
 * missing from the rest, and nothing said so. Now a tool is one definition here, and the
 * remote server, the local server, the GET shim, the manifest and `/llms.txt` all read it.
 *
 * Each tool's arguments are parsed before it runs (`registry.ts`, in the words `inputs.ts`
 * defines), so a caller that is wrong is told what would have been right; `run` returns an
 * object, because MCP's `structuredContent` must be one. Every tool here only reads, which is
 * `defineTool`'s default.
 */

const REGIME_ARGUMENT =
  "A regime by key (SCARCITY, DEFENSIVE, VOLATILE, EXPANSION) or by the word the site prints (Freezing, Cloudy, Stormy, Sunny), in any case.";

const cadenceInput = z.preprocess(lowerCasedInput, z.enum(supportedAgentCadences));

/** What `get_answer` returns: one answer page's guidance with this week's standing and rules. */
export const decisionAnswerOutputSchema = z.looseObject({
  type: z.literal("decision_answer"),
  slug: z.string(),
  title: z.string(),
  permalink: z.string(),
  category: z.enum(["climate", "decision", "explanation"]),
  shortAnswer: z.string(),
  directAnswer: z.string(),
  audience: z.string(),
  currentStanding: z.object({
    recordDate: z.string(),
    conditions: z.string(),
    scores: z.looseObject({ tightness: z.number(), riskAppetite: z.number() }),
  }),
  rulesInForce: z.array(
    z.object({
      area: z.string(),
      actionNow: z.string(),
      pauseIf: z.string(),
      resumeWhen: z.string(),
    }),
  ),
  companyInputs: z.array(z.string()),
  decisionNoteTemplate: z.string(),
  citation: z.string(),
  attributionSnippet: z.string(),
  use: z.object({ summary: z.string(), humanReview: z.string(), policy: z.string() }),
});

/** Where an input came from, so an answer computed from today's reading says so instead of passing as the caller's own. */
const used = <Value extends string | number>(value: Value, from: "given" | "today" | "assumed") => ({ value, from });

/* One loader for every tool that reads today's reading: the context the full brief and the state
   are built from. The plan checks went through `loadWeeklyBriefSnapshot`, which loads the same
   report data the same way (no search params, so never a historical reading, and the bundled
   snapshot when assembly fails) and then builds the whole homepage model, which they discarded;
   they read only the assessment. */
const todayContext = () => loadAgentInterfaceContext("/api/mcp");

const todayAssessment = async () => (await todayContext()).reportData.assessment;

const todayState = async () => buildAgentState(await todayContext());

const rulesFor = (regime: (typeof REGIME_KEYS)[number]) =>
  buildCanonicalBoundedDecisionRules({
    regime,
    thresholds: DEFAULT_THRESHOLDS,
    scores: { tightness: 50, riskAppetite: 50 },
  }).map((rule) => ({ area: rule.area, ...formatBoundedDecisionTriplet(rule) }));

const AGENT_TOOLS = [
  defineTool({
    name: "get_state",
    title: "Get the current state",
    description:
      "Start here. The current reading in one small answer of about 3KB. It holds the conditions and the margin from their change lines, the data's freshness, each score against its pause, resume and change lines, the moves behind each score since the earlier reading, the areas whose pause or resume lines those moves crossed, and the guidance. automation.ready says whether the data is live and current.",
    input: {},
    output: agentStateSchema,
    example: {},
    run: async () => ({ ...(await todayState()) }),
  }),
  defineTool({
    name: "get_brief",
    title: "Get the full weekly brief",
    description:
      "The full brief (about 22KB): summary prose, decision delta, flip watch, provenance and the agent handoff, for a cadence. Use get_state when you only need to decide; use week (e.g. '2026-w41') or period (e.g. '2024-q1') to retrieve frozen historical records.",
    aliases: ["get_agent_brief"],
    input: {
      cadence: cadenceInput.optional().describe("weekly (default), monthly, quarterly or yearly."),
      week: textInput.optional().describe("A specific published week slug (e.g. '2026-w41') to fetch that frozen record."),
      period: textInput.optional().describe("A specific archive period slug (e.g. '2024-q1' or '2023') to fetch that frozen posture record."),
    },
    example: { cadence: "weekly" },
    plainGetNote: "Over plain GET it answers a summary instead (regime, action, margin, record date); get_state is the answer to decide from.",
    run: async ({ cadence, week, period }) => {
      if (week) {
        const brief = findPublishedBrief(week.toLowerCase());
        if (!brief) {
          throw new Error(`Published brief '${week}' not found. Available weeks: ${getPublishedBriefs().map((b) => b.slug).join(", ")}`);
        }
        const display = publishedBriefDisplay(brief);
        return {
          type: "published_brief",
          slug: brief.slug,
          year: brief.year,
          week: brief.week,
          publishedAt: brief.publishedAt,
          recordDate: brief.recordDate,
          recordDateLabel: brief.recordDateLabel,
          headline: publishedBriefHeadline(brief).composed,
          /* The headline's action. The record's own field is the action the headline stopped
             leading with on 2026-10-09, kept as the source of the week's direction. */
          actionNow: publishedBriefHeadline(brief).action,
          regime: brief.regime,
          conditions: display.conditions,
          confidence: { label: brief.confidenceLabel },
          scores: brief.scores ?? null,
          whatChanged: display.whatChanged,
          pauseIf: display.pauseIf,
          conditionsChangeIf: display.conditionsChangeIf,
          decisions: brief.decisions,
          evidence: brief.evidence,
          sourceLabel: brief.sourceLabel,
          permalink: buildCanonicalUrl(buildPublishedBriefPath(brief.slug)),
          use: buildUseConstraint(),
        };
      }
      if (period) {
        const archivePeriod = findPostureArchivePeriod(period.toLowerCase());
        if (!archivePeriod) {
          throw new Error(`Archive period '${period}' not found. Available periods: ${getPostureArchivePeriods().map((p) => p.slug).join(", ")}`);
        }
        return {
          type: "posture_archive_period",
          ...archivePeriod,
          permalink: buildCanonicalUrl(buildPostureArchivePath(archivePeriod.slug)),
          use: buildUseConstraint(),
        };
      }
      return { ...(await buildAgentInterfaceResponse(cadence ?? "weekly", { route: "/api/mcp" })), use: buildUseConstraint() };
    },
  }),
  defineTool({
    name: "get_answer",
    title: "Get decision answer",
    description:
      "Get Whether's curated operating guidance, current standing, and bounded rules for one of its decision answers — hiring, roadmap expansion, raising capital, burn, sales headcount, product lines, go-to-market, briefing executives, or this week's funding climate and risk-on/risk-off posture.",
    input: {
      question: textInput.describe("A question, topic, or answer slug (e.g. 'should-we-freeze-or-selectively-hire', 'should we freeze hiring', 'cut burn')."),
    },
    example: { question: "should-we-freeze-or-selectively-hire" },
    output: decisionAnswerOutputSchema,
    run: async ({ question }) => {
      const page = matchDecisionPage(question);
      if (!page) {
        const availableTopics = answerPages.map((candidate) => candidate.slug);
        const message = `No answer found matching ${JSON.stringify(question)}. Available decision topics: ${availableTopics.join(", ")}.`;
        throw new AgentInputError(message, "invalid_arguments", [
          { argument: "question", message: `Unknown decision topic ${JSON.stringify(question)}.`, allowed: availableTopics },
        ]);
      }
      const { reportData, snapshot } = await loadWeeklyBriefSnapshot();
      const mappedRules = snapshot.homeBriefModel.decisionRules.filter((rule) =>
        page.mappedDecisionAreas.includes(rule.area),
      );
      const permalink = buildCanonicalUrl(`/answers/${page.slug}`);
      const recordDate = reportData.recordDateLabel;
      const conditions = getRegimePublicLabel(reportData.assessment.regime);

      return {
        type: "decision_answer",
        slug: page.slug,
        title: page.title,
        permalink,
        category: page.category,
        shortAnswer: page.shortAnswer,
        directAnswer: page.directAnswer,
        audience: page.audience,
        currentStanding: {
          recordDate,
          conditions,
          scores: reportData.assessment.scores,
        },
        rulesInForce: mappedRules.map((rule) => ({
          area: rule.area,
          actionNow: rule.doNow[0] ?? rule.recommendation,
          pauseIf: rule.pauseTrigger,
          resumeWhen: rule.resumeTrigger,
        })),
        companyInputs: page.companyInputs,
        decisionNoteTemplate: page.decisionNote,
        citation: `Whether Weekly Brief (Week of ${recordDate}): "${page.title}" — ${permalink}`,
        attributionSnippet: `According to Whether's weekly guidance for startup leaders (Week of ${recordDate}, ${permalink}): "${page.shortAnswer}"`,
        use: buildUseConstraint(),
      };
    },
  }),
  defineTool({
    name: "get_standup_line",
    title: "Get the daily standup line",
    description:
      "Returns the daily standup one-liner stating guidance movement this week and the conditions that would change it.",
    input: {},
    example: {},
    run: async () => {
      const { reportData, snapshot } = await loadWeeklyBriefSnapshot();
      const line = buildStandupLine({
        regime: reportData.assessment.regime,
        change: snapshot.homeBriefModel.weeklyLeadershipSummary.guidanceChange,
        weeklyCall: snapshot.weeklyCall,
        assessment: reportData.assessment,
      });
      return {
        standupLine: line,
        regime: reportData.assessment.regime,
        guidanceChange: snapshot.homeBriefModel.weeklyLeadershipSummary.guidanceChange,
        recordDate: reportData.treasury.record_date,
      };
    },
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
      "How long a regime has lasted, how long its past runs lasted, and what most often came next, in months of month-end snapshots up to `latestSnapshot`. Defaults to today's conditions; `inputs` says which values were yours and which were today's.",
    input: { regime: regimeInput.optional().describe(`${REGIME_ARGUMENT} Defaults to today's conditions.`) },
    example: { regime: "DEFENSIVE" },
    run: async ({ regime }) => {
      const resolved = regime ?? (await todayState()).conditions.key;
      const context = getRegimeContext(resolved);
      const { latestSnapshot } = context;
      const recentTransitions = getPostureArchivePeriods().find((p) => p.transitions.length > 0)?.transitions.slice(0, 5) ?? [];
      const recentBriefs = getPublishedBriefs().slice(0, 5).map((b) => ({
        week: b.slug,
        publishedAt: b.publishedAt,
        regime: b.regime,
        action: b.actionNow,
      }));
      return {
        ...context,
        recentTransitions,
        recentBriefs,
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
      "Weeks until the scores cross a line where conditions change at a given pace, and the regime they would then be in. A score moving away from its line does not cross it. With no arguments it uses today's scores and their pace; give scores to ask what-if, and any pace you leave out is taken as 0. `inputs` says which values were yours, which were today's, and which were assumed.",
    input: {
      regime: regimeInput.optional().describe(`${REGIME_ARGUMENT} Defaults to today's conditions. The projection runs from where the scores sit; the result says so when they sit in another regime.`),
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
      const { sitsIn, ...projection } = projectRegimeFromPace({
        tightness: resolvedTightness,
        riskAppetite: resolvedRiskAppetite,
        tightnessPerWeek: inputs.tightnessDelta.value,
        riskAppetitePerWeek: inputs.riskAppetiteDelta.value,
      });
      return {
        ...projection,
        /* The scores decide, not the label: today's committed regime can lag them (a change waits
           for confirmation), and a caller can give a regime the scores do not describe. */
        ...(sitsIn === resolvedRegime
          ? {}
          : { note: `These scores sit in ${sitsIn}, not ${resolvedRegime} (a change waiting for confirmation, or a regime that does not match the scores): the projection runs from the scores.` }),
        inputs,
      };
    },
  }),
  defineTool({
    name: "get_comps",
    title: "Get SaaS valuation comps",
    description: `Median SaaS EV/Revenue multiple across ${SAAS_BASKET.length} public companies, from SEC filings and delayed prices, or Yahoo Finance when those are down; the result names its source. Fails with each source's reason when none answers.`,
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
      "Audits a proposed operational decision (hiring, cloud commit, office lease, GTM pricing) against today's funding pressure and risk appetite, and returns the fragile assumptions, the pause line and the resume line.",
    input: {
      planText: textInput.describe("The planned decision or initiative in plain English."),
      lifecycle: lifecycleInput.optional().describe("Company lifecycle stage; defaults to GROWTH."),
    },
    example: { planText: "Sign a three-year cloud commitment" },
    run: async ({ planText, lifecycle }) => {
      return { ...stressTestDecisionPlan(await todayAssessment(), { planText, lifecycle: lifecycle ?? "GROWTH" }) };
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
      return { ...stressTestDecisionPlan(await todayAssessment(), { planText: specText }) };
    },
  }),
  defineTool({
    name: "lint_sprint_goal",
    title: "Lint a sprint goal against today's conditions",
    description:
      "Takes a sprint goal or story-level plan and says whether it holds, pauses, or needs a written way to undo it under today's conditions, with the pause line that would fire. A sprint goal is a planned decision at smaller granularity, so this reuses the stress-test engine.",
    input: {
      goalText: textInput.describe("The sprint goal or story-level plan in plain English."),
      lifecycle: lifecycleInput.optional().describe("Company lifecycle stage; defaults to GROWTH."),
    },
    example: { goalText: "Hire two contractors for the launch" },
    run: async ({ goalText, lifecycle }) => {
      const plan = stressTestDecisionPlan(await todayAssessment(), { planText: goalText, lifecycle: lifecycle ?? "GROWTH" });
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
    name: "audit_sprint_retro",
    title: "Audit sprint decisions for regime pause violations",
    description:
      "Audits a sprint's recorded commitments against today's bounded pause triggers to surface retro violations (e.g. net-new hiring or platform rewrites committed while pause lines are active).",
    input: {
      planText: textInput.optional().describe("A planned decision or commitment to evaluate against pause lines."),
      lifecycle: lifecycleInput.optional().describe("Company lifecycle stage; defaults to GROWTH."),
    },
    example: { planText: "Hired 2 senior engineers during defensive regime" },
    run: async ({ planText, lifecycle }) => {
      const assessment = await todayAssessment();
      if (!planText) {
        const report = auditSprintDecisions({
          decisions: [],
          regime: assessment.regime,
          scores: assessment.scores,
          thresholds: assessment.thresholds,
        });
        return {
          headline: report.headline,
          regime: report.regime,
          activePauseTriggers: report.activePauseTriggers,
          markdown: report.markdown,
        };
      }
      const plan = stressTestDecisionPlan(assessment, { planText, lifecycle: lifecycle ?? "GROWTH" });
      const candidate: SprintDecisionCandidate = {
        title: planText,
        category: plan.detectedCategory,
        action: plan.detectedAction,
        verdict: plan.verdict,
      };
      const report = auditSprintDecisions({
        decisions: [candidate],
        regime: assessment.regime,
        scores: assessment.scores,
        thresholds: assessment.thresholds,
      });
      return {
        headline: report.headline,
        regime: report.regime,
        violationCount: report.violationCount,
        violations: report.violations,
        activePauseTriggers: report.activePauseTriggers,
        markdown: report.markdown,
      };
    },
  }),
  defineTool({
    name: "get_analog_playbook",
    title: "Get the historical analog playbook",
    description:
      "Matches today's conditions against four hand-picked past periods (Q3 2007, Q4 2018, Q2 2021, Q2 2022) and returns, for the closest, the common mistake then, the move that held up, and the sign that marked the turn. Editorial summaries of the public record, not a measured sample of companies.",
    input: {},
    example: {},
    run: async () => {
      return { ...getHistoricalAnalogPlaybook(await todayAssessment()) };
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

const registry = createAgentToolRegistry(AGENT_TOOLS);

export const listAgentTools = registry.listAgentTools;
export const describeAgentTools = registry.describeAgentTools;
export const runAgentTool = registry.runAgentTool;
export const checkAgentToolArguments = registry.checkAgentToolArguments;
export const callAgentTool = registry.callAgentTool;
