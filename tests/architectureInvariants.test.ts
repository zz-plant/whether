import assert from "node:assert/strict";
import { describe, it, beforeEach } from "bun:test";
import { loadReportData } from "../lib/report/reportData";
import { assessDecisionStaleness, stalenessVerdictLabel } from "../lib/report/decisionStaleness";
import { evaluateDecisionAssumptionHealth, buildDecisionMemoryEntry } from "../lib/decisionMemory";
import { buildOperatingSnapshot, hashOperatingInputs } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { getWhetherKv } from "../lib/runtime/kv";
import {
  InMemoryDecisionMemoryRepository,
  resetDecisionMemoryRepository,
} from "../lib/storage/decisionMemoryRepository";
import { buildWeeklyOperatorBriefPayload } from "../lib/export/weeklyOperatorBrief";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngine";
import { snapshotData } from "../lib/snapshot";
import { macroSeries as snapshotMacroSeries } from "../lib/macroSnapshot";
import type { KvNamespace } from "../lib/runtime/kv";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";
import { buildMaterializedReadModel } from "../lib/ingestion/materialized";
import type { SignalEntitySnapshot, SignalFamily, SignalKey } from "../lib/ingestion/types";
import { resetFredCircuitBreaker } from "../lib/fred";
import { buildLineage } from "../lib/storage/lineage";

/*
 * The read-path invariants below own their upstreams. This suite runs both where FRED and
 * Treasury answer (Cloudflare's build container) and where nothing does (a sandboxed
 * session), and whether a read *writes* depends on what an ingest brings back — so a test
 * about writes that inherits the network passes in one place and fails in the other.
 * Until 2026-09-02 Invariant 1 did exactly that.
 */
const FRED_FIXTURE_LEVELS: Record<string, number> = {
  DGS1MO: 4.3,
  DGS3MO: 4.25,
  DGS2: 3.9,
  DGS10: 4.2,
  BAA10Y: 1.7,
  BAMLH0A0HYM2: 3.2,
  UNRATE: 4.2,
  CPIAUCSL: 320,
  NFCI: -0.4,
  VIXCLS: 16,
};
const DAY_MS = 24 * 60 * 60 * 1000;

/** A daily FRED CSV from `cosd` (or 900 days back) to today. CPI drifts so year-over-year is defined. */
const fredCsvFixture = (seriesId: string, observationStart: string | null) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = observationStart
    ? new Date(`${observationStart}T00:00:00.000Z`)
    : new Date(today.getTime() - 900 * DAY_MS);
  const level = FRED_FIXTURE_LEVELS[seriesId] ?? 1;
  const rows = [`observation_date,${seriesId}`];
  for (let time = start.getTime(), day = 0; time <= today.getTime(); time += DAY_MS, day += 1) {
    const value = seriesId === "CPIAUCSL" ? level + day * 0.03 : level + 0.01 * (day % 7);
    rows.push(`${new Date(time).toISOString().slice(0, 10)},${value.toFixed(3)}`);
  }
  return rows.join("\n");
};

const fixtureFetch: typeof fetch = async (input) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.host === "fred.stlouisfed.org" && url.pathname === "/graph/fredgraph.csv") {
    return new Response(fredCsvFixture(url.searchParams.get("id") ?? "", url.searchParams.get("cosd")), {
      status: 200,
      headers: { "content-type": "text/csv" },
    });
  }
  return new Response("not served by this test", { status: 404 });
};

const SIGNAL_KEYS_BY_FAMILY: Array<[SignalFamily, SignalKey[]]> = [
  ["rates", ["TREASURY_1M", "TREASURY_3M", "TREASURY_2Y", "TREASURY_10Y"]],
  ["spreads", ["BBB_CREDIT_SPREAD", "HY_CREDIT_SPREAD"]],
  ["labor", ["UNEMPLOYMENT_RATE"]],
  ["inflation", ["CPI_YOY"]],
  ["credit", ["CHICAGO_FCI"]],
  ["volatility", ["VIX_INDEX"]],
];

