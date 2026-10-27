#!/usr/bin/env bun
/**
 * The reviewed-case registry: human labels on advisory findings, kept as
 * versioned evaluation evidence.
 *
 * Every loop that ships a model judgment produces findings a person either
 * keeps or rejects. This is the shared store for those decisions: when a
 * reviewer marks a counterevidence packet's finding as useful or a false alarm,
 * `add` records the exact input, the candidate, and the expected labels the
 * verdict implies. `export-eval` turns the registry into the input shape
 * `--mode eval` scores, so reviewed cases become held-out evaluation evidence
 * for routing and retrieval decisions (the "reviewed cases → measured changes"
 * loop).
 *
 * The registry is committed and append-only by hand; a labeled case is not
 * deleted, only superseded. Ids are unique per entry. The derived eval suite
 * goes to artifacts/ (gitignored) and is reproducible from the registry.
 *
 * Usage:
 *   bun run reviewed-cases:add -- --input <counterevidence-input.json> --candidate <id> --label useful|false-alarm --side challenge|support [--reviewer name] [--registry path]
 *   bun run reviewed-cases:export-eval [--out <file>] [--registry path]
 *   bun run reviewed-cases:list [--registry path]
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { counterevidenceInputSchema, type CounterevidenceInput } from "../lib/jev/counterevidence";

export const REGISTRY_PATH = "data/reviewed-cases/cases.json";
export const DEFAULT_EVAL_OUT = "artifacts/reviewed-cases/eval-suite.json";

export type ReviewLabel = "useful" | "false-alarm";
export type ReviewSide = "challenge" | "support";

export type ReviewedCase = {
  id: string;
  kind: "counterevidence";
  createdAt: string;
  reviewer: string;
  candidateId: string;
  side: ReviewSide;
  label: ReviewLabel;
  input: CounterevidenceInput;
  expected: Record<string, boolean>;
};

const reviewedCaseSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("counterevidence"),
  createdAt: z.string(),
  reviewer: z.string().min(1),
  candidateId: z.string().min(1),
  side: z.enum(["challenge", "support"]),
  label: z.enum(["useful", "false-alarm"]),
  input: counterevidenceInputSchema,
  expected: z.record(z.string(), z.boolean()),
});

export const registrySchema = z.array(reviewedCaseSchema)
  .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, "reviewed case ids must be unique");

export const parseRegistry = (value: unknown): ReviewedCase[] => registrySchema.parse(value);

export const readRegistry = (registryPath = REGISTRY_PATH): ReviewedCase[] => {
  if (!existsSync(registryPath)) return [];
  return parseRegistry(JSON.parse(readFileSync(registryPath, "utf8")));
};

/**
 * The labels a verdict implies, for one candidate in one counterevidence
 * input. `challenge + useful` means the packet was right to list it and the
 * excerpt carried the challenge; `false-alarm` means the model over-flagged it.
 * Returns null when the input does not contain the candidate.
 */
export const buildExpectedLabels = (
  input: CounterevidenceInput,
  candidateId: string,
  side: ReviewSide,
  label: ReviewLabel,
): Record<string, boolean> | null => {
  const index = input.candidates.findIndex((candidate) => candidate.id === candidateId);
  if (index < 0) return null;
  if (side === "challenge") {
    return label === "useful"
      ? { [`challenges_${index}`]: true, [`supported_${index}`]: true }
      : { [`challenges_${index}`]: false };
  }
  return label === "useful"
    ? { [`supported_${index}`]: true, [`challenges_${index}`]: false }
    : { [`supported_${index}`]: false };
};

export const newReviewedCaseId = (candidateId: string): string =>
  `ce-${Date.now()}-${candidateId}`;

export const appendReviewedCase = (entries: ReviewedCase[], entry: ReviewedCase): ReviewedCase[] => {
  const next = [...entries, entry];
  parseRegistry(next); // throws on a duplicate id or a malformed entry
  return next;
};

/** The eval-suite shape `--mode eval` scores (`{ cases: [{ kind, id, input, expected }] }`). */
export const toEvalSuite = (entries: ReviewedCase[]) => ({
  cases: entries.map((entry) => ({
    kind: "counterevidence" as const,
    id: entry.id,
    input: entry.input,
    expected: entry.expected,
  })),
});

const flag = (argv: string[], name: string): string | undefined => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
};

const writeJson = (file: string, value: unknown) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const command = process.argv[2] ?? "list";
const registryPath = flag(process.argv, "registry") ?? REGISTRY_PATH;

if (command === "add") {
  const inputPath = flag(process.argv, "input");
  const candidateId = flag(process.argv, "candidate");
  const label = flag(process.argv, "label");
  const side = flag(process.argv, "side");
  const reviewer = flag(process.argv, "reviewer") ?? "owner";
  if (!inputPath || !candidateId || !label || !side) {
    console.error("reviewed-cases: add requires --input <json> --candidate <id> --label useful|false-alarm --side challenge|support");
    process.exit(2);
  }
  if (label !== "useful" && label !== "false-alarm") {
    console.error("reviewed-cases: --label must be useful or false-alarm.");
    process.exit(2);
  }
  if (side !== "challenge" && side !== "support") {
    console.error("reviewed-cases: --side must be challenge or support.");
    process.exit(2);
  }
  const input = counterevidenceInputSchema.parse(JSON.parse(readFileSync(inputPath, "utf8")));
  const expected = buildExpectedLabels(input, candidateId, side, label);
  if (!expected) {
    console.error(`reviewed-cases: candidate "${candidateId}" is not in ${inputPath}.`);
    process.exit(2);
  }
  const entry: ReviewedCase = {
    id: newReviewedCaseId(candidateId),
    kind: "counterevidence",
    createdAt: new Date().toISOString(),
    reviewer,
    candidateId,
    side,
    label,
    input,
    expected,
  };
  const next = appendReviewedCase(readRegistry(registryPath), entry);
  writeJson(registryPath, next);
  console.log(`reviewed-cases: recorded ${entry.id} (${side} · ${label}) for candidate "${candidateId}" against ${input.canonical.recordDate}; registry now holds ${next.length}.`);
} else if (command === "export-eval") {
  const out = flag(process.argv, "out") ?? DEFAULT_EVAL_OUT;
  const entries = readRegistry(registryPath);
  writeJson(out, toEvalSuite(entries));
  console.log(`reviewed-cases: wrote ${entries.length} case(s) to ${out} — score with bun run audit:jev-copy -- --mode eval --input ${out}`);
} else if (command === "list") {
  const entries = readRegistry(registryPath);
  if (entries.length === 0) {
    console.log("reviewed-cases: the registry is empty. Label a finding with `bun run reviewed-cases:add`.");
  } else {
    for (const entry of entries) {
      console.log(`  ${entry.id}  ${entry.side} · ${entry.label}  candidate "${entry.candidateId}"  ${entry.createdAt.slice(0, 10)}`);
    }
    console.log(`reviewed-cases: ${entries.length} case(s) in the registry.`);
  }
} else {
  console.error("reviewed-cases: command must be add, export-eval or list.");
  process.exit(2);
}