/** File-based advisory modes for the existing audit: no read-path inference or delivery side effects. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { artifactAuditSchema, buildArtifactAudit, buildScreenshotAudit, buildEvidenceAudit, selectEvidence, summarizeEvaluation } from "../lib/jev/auditRequests";
import { buildCounterevidenceAudit, buildCounterevidencePacket, counterevidenceInputSchema, summarizeCounterevidencePacket } from "../lib/jev/counterevidence";
import { runJev, type DecisionModel, type JevRequest, type JevResult } from "../lib/jev/jevClient";
import { validateDecisionMedia } from "../lib/jev/jevMedia";
import type { BriefDocument } from "../lib/report/briefArtifact";

const digest = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const QUESTION_VERSION = "whether-decision-audit-v1";
const COUNTEREVIDENCE_QUESTION_VERSION = "whether-counterevidence-v1";
const DEFAULT_INPUT = "artifacts/weekly-slack-brief.txt.audit.json";
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));

export const buildBriefAuditBundle = (document: BriefDocument, engineVersion: string, renderedText: string) => {
  const readingId = digest(JSON.stringify({ document, engineVersion }));
  const identity = { recordDate: document.provenance.recordDate, engineVersion, readingId };
  return artifactAuditSchema.parse({
    canonical: { ...identity, guidance: document.call, action: document.slots.actionNow,
      pauseLine: document.slots.pauseIf || null, resumeLine: document.slots.resumeWhen ?? null,
      changeLine: document.slots.callChangesIf || null, sourceUrl: document.provenance.sourceUrl, context: document },
    artifact: { ...identity, text: renderedText },
  });
};

type Mode = "brief" | "screenshot" | "evidence" | "counterevidence" | "eval";
type AuditArgs = { mode: Mode; inputPath?: string; imagePath?: string; reportDir?: string; threshold: number; models: DecisionModel[] };
type Credentials = { accountId: string; apiToken: string; fetchImpl?: typeof fetch };

const expectedLabels = z.record(z.string(), z.boolean()).refine((values) => Object.keys(values).length > 0);
/* `kind` defaults to artifact so the seeded smoke suite keeps its shape; an
   input that does not match its declared kind is refused. */
const evaluationCaseSchema = z.object({
  kind: z.enum(["artifact", "counterevidence"]).default("artifact"),
  id: z.string().min(1),
  input: z.union([artifactAuditSchema, counterevidenceInputSchema]),
  expected: expectedLabels,
}).refine((item) => item.kind === "counterevidence"
  ? counterevidenceInputSchema.safeParse(item.input).success
  : artifactAuditSchema.safeParse(item.input).success,
"the input does not match the case kind");
const evaluationSchema = z.object({ cases: z.array(evaluationCaseSchema).min(1).max(200)
  .refine((cases) => new Set(cases.map((item) => item.id)).size === cases.length, "case IDs must be unique") });

const imageInput = (file: string) => {
  const extension = path.extname(file).toLowerCase();
  const mime = extension === ".png" ? "image/png" : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : extension === ".webp" ? "image/webp" : null;
  if (!mime) throw new Error("--image must be a local PNG, JPEG or WebP");
  const bytes = readFileSync(file);
  return { url: `data:${mime};base64,${bytes.toString("base64")}`, metadata: { path: file, mime, bytes: bytes.length, sha256: digest(bytes) } };
};

const timedRun = async (request: JevRequest, model: DecisionModel, credentials: Credentials) => {
  const start = performance.now();
  const result = await runJev(request, { ...credentials, model });
  return { requestedModel: model, durationMs: performance.now() - start, result };
};

const requestRecord = (request: JevRequest) => ({
  questionVersion: QUESTION_VERSION, requestDigest: digest(JSON.stringify(request)),
  state: request.state, questions: request.questions,
});

