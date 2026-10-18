import { z } from "zod";
import { validateDecisionMedia } from "./jevMedia";

/**
 * TypeSafe's Jev decision model, reached through Cloudflare Workers AI.
 *
 * Jev returns no prose: it takes a `state` and a set of typed questions and
 * answers each with a probability (`noul`), a pick with per-option
 * probabilities (`choice`), or a level on an ordered scale (`score`). The
 * question schema is the one Cloudflare documents for `typesafe/jev`, which is
 * byte-identical to TypeSafe's own API.
 *
 * Nothing on the report read path calls this, and nothing here decides the
 * weekly call. The regime engine stays deterministic: Jev's probabilities are
 * calibrated on TypeSafe's training data, not on this archive's six regime
 * flips, and a model trained in 2026 has seen every month a backtest would
 * score it on. What it is used for is judging text, where a wrong answer costs
 * a person a second look rather than a published claim.
 */
export const JEV_MODEL = "typesafe/jev";

/**
 * Decision models that answer Jev's question schema. Cloudflare's Clef family
 * (released 2026-10) takes the same `state` and `questions` and returns the
 * same answers, at a fraction of Jev's price: Clef-flash is $0.038 per million
 * input tokens, with a 24K context that a single sentence never approaches.
 * Jev stays the default; the others exist so an audit can be run on two models
 * and the disagreements read, before anyone trusts the cheaper one alone.
 */
export const DECISION_MODELS = {
  jev: JEV_MODEL,
  clef: "@cf/cloudflare/clef",
  "clef-flash": "@cf/cloudflare/clef-flash",
  "clef-omni": "@cf/cloudflare/clef-omni",
} as const;

export type DecisionModel = keyof typeof DECISION_MODELS;

export const isDecisionModel = (value: string): value is DecisionModel => Object.hasOwn(DECISION_MODELS, value);

const questionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), instructions: z.string().min(1), criteria: z.object({ true: z.string(), false: z.string() }) }),
  z.object({ type: z.literal("choice"), instructions: z.string().min(1), criteria: z.record(z.string(), z.string()).refine((options) => Object.keys(options).length >= 2 && Object.keys(options).length <= 255) }),
  z.object({ type: z.literal("score"), instructions: z.string().min(1), criteria: z.array(z.string()).min(2).max(10) }),
]);

const jevRequestSchema = z.object({
  state: z.union([z.string(), z.record(z.string(), z.unknown())]),
  questions: z.record(z.string().regex(/^[\w.-]{1,100}$/), questionSchema)
    .refine((questions) => Object.keys(questions).length >= 1 && Object.keys(questions).length <= 64),
  images: z.array(z.string()).optional(),
  audio: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
});
export type JevQuestion = z.infer<typeof questionSchema>;
export type JevRequest = z.infer<typeof jevRequestSchema>;

const probability = z.number().min(0).max(1);
const probabilities = z.record(z.string(), probability).refine((values) =>
  Object.keys(values).length > 0 && Math.abs(Object.values(values).reduce((sum, value) => sum + value, 0) - 1) <= 0.001,
  "probabilities must sum to one",
);

const answerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), noul: z.number().min(0).max(1) }),
  z.object({
    type: z.literal("choice"),
    choice: z.string(),
    confidence: probability,
    probabilities,
  }),
  z.object({
    type: z.literal("score"),
    score: z.number(),
    confidence: probability,
    legend: z.record(z.string(), z.string()),
    probabilities,
  }),
]);

const responseSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), answerSchema),
});

type JevAnswer = z.infer<typeof answerSchema>;

export type JevResult =
  | { ok: true; model: string; answers: Record<string, JevAnswer> }
  | { ok: false; reason: string };

/**
 * Reads a Jev response as Workers AI returns it over REST (`{ result, success }`)
 * or as the binding and TypeSafe's API return it (the bare object). A response
 * missing an answer to any question asked is refused rather than returned
 * partially: a caller that reads `answers.x` should never find it absent.
 */