/** The stored form of a complete materialized model whose every family was ingested `ageMs` ago. */
const storedModelIngested = (ageMs: number) => {
  const now = new Date();
  const ingestedAt = new Date(now.getTime() - ageMs).toISOString();
  const snapshots: SignalEntitySnapshot[] = [];
  for (const [family, keys] of SIGNAL_KEYS_BY_FAMILY) {
    for (const signalKey of keys) {
      snapshots.push({
        signalKey,
        family,
        value: 3,
        unit: "%",
        source: { label: "FRED", url: `https://fred.stlouisfed.org/series/${signalKey}`, seriesId: signalKey },
        observedAt: ingestedAt,
        ingestedAt,
        quality: "observed",
        confidence: "high",
      });
    }
  }
  return JSON.stringify({ ...buildLineage("request-received-at"), model: buildMaterializedReadModel(snapshots, now) });
};

/**
 * Run the public read path against a KV whose only content is `materialized` (null is a
 * cold store), with upstreams served from fixtures, and report every write it made and
 * every task it handed to waitUntil.
 */
const readWithStore = async (materialized: string | null) => {
  const writes: string[] = [];
  const detached: Promise<unknown>[] = [];
  const trackingKv: KvNamespace = {
    async get(key: string) {
      return key === "ingestion:materialized:latest" ? materialized : null;
    },
    async put(key: string) {
      writes.push(key);
    },
    async delete(key: string) {
      writes.push(`delete:${key}`);
    },
    async list() {
      return { keys: [], list_complete: true };
    },
  };
  const originalFetch = globalThis.fetch;
  Object.assign(globalThis, {
    WHETHER_DURABLE_KV: trackingKv,
    WHETHER_WAIT_UNTIL: (task: Promise<unknown>) => {
      detached.push(task);
    },
  });
  globalThis.fetch = fixtureFetch;
  resetFredCircuitBreaker();

  try {
    const data = await loadReportData({});
    return { writes, detached, data };
  } finally {
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    Reflect.deleteProperty(globalThis, "WHETHER_WAIT_UNTIL");
    resetFredCircuitBreaker();
  }
};

