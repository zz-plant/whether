import { z } from "zod";
import { toPublishedJsonSchema } from "./jsonSchema";

/**
 * The mechanism behind the agent tools, with nothing in it about Whether: what a tool
 * definition is, how its arguments are read and refused, and the list and call paths every
 * transport serves from one set of definitions. The tools are `tools.ts`; the words a caller
 * may send them are `inputs.ts`.
 *
 * It was one file with the tools, and the refusal builder knew one Whether argument by name
 * (`regime`) to print its weather words beside the keys. An input now says how its own choices
 * read (`labelChoices`), so nothing here names an argument.
 */

export type AgentToolTransport = "http" | "stdio";

type ToolArgument = {
  name: string;
  required: boolean;
  type: string | null;
  description: string | null;
  values: readonly string[] | null;
};

type ToolSchema = z.ZodObject<z.ZodRawShape, z.core.$ZodObjectConfig>;

/* MCP's annotations. A tool that only reads cannot destroy anything and gives the same answer
   when called twice, so a client may run it without asking first. One that writes is
   described by the spec's own defaults for a tool that says nothing more: possibly
   destructive, not idempotent. */
type ToolAnnotations = { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: boolean };

type AgentTool = {
  name: string;
  title: string;
  description: string;
  /** Names it has answered to before, so a client configured against one keeps working. */
  aliases: readonly string[];
  transports: readonly AgentToolTransport[];
  annotations: ToolAnnotations;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown> | null;
  arguments: readonly ToolArgument[];
  schema: ToolSchema;
  /** One call that works, as arguments: what the docs and the plain-GET catalogue show. */
  example: Record<string, string | number>;
  /** Where the plain-GET answer differs from the MCP one, for a catalogue to say so. */
  plainGetNote: string | null;
  execute: (args: unknown) => Promise<Record<string, unknown>>;
};

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

/* How an input's fixed choices read in a refusal, set by the input itself. Keyed by the
   schema object, which `.optional()` and `.describe()` wrap rather than copy. */
const choiceLabels = new WeakMap<z.core.$ZodType, (choice: string) => string>();

/**
 * Says how an input's choices read in a refusal ("SCARCITY (Freezing)", so a caller who only
 * knows the page's word finds it), and returns the input. Without one a choice reads as itself.
 */
export const labelChoices = <Input extends z.core.$ZodType>(input: Input, describeChoice: (choice: string) => string): Input => {
  choiceLabels.set(input, describeChoice);
  return input;
};

const choiceLabelFor = (field: z.core.$ZodType | undefined): ((choice: string) => string) | undefined => {
  if (field === undefined) return undefined;
  return choiceLabels.get(field) ?? (field instanceof z.ZodOptional ? choiceLabelFor(field.unwrap()) : undefined);
};

const quote = (value: unknown) => JSON.stringify(value);

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

