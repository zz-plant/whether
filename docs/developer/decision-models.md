# Decision models and advisory audits

**Canonical contributor and integration guide.** These tools support brief review and
caller-owned plan checking. They do not change the numerical engine, report readiness,
weekly delivery, or the append-only published archive. Live evaluations are opt-in and
remain outside `bun run check` and the deploy gate; the test suite owns its network.

## Models and transport

`lib/jev/jevClient.ts` reaches Workers AI over REST. Supported names are `jev` (the
default), `clef`, `clef-flash`, and `clef-omni`. Clef calls use their model-specific
endpoint and an explicit body selector; Jev retains the generic endpoint with wrapped
`input`. The client rejects unsupported media, malformed answers, missing questions,
wrong answer types, and distributions containing unknown options or invalid probabilities.
Service failures return `{ ok: false, reason }`; they are never a clear judgment.

Cloudflare's [Flash](https://developers.cloudflare.com/workers-ai/models/clef-flash/)
and [Omni](https://developers.cloudflare.com/workers-ai/models/clef-omni/) documentation
was checked on 2026-10-16. Flash's hosted context is 24,576 tokens; Omni's is 64,000.
Both accept embedded images. This client enables audio/video only for Omni, whose
hosted API explicitly documents those fields. Flash's description also mentions video,
but its hosted request schema does not expose a video field. Verify the current schema
before extending that support. Similar System One interfaces do not establish identical
provider limits or model accuracy.

The client also caps serialized state plus questions at 48,000 UTF-8 bytes for Flash
and 128,000 for the other models. These are local budgets to encourage small judgments,
not tokenizer measurements or guarantees against provider truncation. Keep state well
below the hosted context limit, especially when media uses part of that window.

## Check an operator's plan without sending it to Whether

```text
GET /api/agent?format=jev
GET /api/agent?format=jev&model=clef-flash
GET /api/agent?format=jev&model=clef-omni&input=audio
GET /api/agent?format=jev&model=clef-omni&input=video
```

The caller receives canonical guidance, `automationReady`, and a request template.
Fill `request.state.plan` for text, or the empty `request.audio` / `request.videos`
array for media, and invoke the selected model **from the caller's own environment**.
Whether receives neither the completed request nor the plan or clip. No public upload
or server-side reader-text inference route is introduced. Credentials stay in the caller's
server or local environment, never a public browser bundle.

For Clef, send the template as the body to
`/client/v4/accounts/<account-id>/ai/run/@cf/cloudflare/<model>` on
`https://api.cloudflare.com`. The template includes its required `model` selector.
For Jev, use `/ai/run` with `{ model: "typesafe/jev", input: handoff.request }`.

The eight questions separate the proposed action's presence, primary decision area,
recurring fixed cost, explicit pause terms, explicit reversibility evidence, the
reversibility rubric, conflict with guidance, and whether a stated condition lifts
the relevant constraint (`wait_for_flip`, retained as the existing machine key).
That last judgment concerns the supplied rule, not a forecast of company performance.

Code must check `automationReady` before using any answer. A missing action requires
clarification. If reversibility is not established, ignore its Score and ask for the
terms. A low conflict probability alone does not establish permission. Copy a pause or
resume line from the supplied canonical rule; do not invent one from a model answer.
Use explicit company numbers and existing arithmetic for cost and runway calculations.

Omni accepts base64 data URLs: PNG/JPEG/WebP images, WAV/MP3 audio, and MP4/WebM video.
The client checks MIME, base64, counts and decoded byte budgets before inference:
four images (4 MiB each, 8 MiB combined), four audio clips (8 MiB each), and two videos
(16 MiB each). Audio/video together may use 16 MiB decoded. The service also enforces
pixel dimensions, duration (300 seconds per audio clip, 60 seconds per video), and
context limits. Remote media URLs are refused. The handoff returns typed decisions,
not a transcript or a meeting summary.

## Audit the generated brief against its exact document

```sh
bun run brief:weekly:artifact
bun run audit:jev-copy -- --mode brief --model jev,clef-flash,clef-omni
```

The generator writes the text and `<output-path>.audit.json` together. The sidecar
contains the full canonical `BriefDocument`, the exact rendered text, date, engine
version and a reading digest covering the document and engine. Brief mode checks the
paired text has not changed. Every artifact comparison checks both identities agree
before inference; it no longer compares today's output with whichever archive entry
happens to be last. A current reading need not have been frozen yet.

`--allow-fallback` on the generator still writes the explicit not-live stamp for local
work. Such an audit is a consistency check of fallback output, never publish readiness.

Questions independently flag conflicting actions, weakened pause conditions, changed
resume conditions and unsupported assertions. The full document supplies the provenance,
numbers, area rows and qualifications that a faithful export can include. This is
advisory semantic review: ordinary tests still check exact numbers, required fields
and formatting, and a human reviews the claim and source context.

For another export, supply `--input <bundle.json>` with this shape:

```json
{
  "canonical": {
    "recordDate": "2026-10-15",
    "engineVersion": "example-engine",
    "readingId": "same-document-digest",
    "guidance": "Hold net-new hiring.",
    "action": "Hold net-new hiring.",
    "pauseLine": "Pause above the printed line.",
    "resumeLine": "Resume below the printed line.",
    "changeLine": "Conditions change at the printed line.",
    "sourceUrl": "https://example.com/illustrative-source"
  },
  "artifact": {
    "recordDate": "2026-10-15",
    "engineVersion": "example-engine",
    "readingId": "same-document-digest",
    "text": "The actual rendered export text."
  }
}
```

This is an illustrative schema, not market guidance. Omit nullable pause/resume fields
when the canonical document has none. Keep the optional `canonical.context` full document
when comparing an export that includes facts beyond the top-level guidance.

## Review the screenshot that will be shared

```sh
bun run audit:jev-copy -- --mode screenshot --model clef-flash,clef-omni \
  --input artifacts/weekly-slack-brief.txt.audit.json --image artifacts/weekly-call.png
```

Supply the actual local PNG/JPEG/WebP captured through the existing screenshot flow
or browser QA. This command does not capture a second page or alter Slack delivery.
It asks about clipped/obscured text, missing guidance, another reading/date, and
loading/error/empty output. Model judgments do not replace DOM, contrast, accessibility
or viewport checks. Image identity is recorded by checksum; whether it depicts the
expected reading is a model judgment, not proven by a filename. Cloudflare resizes
images, so small text can be lost; compare models against annotated captures first.

## Rank supporting evidence without generating claims

```sh
bun run audit:jev-copy -- --mode evidence --model clef-flash,clef-omni --input evidence.json
```

The input is `{ "canonical": <same canonical object>, "candidates": [...] }`.
Each candidate supplies a unique `id`, `claim`, source `excerpt`, HTTP(S) `sourceUrl`,
and ISO-date `observedAt`. At most sixteen candidates produce two independent questions
each: relevance on a common three-level rubric and whether the excerpt supports the claim.

Code retains original candidate IDs, wording and citations. Support and rubric confidence
must each meet `--threshold` before ranking; relevance cannot compensate for unsupported
evidence. Failed or uncertain candidates are listed for review. This evaluates supplied
excerpts, not the authenticity, freshness or completeness of a fetched source. It neither
fetches arbitrary sources nor changes the homepage's selection, mandatory warnings,
engine inputs, or guidance. Numeric deltas remain computed in code.

## Review the counterevidence packet (evidence for and against the call)

```sh
bun run audit:jev-copy -- --mode counterevidence --model clef-flash,clef-omni --input counterevidence.json
```

The input is the evidence shape with an optional `side` per candidate (`"support"` or
`"challenge"`), the side the source pool retrieved the passage for. Clef asks a third
question per candidate — whether the claim, if it holds, would *weaken* the operating
implication of `canonical.guidance` — independently of the pool's side, so retrieval and
judgment can disagree and the disagreement is visible in the report.

The report's `packet` is assembled deterministically, with no generated claims:

- `challenges` — what could weaken this call. A candidate is only listed when the excerpt
  supports its claim and the model judged it challenging at the threshold; otherwise it is
  noise and goes to `review`.
- `supporting` — what backs the call: supported, relevant, and not judged challenging.
- `reconsideration` — `canonical.changeLine`, the engine's printed line where conditions
  change. Never invented by a model; when the canonical document has no change line the
  field is null and the packet says nothing instead of guessing.
- `review` — every candidate a person should look at: failed calls, judgments near the
  threshold, unsupported challenges, and passages the pool sent that were not relevant.

A challenge keeps the candidate's own wording and citation, so the packet is a review
artifact, not a summary to be trusted on faith. Label each finding as useful or a false
alarm with `bun run reviewed-cases:add` (below); those labels become evaluation cases.

## Build the source pool with EmbeddingGemma

```sh
bun run evidence:pool -- --passages data/evidence-pool/passages.json \
  --canonical artifacts/weekly-slack-brief.txt.audit.json \
  --out artifacts/evidence-pool/counterevidence-input.json
bun run audit:jev-copy -- --mode counterevidence --input artifacts/evidence-pool/counterevidence-input.json
```

The passage file is the recurring evidence set: `[{ "id", "title"?, "text", "sourceUrl", "publishedAt" }]`
(text at most 12,000 characters, ids unique). On a machine with the advice-corpus cache, posts
can be chunked into passages; the tool itself is collection-agnostic. The canonical comes from
the paired brief audit bundle (or any file holding the canonical object alone).

EmbeddingGemma 2 (local Ollama, `embeddinggemma-2:740m`) embeds every passage and two query
frames: the call as printed (guidance, action, pause and resume lines), and the opposite
stance — money is cheaper again, the freeze lifts, companies resume hiring and the new bets
they postponed — stated without the call's metric vocabulary. That separation is a measured
finding, not an assumption (2026-10-23): a challenge frame that restated the call's change
line embedded ~0.9-similar to the support frame, and no passage cleared a margin; embedding
similarity is topic similarity, not stance. `lib/evidencePool.ts` therefore selects the pool
by relevance to the call's frame (top-k) and tags each passage with the frame it resembles
more. A passage that argues the opposite stance with the call's own vocabulary is still
retrieved and tagged by the closer frame, so the interesting disagreements stay in the pool.
Embeddings cache by content hash under `.cache/evidence-pool/`.

The `side` tags are retrieval hypotheses, not verdicts — `--mode counterevidence` judges each
candidate independently, and the packet carries both the pool's side and the model's judgment,
so retrieval and judgment can be compared and the thresholds calibrated against the reviewed
cases. A passage that argues against the call can still be retrieved for the support side when
it shares the call's vocabulary — the packet's challenge list comes from the model's judgment,
and that side-vs-judgment mismatch is exactly the retrieval-quality signal the reviewed-case
registry measures. The selection defaults (`--top 6 --min-similarity 0.3`) are starting points
for that calibration, not accuracy claims.

## Keep reviewed cases as evaluation evidence

```sh
bun run reviewed-cases:add -- --input counterevidence.json --candidate <id> --label useful|false-alarm --side challenge|support
bun run reviewed-cases:export-eval -- --out artifacts/reviewed-cases/eval-suite.json
bun run audit:jev-copy -- --mode eval --input artifacts/reviewed-cases/eval-suite.json
```

`data/reviewed-cases/cases.json` is a committed, append-only registry of human labels on
advisory findings: the exact input, the candidate, and the expected labels the verdict
implies. A useful challenge records that the model was right and the excerpt carried it
(`challenges_*: true, supported_*: true`); a false alarm records an over-flag
(`challenges_*: false`). `export-eval` turns the registry into the eval input shape, so
reviewed cases become held-out evidence for routing, prompts and retrieval settings. The
registry is committed and not rewritten; a labeled case is superseded, never deleted.
Independent outcome checks matter more than agreement between models.

## Evaluate before selecting a model

```sh
bun run audit:jev-copy -- --mode eval --model jev,clef-flash,clef-omni \
  --input tests/fixtures/decision-model-evaluation.json
```

The included eight authored hypothetical cases seed faithful paraphrases, action and
condition changes, unsupported company facts and embedded commands. They are a smoke
dataset, not representative production evaluation or an independent accuracy benchmark.
Review their expected labels and add real cases and difficult negatives before selecting
a model or calibrating a threshold. Keep a held-out set. Historical consistency tests
do not establish foresight: a later-trained model can already know the historical outcome.

Evaluation inputs contain `cases`, each with a unique `id`, an artifact `input`, and
an `expected` map of binary question IDs to boolean labels. Reports preserve every case,
requested and returned model, question version, input digest, distributions and wall-clock
duration. Summaries count true/false positives/negatives, unresolved judgments and failed
labels, with Brier loss on answered labels. Missing responses never become negative labels.
Do not infer correctness from agreement between models.

Reports go to `artifacts/jev/<mode>-audit.json` (`--out-dir` changes the directory).
They retain public input state and questions; screenshots are represented by path, MIME,
byte count and checksum, without duplicating base64 in reports. Keep the input/media files
to reproduce a run. A different model, evidence or question version requires a new result.
An invalid run replaces any previous report with an explicit failure. Exit 1 means an
incomplete/invalid run; semantic flags and measured model mistakes remain in the advisory
report and do not turn into a deploy gate.

Live commands need `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` with Workers AI
permissions. No credentials are needed for `--help` or offline tests. Review only material
you intend to send to Cloudflare; these tools do not authorize sending reader data.

The default 0.8 threshold is a starting review policy, not an accuracy claim. File modes
require a threshold above 0.5 so the yes/no review interval is unambiguous. Model confidence
describes its distribution; Whether's **Margin** describes distance from a change line.
Neither is a probability of company success. The underlying design follows TypeSafe's
[building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one),
[confidence guidance](https://docs.typesafe.ai/confidence), and
[citation-checking pattern](https://docs.typesafe.ai/cookbooks/citation_check).
