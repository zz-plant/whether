#!/usr/bin/env bun
/**
 * The cold-reader comprehension eval (2026-10-22).
 *
 * A local model with no context plays a first-time visitor: it is given only the
 * rendered text of a page and asked what a newcomer can learn from it. Its
 * answers are checked against the data the page is built from (the agent state,
 * fetched fresh) — so a failure means the page failed to communicate something
 * it intended to, not that the model was dumb. This turns "would a first visit
 * understand this?" from a design judgment into a repeatable check.
 *
 * Surfaces and questions (each answer is checked objectively — quoted text must
 * appear verbatim in the page, numbers and weather words must match the state):
 *
 *   /            who it's for · this week's guidance (quote) · this week's
 *                condition · the date of the data · the hiring pause line ·
 *                the margin
 *   /answers/…   the short answer (quote) · this week's condition
 *
 * Rules this follows (from scripts/advice-corpus, the repo's existing local-
 * model pipeline):
 *   - Never load a model. Only a model already resident in Ollama is used; the
 *     default is the first one in `/api/ps`, so an eval run never evicts
 *     whatever else this machine is running.
 *   - Structured output: every request carries a JSON schema, temperature 0,
 *     fixed seed, so a re-run asks the same question the same way.
 *
 * Usage:
 *   bun run eval:cold-reader                     # resident model, dev server
 *   bun run eval:cold-reader -- --model gemma4:e4b-32k
 *   bun run eval:cold-reader -- --base-url http://127.0.0.1:3000
 *   bun run eval:cold-reader -- --allow-missing  # exit 0 when no model/server
 *
 * Exit codes: 0 pass (or allowed skip) · 1 comprehension findings · 2 setup.
 */
import { z } from "zod";
import { agentStateSchema } from "../../lib/agentState";

const ChatResponseSchema = z.object({
  message: z.object({
    content: z.string(),
    /** Thinking models spend tokens reasoning before the answer; useful with --verbose. */
    thinking: z.string().optional(),
  }),
  prompt_eval_count: z.number().nullable().optional(),
});

const ResidentModelsSchema = z.object({
  models: z.array(z.object({ name: z.string(), context_length: z.number().optional() })),
});

const args = process.argv.slice(2);
const flag = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const allowMissing = args.includes("--allow-missing");
const modelArg = flag("--model");
const baseUrlArg = flag("--base-url");

const OLLAMA_URL = "http://127.0.0.1:11434";
/** The labeling pipeline's model, for reference; the eval uses what is resident. */
const PREFERRED_MODEL_HINT = "qwen3-coder:30b-128k";

/** The two readings are drawn from the site's own pages, rendered by the app. */
const CANDIDATE_BASE_URLS = ["http://localhost:5173", "http://localhost:3000"];

type Surface = {
  path: string;
  label: string;
  questions: { id: string; ask: string; check: (answer: string, state: z.infer<typeof agentStateSchema>, pageText: string) => string | null }[];
};

/** The state's ISO date, in the words the page prints it in ("Oct 20, 2026"). */
const pageDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );

const normalize = (text: string) =>
  text
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