describe("Architecture Invariants", () => {
  beforeEach(() => {
    resetDecisionMemoryRepository();
    resetOperatingSnapshotStore();
  });

  /*
   * "Reading Whether performs zero writes" is true of the state production is in almost
   * always: a materialized model exists and no signal family is due. The two exceptions
   * are the architecture's own (AGENTS.md, "Ingest stays off the read path"); 1b and 1c
   * pin them, so a change to either shows up here and not in a build log.
   */
  it("Invariant 1: Serving the report from a current store performs zero writes", async () => {
    const run = await readWithStore(storedModelIngested(0));

    assert.equal(run.data.treasury.yields.tenYear, 3, "the store, not an upstream, served the yields");
    assert.deepEqual(run.writes, [], "a current store must not be written on read");
    assert.equal(run.detached.length, 0, "nothing was due, so nothing was handed to waitUntil");
  });

  it("Invariant 1b: Only a cold store ingests inline, and that ingest is the read path's only write", async () => {
    const run = await readWithStore(null);

    assert.equal(run.data.treasury.isLive, true, "the inline ingest served the report");
    assert.ok(run.writes.includes("ingestion:materialized:latest"), "a cold store materializes what it ingested");
    assert.deepEqual(
      run.writes.filter((key) => !key.startsWith("ingestion:")),
      [],
      "a read writes nothing outside the ingestion store",
    );
    assert.equal(run.detached.length, 0, "a cold store has nothing to serve meanwhile, so it does not defer");
  });

  it("Invariant 1c: A stale store refreshes off the request, behind the KV lock", async () => {
    // Older than every family's poll window (the longest is 24h), so all six are due.
    const run = await readWithStore(storedModelIngested(25 * 60 * 60 * 1000));

    assert.equal(run.data.treasury.yields.tenYear, 3, "the request still served the model it had");
    assert.equal(run.detached.length, 1, "the refresh was handed to waitUntil, not awaited by the request");
    assert.ok(run.writes.includes("ingestion:refresh-lock"), "the detached refresh runs behind the lock");

    await Promise.all(run.detached);
    assert.ok(run.writes.includes("ingestion:materialized:latest"), "the detached refresh materialized what it ingested");
    assert.deepEqual(
      run.writes.filter((key) => !key.startsWith("ingestion:")),
      [],
      "the refresh writes nothing outside the ingestion store",
    );
  });

  it("Invariant 2: The same decision has the exact same staleness status everywhere", () => {
    const entry = buildDecisionMemoryEntry({
      clientId: "client-test",
      recordDate: "2026-08-01",
      decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
      outcome: {
        verdict: "SAFE",
        summary: "Hiring approved.",
        guardrail: "Pause if tightness > 70.",
        reversalTrigger: "tightness drops below 70",
      },
      assessment: {
        regime: "DEFENSIVE",
        scores: { tightness: 60, riskAppetite: 55, baseRate: 4.8, curveSlope: 0.2, baseRateUsed: "1M" },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    assert.ok(entry.assumptions);

    // 1. Stand case
    const stalenessStand = assessDecisionStaleness(entry.assumptions, { tightness: 62, riskAppetite: 54 });
    const healthStand = evaluateDecisionAssumptionHealth({ entry, currentTightness: 62, currentRiskAppetite: 54 });
    assert.equal(stalenessStand.verdict, "STAND");
    assert.equal(healthStand.verdict, "STAND");
    assert.equal(stalenessVerdictLabel(stalenessStand.verdict), "STAND");

    // 2. Watch case
    const stalenessWatch = assessDecisionStaleness(entry.assumptions, { tightness: 74, riskAppetite: 55 });
    const healthWatch = evaluateDecisionAssumptionHealth({ entry, currentTightness: 74, currentRiskAppetite: 55 });
    assert.equal(stalenessWatch.verdict, "WATCH");
    assert.equal(healthWatch.verdict, "WATCH");
    assert.equal(stalenessVerdictLabel(stalenessWatch.verdict), "WATCH");

    // 3. Reconsider case
    const stalenessReconsider = assessDecisionStaleness(entry.assumptions, { tightness: 75, riskAppetite: 42 });
    const healthReconsider = evaluateDecisionAssumptionHealth({ entry, currentTightness: 75, currentRiskAppetite: 42 });
    assert.equal(stalenessReconsider.verdict, "RECONSIDER");
    assert.equal(healthReconsider.verdict, "RECONSIDER");
    assert.equal(stalenessVerdictLabel(stalenessReconsider.verdict), "RECONSIDER");
  });

  it("Invariant 3: All delivery channels publish the same call and record date from an OperatingSnapshot", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries: snapshotMacroSeries,
      now: new Date("2026-08-14T00:00:00.000Z"),
    });

    const weeklyCall = snapshot.weeklyCall;
    assert.ok(weeklyCall.currentCall);
    assert.ok(weeklyCall.actionNow);

    // Operator brief projection
    const briefPayload = buildWeeklyOperatorBriefPayload({
      assessment: snapshot.assessment,
      treasury: snapshot.treasury,
      weeklyCall: snapshot.weeklyCall,
    });

    assert.equal(briefPayload.currentCall, weeklyCall.currentCall);
    assert.equal(briefPayload.actionNow, weeklyCall.actionNow);
    assert.equal(briefPayload.regimeStage, weeklyCall.regimeStage);
    assert.equal(briefPayload.pauseIf, weeklyCall.pauseIf);
    assert.equal(briefPayload.callChangesIf, weeklyCall.callChangesIf);
  });

  it("Invariant 4: A historical snapshot always deterministically regenerates the same call", () => {
    const run1 = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries: snapshotMacroSeries,
      now: new Date("2026-08-14T00:00:00.000Z"),
    });

    const run2 = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries: snapshotMacroSeries,
      now: new Date("2026-08-14T00:00:00.000Z"),
    });

    assert.equal(run1.inputHash, run2.inputHash);
    assert.equal(run1.id, run2.id);
    assert.deepEqual(run1.weeklyCall, run2.weeklyCall);
    assert.deepEqual(run1.assessment.scores, run2.assessment.scores);
  });

  it("Invariant 5: Every published artifact points to its source snapshot ID and input hash", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: snapshotData,
      macroSeries: snapshotMacroSeries,
      now: new Date("2026-08-14T00:00:00.000Z"),
    });

    assert.ok(snapshot.id.startsWith("op_"));
    assert.ok(snapshot.inputHash.length > 0);
    assert.ok(snapshot.sourceSnapshotIds.length > 0);
    assert.equal(snapshot.inputHash, hashOperatingInputs(snapshotData, snapshotMacroSeries));
  });

  /*
   * This was "Invariant 6: Production writes fail if durable storage is missing",
   * and it proved nothing: it built a `prodBoundary` object literal, installed it
   * through `setRuntimeBoundaryForTesting`, and then asserted that calling that
   * same literal's own method threw. No production code was involved, and none
   * ever called `lib/runtime/boundary.ts` — its `ensureDurableStorage` promised to
   * refuse a "silent in-memory fallback" that nothing consulted.
   *
   * What the code actually does is the opposite, so that is what this pins.
   * `getOperatingSnapshotStore` falls back to an in-memory store when no KV
   * binding is present, in production as anywhere else: the write succeeds and
   * goes nowhere durable. Whether it should refuse instead is a live question —
   * this repo has paid for silent fallbacks before (see the brief freeze) — but
   * it is a change to a write path, not a cleanup, and docs/agents/lessons/dead-features-and-honesty.md records it.
   */
  it("Invariant 6: the snapshot store falls back to memory when no KV is bound, and says so here", () => {
    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    resetOperatingSnapshotStore();
    assert.equal(getWhetherKv(), null, "the test environment has no KV binding");

    const store = resetOperatingSnapshotStore();

    assert.equal(
      store.constructor.name,
      "InMemoryOperatingSnapshotStore",
      "a missing binding selects the in-memory store; nothing refuses the write",
    );
  });

  it("Invariant 7: Decision Memory is partitioned by owner/clientId", async () => {
    const memoryRepo = new InMemoryDecisionMemoryRepository();

    const entryA = buildDecisionMemoryEntry({
      clientId: "tenant-alpha",
      recordDate: "2026-08-01",
      decision: { lifecycle: "GROWTH", category: "HIRING", action: "HIRE" },
      outcome: { verdict: "SAFE", summary: "Hiring A", guardrail: "none", reversalTrigger: "none" },
      assessment: {
        regime: "DEFENSIVE",
        scores: { tightness: 60, riskAppetite: 55, baseRate: 4.8, curveSlope: 0.2, baseRateUsed: "1M" },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    const entryB = buildDecisionMemoryEntry({
      clientId: "tenant-beta",
      recordDate: "2026-08-01",
      decision: { lifecycle: "DISCOVERY", category: "INFRASTRUCTURE", action: "INFRA_SPEND" },
      outcome: { verdict: "RISKY", summary: "Spending B", guardrail: "none", reversalTrigger: "none" },
      assessment: {
        regime: "DEFENSIVE",
        scores: { tightness: 60, riskAppetite: 55, baseRate: 4.8, curveSlope: 0.2, baseRateUsed: "1M" },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    await memoryRepo.append(entryA);
    await memoryRepo.append(entryB);

    const listAlpha = await memoryRepo.list({ clientId: "tenant-alpha" });
    const listBeta = await memoryRepo.list({ clientId: "tenant-beta" });

    assert.equal(listAlpha.entries.length, 1);
    assert.equal(listAlpha.entries[0]?.context.clientId, "tenant-alpha");
    assert.equal(listAlpha.entries[0]?.outcome.summary, "Hiring A");

    assert.equal(listBeta.entries.length, 1);
    assert.equal(listBeta.entries[0]?.context.clientId, "tenant-beta");
    assert.equal(listBeta.entries[0]?.outcome.summary, "Spending B");
  });

  /**
   * Invariant 8 exists because the rule it enforces was already written down and broken
   * anyway. `docs/editorial-guardrails.md` has told components to consume
   * DECISION_CONTRACT_LABELS for a while; on 2026-09-01 a sweep found the words hardcoded
   * in twenty surfaces, plus a second label map in reportFormatting.ts restating them
   * verbatim for ~30 call sites. A doc that says "don't hardcode this" is a request. This
   * is the guarantee.
   *
   * Only the multi-word labels are checked. The noun slots (Action / Threshold / Reversal
   * / Trigger / Guardrail) are ordinary English that appears legitimately in prose, type
   * names, and domain content, and a rule that cries wolf on those gets deleted rather
   * than obeyed. Matching is whole-label — "Pause if" fails, "Pause if funding pressure rises
   * above 60." does not, because the latter is a threshold's value, not its label — and
   * case-insensitive, because /history/compare shipped "Action Now" in Title Case and a
   * synonym that differs only in capitals is still a synonym.
   */
  /** Every .ts/.tsx source file under `dir`, skipping node_modules and dotfiles. */
  const collectSourceFiles = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) collectSourceFiles(full, out);
      else if (/\.tsx?$/.test(full)) out.push(full);
    }
    return out;
  };

  const SLOT_LABELS = [
    DECISION_CONTRACT_LABELS.action.actionNow,
    DECISION_CONTRACT_LABELS.action.doNow,
    DECISION_CONTRACT_LABELS.threshold.pauseIf,
    DECISION_CONTRACT_LABELS.reversal.resumeWhen,
    DECISION_CONTRACT_LABELS.watch.flipWatch,
    DECISION_CONTRACT_LABELS.watch.watchThisWeek,
    DECISION_CONTRACT_LABELS.watch.watchNext,
  ];

  /** Deliberate exceptions, each a different vocabulary that happens to share a phrase. */
  const SLOT_LABEL_ALLOWLIST = new Map<string, string>([
    [
      "lib/agentSkills.ts:Flip watch",
      "names a capability in the agent skill catalog, peer to 'Constraint translation' and 'PM question log' — not a decision slot, and it must not follow a rename of one",
    ],
  ]);

  /**
   * The gap Invariant 8 left open.
   *
   * It proves no surface spells a label itself, so both the hero and `/operate`
   * were compliant while drawing the same rail under different words: the table
   * held `threshold.guardrail` beside `threshold.pauseIf` and
   * `reversal.clearsWhen` beside `reversal.resumeWhen`, and a component
   * reading either one passed. A vocabulary with synonyms is not a vocabulary.
   */
  it("Invariant 8a: No two contract labels name the same line", () => {
    /* Narrowed rather than asserted. Every value in the table is a string
       today, and a cast would make that an assumption the type system vouches
       for instead of one this test checks — a nested group added later would
       be silently stringified into a comparison rather than skipped. */
    const entries = Object.entries(DECISION_CONTRACT_LABELS).flatMap(([group, labels]) =>
      Object.entries(labels).flatMap(([key, value]) =>
        typeof value === "string" ? [{ path: `${group}.${key}`, value }] : [],
      ),
    );

    const byValue = new Map<string, string[]>();
    for (const { path, value } of entries) {
      byValue.set(value, [...(byValue.get(value) ?? []), path]);
    }

    const duplicates = [...byValue.entries()]
      .filter(([, paths]) => paths.length > 1)
      /* "reachable via", not "reachable as": the hotspot preflight scans added
         lines for type assertions and the English word matched its pattern. */
      .map(([value, paths]) => `"${value}" is reachable via ${paths.join(" and ")}`);

    assert.deepEqual(duplicates, [], `\n${duplicates.join("\n")}\n`);

    /* The retired synonyms, named so a revert reads as the regression it is.
       Each drew a line some other surface drew under the imperative name. */
    const retired = ["Guardrail", "Clears when", "Trigger"];
    /* Widened, not asserted: narrowing the table above gave `value` a literal
       union, and a retired name is by definition not in it. */
    const shipped: string[] = entries.map((entry) => entry.value);
    for (const name of retired) {
      assert.ok(!shipped.includes(name), `"${name}" is back in the contract vocabulary`);
    }
  });

  it("Invariant 8: Bounded-decision slot labels are never hardcoded outside reportCopy.ts", () => {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchers = SLOT_LABELS.map((label) => {
      const e = escape(label);
      return {
        label,
        patterns: [
          // "Pause if" / "Pause if:" as a whole string literal, not a longer sentence.
          new RegExp(`(["'])${e}:?\\s*\\1`, "i"),
          // `Pause if: ${value}` — the label prefixing an interpolated value.
          new RegExp("`" + e + ":", "i"),
          // >Pause if:</span> — a JSX text node that is only the label.
          new RegExp(`>\\s*${e}:?\\s*[<{]`, "i"),
          // A JSX text node on its own line, immediately before an expression.
          new RegExp(`^\\s*${e}:\\s*\\{`, "i"),
        ],
      };
    });

    const files = [...collectSourceFiles(join(repoRoot, "app")), ...collectSourceFiles(join(repoRoot, "lib"))]
      .filter((file) => !file.endsWith("lib/report/reportCopy.ts"));

    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(repoRoot, file);
      readFileSync(file, "utf8").split("\n").forEach((line, index) => {
        const trimmed = line.trim();
        // Comments discussing the vocabulary are documentation, not drift.
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
        for (const { label, patterns } of matchers) {
          if (SLOT_LABEL_ALLOWLIST.has(`${rel}:${label}`)) continue;
          if (patterns.some((pattern) => pattern.test(line))) {
            violations.push(`${rel}:${index + 1} hardcodes "${label}" — read it from DECISION_CONTRACT_LABELS`);
          }
        }
      });
    }

    assert.deepEqual(violations, [], `\n${violations.join("\n")}\n`);
  });

  /**
   * Invariant 9 guards heading vocabulary the way Invariant 8 guards slot labels.
   *
   * A heading is the operator's scan path; when it carries an internal codename or an
   * engine term, the reader has to translate it before deciding whether the block matters.
   * The 2026-09-02 inventory of every h1–h4, eyebrow, and section label found these on live
   * routes: "Decision contract" on four, "Epoch" across /history/compare and its OG image,
   * "AI Transmission Synthesizer" and "Post-MVP demand" on /operate, "Operator Loop" in the
   * mobile drawer. docs/editorial-guardrails.md → Headings names the replacements; this test
   * keeps the retired words from coming back.
   *
   * Terms match on word boundaries in non-comment lines, so identifiers (`epochA`,
   * `CompareEpoch`, `latestEpoch`) and comments stay free to use the engine's words.
   */
  const RETIRED_HEADING_TERMS = [
    "Decision contract",
    "Continue decision flow",
    "Epoch",
    "Transmission Synthesizer",
    "Operator Loop",
    "Canon references",
    "Included instruments",
    "Other handoffs",
    "Red-Team",
    "Stress-Tester",
    "Post-MVP",
    "Primary keyword:",
  ];

  /** Line numbers (1-based) inside a comment, so prose about the vocabulary is not drift. */
  const commentLines = (source: string): Set<number> => {
    const inside = new Set<number>();
    let inBlock = false;
    source.split("\n").forEach((line, index) => {
      const trimmed = line.trim();
      if (inBlock) {
        inside.add(index + 1);
        if (trimmed.includes("*/")) inBlock = false;
        return;
      }
      const opener = trimmed.indexOf("/*");
      if (opener !== -1 && !trimmed.includes("*/", opener + 2)) {
        inBlock = true;
        inside.add(index + 1);
        return;
      }
      if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("{/*")) inside.add(index + 1);
    });
    return inside;
  };

  it("Invariant 9: Retired heading vocabulary never reaches user-visible source", () => {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchers = RETIRED_HEADING_TERMS.map((term) => ({
      term,
      pattern: new RegExp(`\\b${escape(term)}${/\w$/.test(term) ? "\\b" : ""}`),
    }));

    const files = [...collectSourceFiles(join(repoRoot, "app")), ...collectSourceFiles(join(repoRoot, "lib"))];

    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(repoRoot, file);
      const source = readFileSync(file, "utf8");
      const skip = commentLines(source);
      source.split("\n").forEach((line, index) => {
        if (skip.has(index + 1)) return;
        for (const { term, pattern } of matchers) {
          if (pattern.test(line)) {
            violations.push(`${rel}:${index + 1} says "${term}" — retired heading vocabulary, see docs/editorial-guardrails.md → Headings`);
          }
        }
      });
    }

    assert.deepEqual(violations, [], `\n${violations.join("\n")}\n`);
  });

  /*
   * Invariant 10 exists because `/.well-known/whether-agent.json` 404ed in production
   * for as long as it existed, while `tests/agentRoutes.test.ts` imported the route
   * module and called GET() directly and passed. vinext enumerates App Router files
   * with Node's `glob`, where `*` does not match a leading dot, so any route under a
   * dot-directory is silently unreachable — the request falls through to the app shell
   * and answers HTML. The handler is fine; only the router never learns about it.
   *
   * A handler test cannot catch this class of defect, because the thing that is broken
   * is the registration, not the handler. Walking `app/` is what notices.
   */
  it("Invariant 10: no route or page file is hidden from the router by a dot-directory", () => {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    const appDir = join(repoRoot, "app");
    const ROUTE_FILES = new Set(["route.ts", "route.tsx", "page.ts", "page.tsx"]);
    const unreachable: string[] = [];

    const walk = (dir: string, hiddenBy: string | null) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          // node_modules-style noise never appears under app/, so the only reason a
          // segment starts with "." is that someone meant it as a URL segment.
          walk(full, hiddenBy ?? (entry.name.startsWith(".") ? relative(repoRoot, full) : null));
          continue;
        }
        if (hiddenBy && ROUTE_FILES.has(entry.name)) {
          unreachable.push(
            `${relative(repoRoot, full)} can never be served: "${hiddenBy}" starts with a dot, ` +
              "which vinext's route scan skips. Serve it from worker/index.ts instead — see lib/agentManifest.ts.",
          );
        }
      }
    };

    walk(appDir, null);

    assert.deepEqual(unreachable, [], `\n${unreachable.join("\n")}\n`);
  });

  /*
   * Invariant 11: a data attribute the app queries must be one the app also sets.
   *
   * `KeyboardShortcuts.tsx` moves between sections with
   * `querySelectorAll("[data-page-section]")`, and that attribute appeared nowhere in
   * the app — the query was its only mention. So J and K were dead on every page while
   * three separate surfaces advertised them: the shortcut bar rendered in the footer of
   * every page, the `?` help modal, and the "j k next / previous" hint printed beside
   * the tab strip on /operate. `reportSection.tsx` even documented the behaviour in its
   * own comment ("the outline sidebar links to them and J/K jumps between them").
   *
   * A consumer with no producer is invisible to every other check here: it type-checks,
   * it lints, it renders, and the handler runs without throwing — it just never matches
   * anything. Only comparing the two sides catches it.
   */
  it("Invariant 11: every data attribute the app queries is set somewhere in the app", () => {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    const files = collectSourceFiles(join(repoRoot, "app"));
    const sources = files.map((file) => ({ rel: relative(repoRoot, file), text: readFileSync(file, "utf8") }));

    // Queries inside comments do not run. `briefArtifactScript.tsx` and
    // `lib/report/briefArtifact.ts` both describe a retired `[data-share-section]`
    // approach in prose, and counting those as live queries reported a defect that
    // does not exist.
    const queried = new Map<string, string>();
    for (const { rel, text } of sources) {
      const skip = commentLines(text);
      text.split("\n").forEach((line, index) => {
        if (skip.has(index + 1)) return;
        // The generic is not optional in practice: the live call is
        // `querySelectorAll<HTMLElement>("[data-page-section]")`, and a pattern that
        // required `(` straight after the method name matched nothing at all — the
        // first version of this test passed against a tree with the producers deleted.
        for (const match of line.matchAll(/querySelector(?:All)?(?:<[^>]*>)?\(\s*["'`]\[(data-[a-z0-9-]+)[\]=]/g)) {
          if (!queried.has(match[1])) queried.set(match[1], `${rel}:${index + 1}`);
        }
      });
    }

    const orphaned: string[] = [];
    for (const [attribute, queriedAt] of queried) {
      const queriedIn = queriedAt.split(":")[0];
      /*
       * A producer writes the attribute in JSX. It may carry a value
       * (`data-page-section={id}`) or stand alone (`data-sticky-strip-hide`), so the
       * match is "the name, not inside a selector bracket". Requiring `=` missed the
       * valueless form and reported two live attributes as dead.
       */
      const producer = new RegExp(`(^|[\\s{])${attribute}(\\s|=|/|>|$)`, "m");
      const setSomewhere = sources.some(({ rel, text }) => rel !== queriedIn && producer.test(text));
      if (!setSomewhere) {
        orphaned.push(
          `${queriedAt} queries [${attribute}], but nothing in app/ sets it — the selector can never match.`,
        );
      }
    }

    assert.deepEqual(orphaned, [], `\n${orphaned.join("\n")}\n`);
  });

  /*
   * The engine scores; it does not write copy, render, or read bundled data.
   * Until 2026-10-06 the state machine lived in `lib/report/` and imported its
   * signal labels from there, the diagnostics did the same, and the policy
   * composites imported the 1.2MB Time Machine cache through
   * `lib/policy/history.ts` — so a wording edit was a commit to a scoring file
   * and a scored reading depended on a file its caller never named.
   *
   * The modules below are the engine, listed by hand so adding one is a
   * decision. Everything they import, transitively, must stay inside the list
   * (plus `lib/types.ts`), and nothing they reach may be under `lib/report/` or
   * `app/`, a JSON file, or React or Next. Two files sit outside on purpose and
   * are the only places the engine touches either: `lib/regimeEngine.ts`
   * composes the scorer with the report layer's description step and the
   * bundled policy history, and `lib/policy/history.ts` is that history.
   */
  it("Invariant 12: the regime engine imports nothing from lib/report/, React, or bundled data", () => {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    const ENGINE_MODULES = [
      "lib/regimeEngineCore.ts",
      "lib/regimeEngineScoring.ts",
      "lib/regimeEngineDiagnostics.ts",
      "lib/regimeEnginePolicy.ts",
      "lib/regimeStateMachine.ts",
      "lib/policy/config.ts",
      "lib/policy/governance.ts",
      "lib/policy/transforms.ts",
      "lib/thresholds.ts",
    ];
    const ALSO_ALLOWED = new Set(["lib/types.ts"]);

    const specifiersOf = (source: string): string[] => {
      const found: string[] = [];
      const patterns = [
        /\b(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/g,
        /^\s*import\s*["']([^"']+)["']/gm,
        /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
        /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
      ];
      for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) found.push(match[1]);
      }
      return found;
    };

    const resolveRelative = (fromRel: string, specifier: string): string => {
      const base = relative(repoRoot, join(repoRoot, dirname(fromRel), specifier));
      if (/\.(json|tsx?)$/.test(base)) return base;
      for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
        if (statSync(join(repoRoot, candidate), { throwIfNoEntry: false })?.isFile()) return candidate;
      }
      return base;
    };

    /** Every boundary violation reachable from `roots`, and every module reached outside the allowed set. */
    const scan = (roots: readonly string[]) => {
      const violations: string[] = [];
      const outside: string[] = [];
      const seen = new Set<string>();
      const queue = [...roots];
      while (queue.length > 0) {
        const file = queue.shift();
        if (file === undefined || seen.has(file)) continue;
        seen.add(file);
        for (const specifier of specifiersOf(readFileSync(join(repoRoot, file), "utf8"))) {
          if (!specifier.startsWith(".")) {
            if (/^(react|react-dom|next)(\/|$)/.test(specifier)) violations.push(`${file} imports ${specifier}`);
            continue;
          }
          const target = resolveRelative(file, specifier);
          if (target.endsWith(".json") || target.startsWith("data/")) {
            violations.push(`${file} imports bundled data ${target}`);
          } else if (target.startsWith("lib/report/") || target.startsWith("app/")) {
            violations.push(`${file} imports ${target}`);
          } else {
            if (!roots.includes(target) && !ALSO_ALLOWED.has(target)) outside.push(`${file} -> ${target}`);
            queue.push(target);
          }
        }
      }
      return { violations, outside };
    };

    const engine = scan(ENGINE_MODULES);
    assert.deepEqual(engine.violations, [], `\n${engine.violations.join("\n")}\n`);
    assert.deepEqual(
      engine.outside,
      [],
      `\nThe engine reaches modules outside its list. Keep the import inside the engine, or add the module to ENGINE_MODULES if it is engine code:\n${engine.outside.join("\n")}\n`,
    );

    // The scan is not vacuous: the composition layer is where the report and data imports went.
    const composition = scan(["lib/regimeEngine.ts"]).violations;
    assert.ok(composition.some((line) => line.includes("lib/report/regimeDescription.ts")), composition.join("\n"));
    assert.ok(composition.some((line) => line.includes("data/time_machine_cache.json")), composition.join("\n"));
  });
});
