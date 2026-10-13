# Runtime helpers and bindings

Moved out of the file headers under `lib/runtime/` on 2026-10-07, so each helper carries its rule and
this file carries the reasoning. Read when a task touches a binding, KV, a store singleton, a retry,
or anything read from `globalThis`.

## One mechanism, policy at the caller (`retry.ts`)

`lib/fred.ts` and `lib/treasury/treasuryClient.ts` each grew their own retry loop, their own sleep
between attempts, and their own "is this the suite?" check that zeroed that sleep, and the Treasury
client called FRED's CSV export through its copy. `withRetry` and `createCircuitBreaker` are the one
copy; how many attempts, which failures are worth another, and how long to wait stay with each
caller. `withRetry` hands the work the time left in its budget so an attempt that begins after the
caller's deadline has fired cannot keep holding the isolate to produce a value nobody can read, and it
sleeps only when the budget can still fund an attempt afterwards. Under `bun test` every upstream is a
stub that fails at once, so callers zero their backoff through `isTestRuntime()`; the retry path
itself still runs.

## KV reads (`kv.ts`)

- **One structural binding type.** The per-file hand-rolled shapes omitted the option bags, which
  made `cacheTtl` and `expirationTtl` unreachable from call sites. Structural rather than
  `@cloudflare/workers-types` so the same code typechecks where the binding is mocked.
- **`cacheTtl` caches the miss too.** A `get` with `cacheTtl` (minimum 60s) caches the value *and*
  a miss at the edge for that long. Only use it on keys immutable once written, never on the
  "newest" key a caller is about to re-read after a write.
- **Bulk reads, with capability detection.** A bulk `get(keys[])` takes up to 100 keys, counts as
  one operation against the 1,000 a Worker invocation may make, and honours `cacheTtl` like a single
  read. The fan-out it replaced issued one `get` per key at a concurrency of 32 to 64, which the
  runtime's six-connection limit serialized six at a time, and a full 1,000-entry log scan plus its
  index read exceeded the per-invocation operation limit outright. The runtime's binding carries
  `getWithMetadata` and this repo's structural doubles do not, so a double never receives an array,
  and a binding whose bulk read answers anything but a Map is remembered as unsupported.
- **Stored JSON is narrowed, not asserted.** About a dozen reads parsed by hand and four asserted
  the result's type with `as`. `parseStoredJson` takes a zod schema or a parser that answers null;
  a record an older deploy wrote in another shape is unusable in the same way unparseable text is,
  and every caller already treated that as "no record". `getJson` still rejects on a failing `get`:
  an outage is not a missing record.
- **One namespace.** `WHETHER_DURABLE_KV` is the only KV namespace `wrangler.toml` declares for
  data; the per-domain names `getWhetherKv` used to fall back to were never bound anywhere.

## One reader for a setting (`settings.ts`)

"Binding on globalThis, else `process.env`" was written out by hand in eight places, and they did
not agree: some trimmed, some did not, and three let an empty binding shadow the environment.
`readSetting` trims by default because most settings are keys and ids, where a stray newline from a
pasted value is never meant. A signing secret passes `{ trim: false }`: it is used byte for byte,
and trimming it would sign with a different key than the sender holds.

## A store re-checks its binding (`storeSelection.ts`)

Each repository used to pick KV or its in-memory fallback the first time it was asked and keep that
store for the isolate's life, so one call that ran before the binding was installed left every later
request writing to memory. `getDefaultIngestionStore` stopped memoizing for that reason (AGENTS.md,
"re-checks binding"); `selectStoreByBinding` is that approach shared. The store is rebuilt only when
the binding it was built over is no longer the one installed, so a stable binding keeps one store
and its write queue. `reset(store)` is the suite's "start from an empty in-memory store", held
whatever the binding does until the next reset.

## Rate limiting (`rateLimit.ts`)

Two Workers rate-limit bindings, because one binding carries one limit. `WHETHER_SUBSCRIBE_RATE_LIMITER`
guards the subscribe endpoints: each accepted POST sends a verification email from this product's
domain, so an unguarded endpoint is a way to flood a stranger's inbox with mail signed by
whether.work and burn the send quota. `WHETHER_PUBLIC_WRITE_RATE_LIMITER` guards the browser
telemetry intake and the per-ticker quote proxy; the proxy's upstream rate-limits this Worker as a
whole, so one abusive caller used to cost every visitor the comps. The binding is permissive and
eventually consistent (counters per Cloudflare location, updated in the background), the right tool
for abuse control and the wrong one for accounting. Absent the binding every check allows and
reports `enforced: false`; a limiter outage fails open for the same reason.

## The running Worker names its commit (`versionMetadata.ts`)

The `CF_VERSION_METADATA` binding had been declared in `wrangler.toml` since it was added, with a
comment promising `/api/health` would surface a live version reference, and nothing read it. On
2026-09-01 production served a build from two days earlier while fifteen merges reported green, and
there was no way to ask the running Worker which commit it was. Answering that from outside the deploy
pipeline is the point: a pipeline that lies about shipping cannot also be the thing that tells you
what shipped. Off Cloudflare the binding is absent and callers report the absence rather than
inventing a version.

The home page's data cache is the second reader (`lib/report/homePageData.ts`). The cache is
KV-backed (`VINEXT_KV_CACHE`), so its entries outlive the deploy that wrote them. After #1563 added
a required `ReportData.scoringBasis`, an entry saved before the merge crashed the trust strip for
up to the revalidate window. The version id is now an argument to the cached function, which puts
it in the key; keyParts are fixed when the function is created and cannot carry it. This reader
does need a value off Cloudflare, so locally it keys on `ENGINE_VERSION` plus the build commit
instead. A shape change that is not yet committed still needs the dev cache cleared. Any new
`unstable_cache` call over a typed payload should pass the same version.

## Background work (`backgroundWork.ts`)

The worker entry installs the active request's `ctx.waitUntil` on `globalThis` so library code can
keep work alive past the response without importing worker types; outside Workers the work runs
detached in-process. The read path's background refresh (AGENTS.md, "Ingest stays off the read path")
goes through it.