/** Returns nonzero for incomplete runs. Semantic findings stay advisory and appear in the report. */
export const runArtifactAudit = async (args: AuditArgs, credentials: Credentials): Promise<number> => {
  const reportDir = args.reportDir ?? "artifacts/jev";
  const reportPath = path.join(reportDir, `${args.mode}-audit.json`);
  const write = (report: unknown) => {
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  };
  const base = { generatedAt: new Date().toISOString(), mode: args.mode, threshold: args.threshold, advisory: true };
  try {
    if (!Number.isFinite(args.threshold) || args.threshold <= 0.5 || args.threshold > 1) throw new Error("advisory threshold must be in (0.5, 1]");
    if (!args.models.length) throw new Error("at least one model is required");
    const inputPath = args.inputPath ?? DEFAULT_INPUT;
    const input = readJson(inputPath);
    const inputDigest = digest(JSON.stringify(input));
    if (args.mode === "eval") {
      const suite = evaluationSchema.parse(input);
      const cases = suite.cases.map((item) => {
        const request = item.kind === "counterevidence"
          ? buildCounterevidenceAudit(item.input)
          : buildArtifactAudit(item.input);
        for (const key of Object.keys(item.expected)) {
          if (request.questions[key]?.type !== "noul") throw new Error(`unknown binary evaluation label: ${key}`);
        }
        return { ...item, request };
      });
      const byModel: Record<string, unknown> = {};
      let failed = 0;
      for (const model of args.models) {
        const samples: { expected: boolean; key: string; result: JevResult }[] = [];
        const runs = [];
        for (const item of cases) {
          const run = await timedRun(item.request, model, credentials);
          if (!run.result.ok) failed += 1;
          samples.push(...Object.entries(item.expected).map(([key, expected]) => ({ key, expected, result: run.result })));
          runs.push({ id: item.id, expected: item.expected, ...requestRecord(item.request), ...run });
        }
        byModel[model] = { summary: summarizeEvaluation(samples, args.threshold), cases: runs };
      }
      write({ ...base, questionVersion: QUESTION_VERSION,
        questionVersions: [...new Set(cases.map((item) => item.kind === "counterevidence" ? COUNTEREVIDENCE_QUESTION_VERSION : QUESTION_VERSION))],
        status: failed ? "incomplete" : "completed", inputPath, inputDigest, byModel });
      console.log(`jev-copy-audit: ${reportPath} (${failed} failed calls; inspect labeled errors before choosing a model)`);
      return failed ? 1 : 0;
    }
    // The generated text and its paired document must still be the same files.
    if (args.mode === "brief" && !args.inputPath) {
      const bundle = artifactAuditSchema.parse(input);
      if (readFileSync("artifacts/weekly-slack-brief.txt", "utf8") !== bundle.artifact.text) throw new Error("brief text differs from its paired audit input; regenerate both");
    }
    const image = args.mode === "screenshot" && args.imagePath ? imageInput(args.imagePath) : null;
    if (args.mode === "screenshot" && !image) throw new Error("screenshot mode requires --image with the actual captured brief");
    const request = args.mode === "evidence" ? buildEvidenceAudit(input)
      : args.mode === "counterevidence" ? buildCounterevidenceAudit(input)
      : image ? buildScreenshotAudit(input, image.url) : buildArtifactAudit(input);
    for (const model of args.models) {
      const error = validateDecisionMedia(request, model);
      if (error) throw new Error(error);
    }
    const byModel: Record<string, unknown> = {};
    let failed = 0;
    for (const model of args.models) {
      const run = await timedRun(request, model, credentials);
      if (!run.result.ok) failed += 1;
      const flags = run.result.ok ? Object.entries(run.result.answers)
        .filter(([, answer]) => answer.type === "noul" && answer.noul >= args.threshold).map(([key]) => key) : null;
      const unresolved = run.result.ok ? Object.entries(run.result.answers)
        .filter(([, answer]) => answer.type === "noul" && answer.noul > 1 - args.threshold && answer.noul < args.threshold).map(([key]) => key) : null;
      const placed = args.mode === "evidence" ? { selection: selectEvidence(input, run.result, args.threshold) }
        : args.mode === "counterevidence" ? { packet: buildCounterevidencePacket(input, run.result, args.threshold) }
        : { flags, unresolved };
      byModel[model] = { ...run, ...placed };
      if (args.mode === "counterevidence" && run.result.ok) {
        const packet = buildCounterevidencePacket(input, run.result, args.threshold);
        console.log(`jev-copy-audit: ${model} ${summarizeCounterevidencePacket(packet)} (${packet.supporting.length} supporting, ${packet.review.length} for review)`);
        for (const challenge of packet.challenges) {
          console.log(`  challenge ${challenge.id} (${challenge.challenge.toFixed(2)}, relevance ${challenge.relevance})  ${challenge.claim}`);
        }
      }
    }
    const retrieval = args.mode === "evidence" ? z.object({ retrieval: z.record(z.string(), z.unknown()).optional() }).parse(input).retrieval : undefined;
    write({ ...base, ...requestRecord(request),
      questionVersion: args.mode === "counterevidence" ? COUNTEREVIDENCE_QUESTION_VERSION : QUESTION_VERSION,
      status: failed ? "incomplete" : "completed", inputPath, inputDigest,
      ...(retrieval ? { retrieval } : {}), media: image?.metadata ?? null, byModel });
    console.log(`jev-copy-audit: ${reportPath} (${failed} failed calls; findings are advisory)`);
    return failed ? 1 : 0;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "audit failed";
    write({ ...base, status: "failed", error: reason });
    console.error(`jev-copy-audit: ${reason}`);
    return 1;
  }
};