export const parseJevResponse = (body: unknown, questions: string[] | Record<string, JevQuestion>): JevResult => {
  if (typeof body === "object" && body !== null && "success" in body && body.success === false) {
    return { ok: false, reason: "Workers AI reported an unsuccessful evaluation" };
  }
  const unwrapped = typeof body === "object" && body !== null && "result" in body ? body.result : body;
  const parsed = responseSchema.safeParse(unwrapped);
  if (!parsed.success) {
    return { ok: false, reason: `malformed response: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  }
  const questionKeys = Array.isArray(questions) ? questions : Object.keys(questions);
  const missing = questionKeys.filter((key) => !Object.hasOwn(parsed.data.answers, key));
  if (missing.length > 0) {
    return { ok: false, reason: `response missing answers for: ${missing.join(", ")}` };
  }
  if (!Array.isArray(questions)) {
    if (Object.keys(parsed.data.answers).some((key) => !Object.hasOwn(questions, key))) {
      return { ok: false, reason: "response contains an unrequested answer" };
    }
    for (const [key, question] of Object.entries(questions)) {
      const answer = parsed.data.answers[key];
      if (!answer) return { ok: false, reason: `response missing answer for: ${key}` };
      if (answer.type !== question.type) return { ok: false, reason: `wrong answer type for: ${key}` };
      if (answer.type === "noul") continue;
      const allowed = question.type === "choice" ? Object.keys(question.criteria)
        : question.type === "score" ? question.criteria.map((_, index) => String(index)) : [];
      const keys = Object.keys(answer.probabilities);
      if (keys.length !== allowed.length || keys.some((option) => !allowed.includes(option))) {
        return { ok: false, reason: `wrong answer options for: ${key}` };
      }
      if (answer.type === "choice" && !allowed.includes(answer.choice)) {
        return { ok: false, reason: `unknown choice for: ${key}` };
      }
      if (answer.type === "score" && (answer.score < 0 || answer.score > allowed.length - 1)) {
        return { ok: false, reason: `score outside rubric for: ${key}` };
      }
    }
  }
  return { ok: true, model: parsed.data.model, answers: parsed.data.answers };
};

type RunJevOptions = {
  accountId: string;
  apiToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  model?: DecisionModel;
};

/* Jev is reached through the generic run endpoint with the request wrapped in
   `input`; Cloudflare documents Clef on its own model path with a bare body. */
const decisionModelCall = (model: DecisionModel, request: JevRequest) =>
  model === "jev"
    ? { path: "", body: { model: JEV_MODEL, input: request } }
    : { path: `/${DECISION_MODELS[model]}`, body: { ...request, model } };

/**
 * One Jev call over the Workers AI REST endpoint. Never throws: a timeout, a
 * non-2xx status and a malformed body all come back as `{ ok: false, reason }`,
 * so a caller has to decide what an unanswered question means instead of
 * inheriting an exception's default.
 */
export const runJev = async (
  request: JevRequest,
  { accountId, apiToken, fetchImpl = fetch, timeoutMs = 10_000, model = "jev" }: RunJevOptions,
): Promise<JevResult> => {
  try {
    if (!isDecisionModel(model)) return { ok: false, reason: "unknown decision model" };
    const parsed = jevRequestSchema.safeParse(request);
    if (!parsed.success) return { ok: false, reason: `invalid request: ${parsed.error.issues[0]?.message}` };
    // App-level byte budgets keep these narrow judgments small. They are not token counts.
    const textBytes = new TextEncoder().encode(JSON.stringify({ state: parsed.data.state, questions: parsed.data.questions })).length;
    if (textBytes > (model === "clef-flash" ? 48_000 : 128_000)) {
      return { ok: false, reason: "decision text exceeds the local context budget; reduce the supplied evidence" };
    }
    const mediaError = validateDecisionMedia(parsed.data, model);
    if (mediaError) return { ok: false, reason: mediaError };
    const call = decisionModelCall(model, parsed.data);
    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run${call.path}`;
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify(call.body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` };
    }
    return parseJevResponse(await response.json(), parsed.data.questions);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "request failed" };
  }
};
