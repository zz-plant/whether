import { NextResponse } from "next/server";
import { z } from "zod";
import { numberInput } from "../agent/inputs";
import { AgentInputError, parseNamedArguments } from "../agent/registry";

/**
 * What each `/api/cli/*` route takes in its query string, and the refusal for anything else.
 *
 * Each route's query is a strict zod object read by the agent tools' own parser
 * (`parseNamedArguments`, `lib/agent/registry.ts`), with the agent inputs where they mean the
 * same thing (`numberInput` for a scenario's scores). It was an allowlist checked by hand
 * beside a parser per parameter, and the scenario route parsed its numbers itself.
 *
 * The refusals keep the bodies older CLI copies and curl scripts read (`error`, and
 * `unsupported` / `supported` for a name a route does not take) and add `problems`, the
 * per-argument detail an agent tool's refusal carries. An empty value keeps its meaning
 * here: `asOf=` is not sent, any other empty value is refused. The CLI never sends one.
 */

type CliQueryRequest = {
  nextUrl: {
    searchParams: URLSearchParams;
  };
};

/* A month on the record, as the report loader's search params; `asOf=` is not sent. */
const asOfInput = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .transform((value) => value.split("-").map(Number))
    .refine(([year]) => year >= 2000, "Year out of range")
    .transform(([year, month]) => ({ month: String(month), year: String(year) }))
    .optional(),
);

const weeksInput = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine((weeks) => Number.isInteger(weeks) && weeks >= 1, "Weeks must be a positive integer");

const cliQuery = <Shape extends z.ZodRawShape>(path: string, shape: Shape) => ({ path, schema: z.strictObject(shape) });

export const CLI_QUERIES = {
  status: cliQuery("/api/cli/status", { asOf: asOfInput, view: z.string().optional() }),
  call: cliQuery("/api/cli/call", { asOf: asOfInput }),
  changes: cliQuery("/api/cli/changes", { asOf: asOfInput }),
  diagnostics: cliQuery("/api/cli/diagnostics", { asOf: asOfInput }),
  regime: cliQuery("/api/cli/regime", { asOf: asOfInput }),
  history: cliQuery("/api/cli/history", { asOf: asOfInput, weeks: weeksInput.optional() }),
  scenario: cliQuery("/api/cli/scenario", { tightness: numberInput.optional(), "risk-appetite": numberInput.optional() }),
};

/* The sentence each refusal has always led with. */
const INVALID_INPUT_ERRORS: Partial<Record<string, string>> = {
  asOf: "Invalid asOf input. Expected YYYY-MM.",
  weeks: "Invalid weeks input. Expected integer between 1 and 52.",
  tightness: "Invalid tightness input.",
  "risk-appetite": "Invalid risk-appetite input.",
};

/**
 * The route's query, typed, or the 400 that refuses it. A name the route does not take is
 * refused first; then the first value it cannot read, in the order the route lists them.
 * A name given twice is read once, at its first value.
 */
export const parseCliQuery = <Schema extends z.ZodObject<z.ZodRawShape, z.core.$ZodObjectConfig>>(
  request: CliQueryRequest,
  { path, schema }: { path: string; schema: Schema },
): z.output<Schema> | NextResponse => {
  const { searchParams } = request.nextUrl;
  const given = Object.fromEntries([...new Set(searchParams.keys())].map((name) => [name, searchParams.get(name)]));
  try {
    return parseNamedArguments(path, schema, given);
  } catch (error) {
    if (!(error instanceof AgentInputError)) throw error;
    const { problems } = error;
    const supported = Object.keys(schema.shape);
    const unsupported = Object.keys(given).filter((name) => !supported.includes(name));
    if (unsupported.length > 0) {
      return NextResponse.json({ error: "Unsupported query parameters.", unsupported, supported, problems }, { status: 400 });
    }
    const firstAtFault = supported.find((name) => problems.some((problem) => problem.argument === name));
    return NextResponse.json({ error: (firstAtFault && INVALID_INPUT_ERRORS[firstAtFault]) ?? error.message, problems }, { status: 400 });
  }
};

/** The history window: the weeks asked for, capped at `maxWeeks`, or the default when none were. */
export const resolveWeeksWindow = ({
  weeks,
  defaultWeeks,
  maxWeeks,
}: {
  weeks: number | undefined;
  defaultWeeks: number;
  maxWeeks: number;
}): { requestedWeeks: number; windowWeeks: number; truncatedToMax: boolean } => {
  const requestedWeeks = weeks ?? defaultWeeks;
  return { requestedWeeks, windowWeeks: Math.min(requestedWeeks, maxWeeks), truncatedToMax: requestedWeeks > maxWeeks };
};
