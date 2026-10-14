import { z } from "zod";

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
const DECISION_MODELS = {
  jev: JEV_MODEL,
  clef: "@cf/cloudflare/clef",
  "clef-flash": "@cf/cloudflare/clef-flash",
} as const;

export type DecisionModel = keyof typeof DECISION_MODELS;

export const isDecisionModel = (value: string): value is DecisionModel => Object.hasOwn(DECISION_MODELS, value);

export type JevQuestion =
  | { type: "noul"; instructions: string; criteria: { true: string; false: string } }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

export type JevRequest = {
  state: string | Record<string, unknown>;
  questions: Record<string, JevQuestion>;
};

const probabilities = z.record(z.string(), z.number());

const answerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), noul: z.number().min(0).max(1) }),
  z.object({
    type: z.literal("choice"),
    choice: z.string(),
    confidence: z.number(),
    probabilities,
  }),
  z.object({
    type: z.literal("score"),
    score: z.number(),
    confidence: z.number(),
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
export const parseJevResponse = (body: unknown, questionKeys: string[]): JevResult => {
  const unwrapped = typeof body === "object" && body !== null && "result" in body ? body.result : body;
  const parsed = responseSchema.safeParse(unwrapped);
  if (!parsed.success) {
    return { ok: false, reason: `malformed response: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  }
  const missing = questionKeys.filter((key) => !(key in parsed.data.answers));
  if (missing.length > 0) {
    return { ok: false, reason: `response missing answers for: ${missing.join(", ")}` };
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
    : { path: `/${DECISION_MODELS[model]}`, body: request };

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
  const call = decisionModelCall(model, request);
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run${call.path}`;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify(call.body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` };
    }
    return parseJevResponse(await response.json(), Object.keys(request.questions));
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "request failed" };
  }
};