/** The rendered text a visitor reads: chrome and all, because that is what they see. */
const pageTextOf = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const findServer = async (): Promise<string | null> => {
  const candidates = baseUrlArg ? [baseUrlArg] : CANDIDATE_BASE_URLS;
  for (const base of candidates) {
    try {
      const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) return base;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
};



/**
 * Ask the resident model once. `format` is a JSON schema, so the answer is
 * parsed data, not prose to be coaxed (the same structured-output pattern the
 * labeling pipeline uses).
 */
const askResident = async (model: string, numCtx: number, system: string, user: string, format: object) => {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format,
      options: {
        temperature: 0,
        seed: 42,
        /* Thinking models spend this budget reasoning before the answer, so it
           must cover both: at 100 the answer field came back empty with
           done_reason "length" (2026-10-22). */
        num_predict: 1_500,
        num_ctx: numCtx,
      },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw new Error(`ollama ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return ChatResponseSchema.parse(await response.json());
};

/** One finding per failed question, with what was expected and what came back. */
type Finding = { surface: string; question: string; expected: string; got: string };

const report = (findings: Finding[]) =>
  findings.map((finding) => `[fail] ${finding.surface} · ${finding.question}\n       expected: ${finding.expected}\n       got: ${finding.got}`).join("\n");

const COLD_READER_SYSTEM =
  "You are a first-time visitor reading one webpage. You know nothing about this site except what the page text says. " +
  "Answer each question using only the page text. Where a question asks for a quote, quote the exact sentence, word for word, and nothing else. " +
  "If the page truly does not answer a question, answer exactly NOT FOUND. Respond only with JSON matching the schema.";

async function main() {
  const server = await findServer();
  if (!server) {
    const note = "no app server answered (tried " + CANDIDATE_BASE_URLS.join(", ") + "). Start one with `bun run dev`.";
    if (allowMissing) {
      console.log(`[skip] ${note}`);
      return 0;
    }
    console.error(`[setup] ${note}`);
    return 2;
  }

  const stateResponse = await fetch(`${server}/api/agent?view=state`);
  if (!stateResponse.ok) {
    console.error(`[setup] /api/agent answered ${stateResponse.status}.`);
    return 2;
  }
  const state = agentStateSchema.parse(await stateResponse.json());

  // The model: what is already resident. Never trigger a load — that would
  // evict whatever else this machine is running (the labeling pipeline's rule).
  const ps = await fetch(`${OLLAMA_URL}/api/ps`, { signal: AbortSignal.timeout(10_000) })
    .then(async (response) => ResidentModelsSchema.parse(await response.json()))
    .catch(() => null);
  const resident = ps?.models ?? [];
  const chosen = modelArg ? resident.find((entry) => entry.name === modelArg) : resident[0];
  if (!chosen) {
    const note = modelArg
      ? `model ${modelArg} is not resident in Ollama (resident: ${resident.map((entry) => entry.name).join(", ") || "none"}). Load it first, or omit --model to use what is resident.`
      : "no model is resident in Ollama. Load one (e.g. `ollama run " + PREFERRED_MODEL_HINT + "`) or use --allow-missing.";
    if (allowMissing) {
      console.log(`[skip] ${note}`);
      return 0;
    }
    console.error(`[setup] ${note}`);
    return 2;
  }

  const answerPage = state.scores.riskAppetite.pause?.line ? "should-startups-raise-capital-now" : "when-should-startups-cut-burn";
  const surfaces: Surface[] = [
    {
      path: "/",
      label: "home",
      questions: [
        {
          id: "audience",
          ask: 'Who is this product for? Quote the sentence that says so.',
          check: (answer) =>
            normalize(answer).includes("startup")
              ? null
              : `the answer should name who the product is for ("startup…"): "${answer}"`,
        },
        {
          id: "guidance",
          ask: "What does this week's guidance tell you to do? Quote the exact sentence.",
          check: (answer, _state, pageText) => {
            const quoted = normalize(answer);
            if (quoted === "not found") return "the model could not find the guidance on the page.";
            return pageText.includes(quoted) ? null : `the quoted sentence was not found in the page: "${answer}"`;
          },
        },
        {
          id: "condition",
          ask: "Which one word describes this week's conditions?",
          check: (answer, agentState) => {
            const expected = agentState.conditions.label.toLowerCase();
            return normalize(answer).includes(expected)
              ? null
              : `expected this week's condition ("${expected}") in: "${answer}"`;
          },
        },
        {
          id: "dataDate",
          ask: "What date is the data on this page from? Quote the date.",
          check: (answer, agentState) => {
            const expected = pageDate(agentState.recordDate).toLowerCase();
            return normalize(answer).includes(expected)
              ? null
              : `expected the reading date ("${expected}") in: "${answer}"`;
          },
        },
        {
          id: "pauseLine",
          ask: "Which funding-pressure number would pause new commitments, according to the page?",
          check: (answer, agentState) => {
            const line = agentState.scores.tightness.pause?.line;
            if (typeof line !== "number") return null;
            return new RegExp(`\\b${line}\\b`).test(answer)
              ? null
              : `expected the pause line number (${line}) in: "${answer}"`;
          },
        },
        {
          id: "margin",
          ask: "What does the page say about how close the scores are to the line where conditions change? Quote the phrase.",
          check: (answer, _state, pageText) => {
            const normalized = normalize(answer);
            if (/margin|pts|change line|clear of the line|within reach|close to the line/.test(normalized)) {
              return pageText.includes(normalized) || /pts|change line/.test(normalized)
                ? null
                : `the quoted phrase was not found in the page: "${answer}"`;
            }
            return `expected the margin (the words "margin", "…pts", or the band phrase) in: "${answer}"`;
          },
        },
      ],
    },
    {
      path: `/answers/${answerPage}`,
      label: "answer",
      questions: [
        {
          id: "shortAnswer",
          ask: "What is the short answer to the question this page is about? Quote the exact sentence.",
          check: (answer, _state, pageText) => {
            const quoted = normalize(answer);
            if (quoted === "not found") return "the model could not find the short answer on the page.";
            return pageText.includes(quoted) ? null : `the quoted sentence was not found in the page: "${answer}"`;
          },
        },
        {
          id: "condition",
          ask: "Which one word describes this week's conditions?",
          check: (answer, agentState) => {
            const expected = agentState.conditions.label.toLowerCase();
            return normalize(answer).includes(expected)
              ? null
              : `expected this week's condition ("${expected}") in: "${answer}"`;
          },
        },
      ],
    },
  ];

  console.log(`[eval] cold-reader comprehension · model ${chosen.name} · context ${chosen.context_length ?? "?"} · server ${server}`);
  const findings: Finding[] = [];

  for (const surface of surfaces) {
    const url = `${server}${surface.path}`;
    const html = await fetch(url).then((response) => {
      if (!response.ok) throw new Error(`${surface.path} answered ${response.status}`);
      return response.text();
    });
    const text = pageTextOf(html);
    const format = {
      type: "object",
      properties: Object.fromEntries(
        surface.questions.map((question) => [question.id, { type: "string", description: question.ask }]),
      ),
      required: surface.questions.map((question) => question.id),
    };
    const asked = surface.questions.map((question, index) => `${index + 1}. ${question.ask}`).join("\n");

    const response = await askResident(chosen.name, chosen.context_length ?? 32_768, COLD_READER_SYSTEM, `Page text:\n\n${text}\n\nQuestions:\n${asked}`, format);
    const raw = response.message.content;
    if (args.includes("--verbose")) {
      if (response.message.thinking) console.log(`[thinking] ${surface.label}: ${response.message.thinking.slice(0, 400)}`);
    }
    let answers: Record<string, string>;
    try {
      const parsed = z.record(z.string(), z.unknown()).parse(JSON.parse(raw));
      answers = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
    } catch {
      for (const question of surface.questions) {
        findings.push({ surface: surface.label, question: question.id, expected: "valid JSON", got: `(unparseable) ${raw.slice(0, 300)}` });
      }
      continue;
    }

    for (const question of surface.questions) {
      const answer = answers[question.id] ?? "(missing)";
      /* Checks compare quotes against the page, so the page arrives in the
         same normalized form the answers are checked in. */
      const failure = question.check(answer, state, normalize(text));
      if (failure) {
        findings.push({ surface: surface.label, question: question.id, expected: failure, got: answer.slice(0, 300) });
      }
    }
  }

  if (findings.length > 0) {
    console.error(`\n[eval] ${findings.length} comprehension finding(s) a cold reader hit:\n${report(findings)}`);
    return 1;
  }
  console.log(`\n[eval] every question answered as the pages intend — a cold reader can use this.`);
  return 0;
}

process.exitCode = await main();
