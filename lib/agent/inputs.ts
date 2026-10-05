import { z } from "zod";
import type { LifecycleStage } from "../decisionShield";
import type { SignalKey } from "../ingestion/types";
import type { RegimeKey } from "../regimeEngineCore";
import { REGIME_LABELS } from "../regimePresentation";

/**
 * What an agent may pass a tool, and what it is told when it passes something else.
 *
 * The tools took a regime as free text and answered an unknown one with a success:
 * `get_context` with "SUNNY", the word the page itself prints for EXPANSION, came back as
 * zero weeks active and no history, which reads as a finding. A cadence the server did not
 * know quietly became weekly. And every refusal said what was missing without saying what
 * was allowed, so the only way to learn the vocabulary was to guess.
 *
 * So the vocabulary lives here once, in the words a caller may plausibly send (the engine
 * key or the word the site prints, in any case), and every refusal carries the values that
 * would have been accepted. What is accepted is wider than what is returned: outputs stay on
 * the keys.
 */

export const REGIME_KEYS = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const satisfies readonly RegimeKey[];

export const SIGNAL_KEYS = [
  "TREASURY_1M",
  "TREASURY_3M",
  "TREASURY_2Y",
  "TREASURY_10Y",
  "BBB_CREDIT_SPREAD",
  "HY_CREDIT_SPREAD",
  "CPI_YOY",
  "UNEMPLOYMENT_RATE",
  "CHICAGO_FCI",
  "VIX_INDEX",
] as const satisfies readonly SignalKey[];

const LIFECYCLE_STAGES = ["DISCOVERY", "GROWTH", "SCALE", "MATURE"] as const satisfies readonly LifecycleStage[];

const upperCased = (value: unknown) => (typeof value === "string" ? value.trim().toUpperCase() : value);

/** A regime by its engine key ("EXPANSION") or by the word the site prints for it ("Sunny"), in any case. */
export const regimeInput = z.preprocess((value) => {
  const wanted = upperCased(value);
  return REGIME_KEYS.find((key) => key === wanted || REGIME_LABELS[key].toUpperCase() === wanted) ?? value;
}, z.enum(REGIME_KEYS));

export const signalKeyInput = z.preprocess(upperCased, z.enum(SIGNAL_KEYS));

export const lifecycleInput = z.preprocess(upperCased, z.enum(LIFECYCLE_STAGES));

export const lowerCasedInput = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : value);

/**
 * A finite number, sent as a number or as text (a query parameter is always text). Zero is a
 * value: the plain-GET shim tested the parsed number for truth and refused `riskAppetite=0`.
 */
export const numberInput = z.preprocess((value) => (typeof value === "string" ? Number(value.trim()) : value), z.number());

export const textInput = z.string().min(1);

type AgentInputProblem = {
  /** The argument at fault, when one is. */
  argument: string | null;
  message: string;
  /** What would have been accepted, when the argument takes a fixed set. */
  allowed?: readonly string[];
};

type AgentInputErrorCode = "invalid_arguments" | "unknown_tool";

/** A caller's input was wrong, and what would have been right. Never a fault in the server. */
export class AgentInputError extends Error {
  readonly code: AgentInputErrorCode;
  readonly problems: readonly AgentInputProblem[];

  constructor(message: string, code: AgentInputErrorCode, problems: readonly AgentInputProblem[] = []) {
    super(message);
    this.name = "AgentInputError";
    this.code = code;
    this.problems = problems;
  }

  /** For a caller that would rather branch on fields than parse the sentence. */
  toJSON() {
    return { code: this.code, message: this.message, problems: this.problems };
  }
}

const quote = (value: unknown) => JSON.stringify(value);

/** A choice as it reads in a refusal: "SCARCITY (Freezing)", so a caller who only knows the page's word finds it. */
const choiceLabel = (argument: string, choice: string) => {
  const key = REGIME_KEYS.find((candidate) => candidate === choice);
  return argument === "regime" && key ? `${key} (${REGIME_LABELS[key]})` : choice;
};

/** An argument sent empty is an argument not sent: a model that has nothing to put in a slot fills it with "" or null. */
const presentArguments = (args: unknown): Record<string, unknown> => {
  if (args === undefined || args === null) return {};
  if (typeof args !== "object" || Array.isArray(args)) {
    throw new AgentInputError("Arguments must be an object of named values.", "invalid_arguments", [
      { argument: null, message: "Arguments must be an object of named values." },
    ]);
  }
  return Object.fromEntries(
    Object.entries(args).filter(([, value]) => value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "")),
  );
};

/* What a type is called to a caller: "must be text", not "must be string". */
const TYPE_WORDS: Record<string, string> = { number: "a number", string: "text", boolean: "true or false" };

const describeIssue = (issue: z.core.$ZodIssue, given: Record<string, unknown>, tool: string, takes: readonly string[]): AgentInputProblem => {
  if (issue.code === "unrecognized_keys") {
    const names = issue.keys.map(quote).join(", ");
    return {
      argument: issue.keys[0] ?? null,
      message: `Unknown argument${issue.keys.length === 1 ? "" : "s"} ${names}. ${tool} ${takes.length === 0 ? "takes no arguments" : `takes: ${takes.join(", ")}`}.`,
      allowed: takes,
    };
  }
  const argument = typeof issue.path[0] === "string" ? issue.path[0] : null;
  if (argument === null) return { argument, message: issue.message };
  const received = given[argument];
  const allowed = issue.code === "invalid_value" ? issue.values.map((value) => choiceLabel(argument, String(value))) : undefined;
  const use = allowed ? ` Use one of: ${allowed.join(", ")}.` : "";
  if (received === undefined) {
    return { argument, message: `Missing required argument: ${argument}.${use}`, ...(allowed ? { allowed } : {}) };
  }
  if (allowed) {
    return { argument, message: `Unknown ${argument} ${quote(received)}.${use}`, allowed };
  }
  const expected = issue.code === "invalid_type" ? (TYPE_WORDS[issue.expected] ?? issue.expected) : "a valid value";
  return { argument, message: `Argument ${argument} must be ${expected}; got ${quote(received)}.` };
};

/**
 * The arguments a tool was given, typed, or a refusal that says what would have worked.
 * Unknown argument names are refused rather than ignored: a tool that defaults what it is
 * not told turns a typo (`regim`) into a plausible answer to a question nobody asked.
 */
export const parseToolArguments = <Schema extends z.ZodObject<z.ZodRawShape, z.core.$ZodObjectConfig>>(
  tool: string,
  schema: Schema,
  args: unknown,
): z.output<Schema> => {
  const given = presentArguments(args);
  const parsed = schema.safeParse(given);
  if (parsed.success) return parsed.data;
  const takes = Object.keys(schema.shape);
  const problems = parsed.error.issues.map((issue) => describeIssue(issue, given, tool, takes));
  throw new AgentInputError(problems.map((problem) => problem.message).join(" "), "invalid_arguments", problems);
};