const describeIssue = (issue: z.core.$ZodIssue, given: Record<string, unknown>, tool: string, schema: ToolSchema): AgentInputProblem => {
  const takes = Object.keys(schema.shape);
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
  const describeChoice = choiceLabelFor(schema.shape[argument]) ?? String;
  const allowed = issue.code === "invalid_value" ? issue.values.map((value) => describeChoice(String(value))) : undefined;
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
 * The named values given, typed, or a refusal that says what would have worked. Unknown names
 * are refused rather than ignored: a tool that defaults what it is not told turns a typo
 * (`regim`) into a plausible answer to a question nobody asked.
 *
 * Takes the values as given; `parseToolArguments` first drops the empty ones, and a caller
 * with a contract of its own for an empty value (the CLI's query string) calls this directly.
 */
export const parseNamedArguments = <Schema extends ToolSchema>(tool: string, schema: Schema, given: Record<string, unknown>): z.output<Schema> => {
  const parsed = schema.safeParse(given);
  if (parsed.success) return parsed.data;
  const problems = parsed.error.issues.map((issue) => describeIssue(issue, given, tool, schema));
  throw new AgentInputError(problems.map((problem) => problem.message).join(" "), "invalid_arguments", problems);
};

/** The arguments a tool was given, typed, with an empty one read as not sent; or a refusal that says what would have worked. */
const parseToolArguments = <Schema extends ToolSchema>(tool: string, schema: Schema, args: unknown): z.output<Schema> =>
  parseNamedArguments(tool, schema, presentArguments(args));

const describeArguments = (schema: ToolSchema): ToolArgument[] =>
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

const annotationsFor = ({ readOnly, openWorld }: { readOnly: boolean; openWorld: boolean }): ToolAnnotations =>
  readOnly
    ? { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: openWorld }
    : { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: openWorld };

export const defineTool = <Shape extends z.ZodRawShape>(tool: {
  name: string;
  title: string;
  description: string;
  input: Shape;
  output?: z.ZodType;
  aliases?: readonly string[];
  transports?: readonly AgentToolTransport[];
  /** False for a tool that changes something, so a client asks before running it. Defaults to true. */
  readOnly?: boolean;
  /** True when the tool reaches a source outside the server's own data. */
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
    annotations: annotationsFor({ readOnly: tool.readOnly ?? true, openWorld: tool.openWorld ?? false }),
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

type AgentToolCallResult = {
  content: [{ type: "text"; text: string }];
  structuredContent?: Record<string, unknown>;
  isError?: true;
};

/** The list and call paths over one set of definitions, which every transport and catalogue reads. */
export const createAgentToolRegistry = (tools: readonly AgentTool[]) => {
  const availableOn = (transport: AgentToolTransport) => tools.filter((tool) => tool.transports.includes(transport));

  const requireTool = (name: string, transport: AgentToolTransport): AgentTool => {
    const tool = availableOn(transport).find((candidate) => candidate.name === name || candidate.aliases.includes(name));
    if (tool) return tool;
    const available = availableOn(transport).map((candidate) => candidate.name);
    const message = `Unknown tool: ${name ? JSON.stringify(name) : "(missing name)"}. Available: ${available.join(", ")}.`;
    throw new AgentInputError(message, "unknown_tool", [{ argument: "name", message, allowed: available }]);
  };

  return {
    /** What `tools/list` answers: the fields a client reads, and nothing it would have to ignore. */
    listAgentTools: (transport: AgentToolTransport) =>
      availableOn(transport).map(({ name, title, description, inputSchema, outputSchema, annotations }) => ({
        name,
        title,
        description,
        inputSchema,
        ...(outputSchema ? { outputSchema } : {}),
        annotations,
      })),

    /** The same tools with what a page or a manifest wants: the arguments, an example, the transports. */
    describeAgentTools: (transport: AgentToolTransport) =>
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
      })),

    /** Runs a tool and returns its object; throws `AgentInputError` for a caller's mistake, anything else for a fault. */
    runAgentTool: async (name: string, args: unknown, transport: AgentToolTransport) => requireTool(name, transport).execute(args),

    /** Refuses arguments the tool would refuse, without running it, for a caller that builds its own answer. */
    checkAgentToolArguments: (name: string, args: unknown, transport: AgentToolTransport): void => {
      const tool = requireTool(name, transport);
      parseToolArguments(tool.name, tool.schema, args);
    },

    /**
     * A tool call as MCP answers it. The text is compact JSON of the same object as
     * `structuredContent`, which the spec asks for so a client that reads only text still gets
     * everything, and which indentation would have made a quarter longer. A refusal or a failure
     * is a result with `isError`, in plain words the model reads; it carries no `structuredContent`,
     * because a client validating against a tool's `outputSchema` would reject it. An unknown tool
     * is the caller's protocol mistake and throws.
     */
    callAgentTool: async (name: string, args: unknown, transport: AgentToolTransport): Promise<AgentToolCallResult> => {
      const tool = requireTool(name, transport);
      try {
        const structured = await tool.execute(args);
        return { content: [{ type: "text", text: JSON.stringify(structured) }], structuredContent: structured };
      } catch (error) {
        return { content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }], isError: true };
      }
    },
  };
};
