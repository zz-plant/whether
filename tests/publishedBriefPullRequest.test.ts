import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GitHubRepoClient, fromBase64Utf8, toBase64Utf8 } from "../lib/github/repoClient";
import { formatIsoWeekSlug, getIsoWeekInfo } from "../lib/isoWeek";
import { macroSeries } from "../lib/macroSnapshot";
import { ENGINE_VERSION, evaluateRegime } from "../lib/regimeEngine";
import { PublishedBriefIndexSchema, PublishedBriefSchema, getPublishedBriefs, type PublishedBrief } from "../lib/report/publishedBriefs";
import {
  PUBLISHED_BRIEFS_FILE_PATH,
  buildPublishedBriefFileUpdate,
  buildPublishedBriefUpdateAgainstBase,
  openPublishedBriefPullRequest,
  publishedBriefBranchName,
  readPublishedBriefsFromBranch,
} from "../lib/report/publishedBriefPullRequest";
import { assembleCurrentWeekBrief, buildPublishedBriefRecord } from "../lib/report/publishedBriefRecord";
import { findWeeklyComparisonReading, rescoreStoredInputs } from "../lib/report/comparisonReading";
import { buildWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { buildReportDataFixture, buildTreasuryFixture } from "./fixtures/reportFixtures";

const bundled = getPublishedBriefs();
const newest = bundled[0];

/** A week the bundle cannot have yet: the ISO week after its newest entry. */
const nextWeekRecord = (): PublishedBrief => {
  const recordDate = new Date(`${newest.recordDate}T00:00:00.000Z`);
  recordDate.setUTCDate(recordDate.getUTCDate() + 7);
  const isoWeek = getIsoWeekInfo(recordDate);
  const dateOnly = recordDate.toISOString().slice(0, 10);
  return {
    ...newest,
    slug: formatIsoWeekSlug(isoWeek),
    year: isoWeek.year,
    week: isoWeek.week,
    publishedAt: recordDate.toISOString(),
    recordDate: dateOnly,
    correction: null,
  };
};

const fileBody = (briefs: PublishedBrief[]) => `${JSON.stringify(briefs, null, 2)}\n`;

/** Enough of GitHub's REST API, in memory, to land the archive behind a pull request. */
class FakeGitHub {
  calls: Array<{ method: string; path: string; body?: Record<string, unknown> }> = [];
  branches = new Map<string, string>([["main", "sha-main-000"]]);
  files = new Map<string, { sha: string; content: string }>();
  openPulls: Array<{ number: number; head: string; html_url: string }> = [];

  constructor(mainFileContent: string) {
    this.files.set(`main:${PUBLISHED_BRIEFS_FILE_PATH}`, { sha: "sha-file-main", content: mainFileContent });
  }

  readonly fetcher: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? "GET";
    const path = url.pathname.replace("/repos/zz-plant/whether", "") + url.search;
    const body: Record<string, unknown> | undefined = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    this.calls.push({ method, path, body });

    const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status });

    if (method === "GET" && path.startsWith("/git/ref/heads/")) {
      const branch = decodeURIComponent(path.slice("/git/ref/heads/".length));
      const sha = this.branches.get(branch);
      return sha ? json({ object: { sha } }) : json({ message: "Not Found" }, 404);
    }
    if (method === "POST" && path === "/git/refs") {
      const branch = String(body?.ref).replace("refs/heads/", "");
      this.branches.set(branch, `sha-${branch}`);
      const file = this.files.get(`main:${PUBLISHED_BRIEFS_FILE_PATH}`);
      if (file) this.files.set(`${branch}:${PUBLISHED_BRIEFS_FILE_PATH}`, file);
      return json({ ref: body?.ref }, 201);
    }
    if (path.startsWith("/contents/")) {
      const filePath = decodeURIComponent(path.slice("/contents/".length).split("?")[0]);
      if (method === "GET") {
        const ref = url.searchParams.get("ref") ?? "main";
        const file = this.files.get(`${ref}:${filePath}`);
        return file ? json({ sha: file.sha, content: toBase64Utf8(file.content) }) : json({ message: "Not Found" }, 404);
      }
      if (method === "PUT") {
        const branch = String(body?.branch);
        this.files.set(`${branch}:${filePath}`, { sha: `sha-${branch}-file`, content: fromBase64Utf8(String(body?.content)) });
        return json({ content: { sha: `sha-${branch}-file` } }, 201);
      }
    }
    if (method === "GET" && path.startsWith("/pulls?")) {
      const head = url.searchParams.get("head") ?? "";
      return json(this.openPulls.filter((pull) => `zz-plant:${pull.head}` === head));
    }
    if (method === "POST" && path === "/pulls") {
      const number = this.openPulls.length + 1;
      const pull = { number, head: String(body?.head), html_url: `https://github.com/zz-plant/whether/pull/${number}` };
      this.openPulls.push(pull);
      return json(pull, 201);
    }
    return json({ message: `no fake for ${method} ${path}` }, 500);
  };

  client() {
    return new GitHubRepoClient({ token: "ghp_test_token", repository: "zz-plant/whether", fetcher: this.fetcher });
  }
}

describe("buildPublishedBriefFileUpdate", () => {
  it("appends a new week in the freeze script's file format, sorted by publication", () => {
    const record = nextWeekRecord();
    const update = buildPublishedBriefFileUpdate(record, bundled);

    assert.equal(update.changed, true);
    assert.equal(update.slug, record.slug);
    assert.ok(update.content.endsWith("\n"));
    const parsed: PublishedBrief[] = JSON.parse(update.content);
    assert.equal(parsed.length, bundled.length + 1);
    assert.equal(parsed[parsed.length - 1]?.slug, record.slug, "newest week is last, as the script writes it");
    assert.equal(update.content, fileBody(parsed), "two-space indentation");
  });

  it("leaves a week the archive already carries exactly as it is: the archive is append-only", () => {
    const rewritten = { ...newest, summary: "a different sentence" };
    const update = buildPublishedBriefFileUpdate(rewritten, bundled);

    assert.equal(update.changed, false);
    const parsed: PublishedBrief[] = JSON.parse(update.content);
    assert.equal(parsed.find((brief) => brief.slug === newest.slug)?.summary, newest.summary);
  });
});

describe("merging against the base branch", () => {
  it("reads and validates the archive on the branch", async () => {
    const github = new FakeGitHub(fileBody(bundled));
    const briefs = await readPublishedBriefsFromBranch(github.client(), "main");
    assert.equal(briefs.length, bundled.length);
  });

  it("keeps weeks that reached main after this deployment was built", async () => {
    const onMain = nextWeekRecord();
    const fromWorker = { ...onMain, slug: `${onMain.slug}x`, publishedAt: new Date(Date.parse(onMain.publishedAt) + 7 * 86_400_000).toISOString() };
    const github = new FakeGitHub(fileBody([...bundled, onMain]));

    const update = await buildPublishedBriefUpdateAgainstBase({ client: github.client(), base: "main", record: fromWorker });

    const parsed: PublishedBrief[] = JSON.parse(update.content);
    assert.equal(update.changed, true);
    assert.ok(parsed.some((brief) => brief.slug === onMain.slug), "main's week survives the merge");
    assert.equal(parsed.length, bundled.length + 2);
  });

  it("reports no change when main already carries the week, even if this deployment's bundle does not", async () => {
    const onMain = nextWeekRecord();
    const github = new FakeGitHub(fileBody([...bundled, onMain]));

    const update = await buildPublishedBriefUpdateAgainstBase({ client: github.client(), base: "main", record: onMain });

    assert.equal(update.changed, false);
    assert.equal(github.calls.length, 1, "one read of the base file, nothing written");
  });

  it("refuses to proceed when the base file is missing or does not validate", async () => {
    const missing = new FakeGitHub("[]");
    missing.files.delete(`main:${PUBLISHED_BRIEFS_FILE_PATH}`);
    await assert.rejects(readPublishedBriefsFromBranch(missing.client(), "main"), /is missing on main/);

    const invalid = new FakeGitHub("not json");
    await assert.rejects(readPublishedBriefsFromBranch(invalid.client(), "main"), /is not JSON/);

    const wrongShape = new FakeGitHub(JSON.stringify([{ slug: "2026-w40" }]));
    await assert.rejects(readPublishedBriefsFromBranch(wrongShape.client(), "main"), /did not validate/);
  });
});

describe("openPublishedBriefPullRequest", () => {
  const now = new Date("2026-09-14T14:05:00.000Z");

  it("branches from main under the week's name, commits the archive, and opens the pull request", async () => {
    const github = new FakeGitHub(fileBody(bundled));
    const record = nextWeekRecord();
    const update = buildPublishedBriefFileUpdate(record, bundled);

    const result = await openPublishedBriefPullRequest({ client: github.client(), update, now });

    assert.equal(result.opened, true);
    if (!result.opened) return;
    assert.equal(result.alreadyOpen, false);
    assert.equal(result.branch, publishedBriefBranchName(record.slug));
    assert.equal(result.branch, `automation/weekly-brief-freeze-${record.slug}`);

    const methods = github.calls.map((call) => `${call.method} ${call.path.split("?")[0]}`);
    assert.deepEqual(methods, [
      "GET /pulls",
      "GET /git/ref/heads/main",
      `GET /git/ref/heads/${encodeURIComponent(result.branch)}`,
      "POST /git/refs",
      `GET /contents/${PUBLISHED_BRIEFS_FILE_PATH}`,
      `PUT /contents/${PUBLISHED_BRIEFS_FILE_PATH}`,
      "POST /pulls",
    ]);

    assert.equal(github.files.get(`${result.branch}:${PUBLISHED_BRIEFS_FILE_PATH}`)?.content, update.content);

    const pullBody = github.calls.find((call) => call.method === "POST" && call.path === "/pulls")?.body;
    assert.ok(pullBody);
    assert.equal(pullBody.base, "main");
    assert.equal(pullBody.title, `chore: freeze the ${record.slug} brief`);
    assert.match(String(pullBody.body), /append-only/);
    assert.match(String(pullBody.body), new RegExp(`/brief/${record.slug}`));
  });

  it("is idempotent for the week: a second run reports the open pull request instead of opening another", async () => {
    const github = new FakeGitHub(fileBody(bundled));
    const update = buildPublishedBriefFileUpdate(nextWeekRecord(), bundled);

    const first = await openPublishedBriefPullRequest({ client: github.client(), update, now });
    const second = await openPublishedBriefPullRequest({ client: github.client(), update, now });

    assert.ok(first.opened && second.opened);
    if (!first.opened || !second.opened) return;
    assert.equal(second.alreadyOpen, true);
    assert.equal(second.pullRequest.number, first.pullRequest.number);
    assert.equal(github.openPulls.length, 1);
  });

  it("does nothing when the update carries no change", async () => {
    const github = new FakeGitHub(fileBody(bundled));
    const result = await openPublishedBriefPullRequest({ client: github.client(), update: buildPublishedBriefFileUpdate(newest, bundled), now });
    assert.equal(result.opened, false);
    assert.equal(github.calls.length, 0);
  });
});

describe("assembleCurrentWeekBrief", () => {
  const liveReportData = buildReportDataFixture({
    treasury: { isLive: true, fallback_at: undefined, fallback_reason: undefined },
  });
  const liveSnapshot = buildWeeklyBriefSnapshot({ reportData: liveReportData, degraded: false });
  /* The fixture's record date is fixed; the clock is set beside it so the week is publishable. */
  const now = new Date(`${liveReportData.treasury.record_date}T15:00:00.000Z`);

  it("builds a record that validates against the archive schema and names the record date's ISO week", async () => {
    const result = await assembleCurrentWeekBrief({
      now,
      load: async () => ({ reportData: liveReportData, degraded: false, snapshot: liveSnapshot }),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.slug, formatIsoWeekSlug(getIsoWeekInfo(new Date(liveReportData.treasury.record_date))));
    assert.equal(result.record.slug, result.slug);
    assert.equal(result.record.recordDate, liveReportData.treasury.record_date);
    assert.ok(PublishedBriefSchema.safeParse(result.record).success, "the record is what data/published_briefs.json carries");
    assert.equal(result.record.publishedAt, new Date(liveReportData.treasury.record_date).toISOString());
    assert.equal(result.record.correction, null);
    assert.ok(result.record.decisions.length > 0);
    assert.ok(result.record.scores);
    /* The archive is citable and append-only. The two weeks it froze before this said "Pressure
       increased by +3.0 this week. Slow new commitments until conditions stabilize" beside "freeze
       new commitments": a figure in a unit nothing else uses, and an instruction of its own. */
    assert.doesNotMatch(result.record.whatChanged, /Pressure (increased|eased)|Slow new commitments|Move faster on/);
    assert.match(
      result.record.whatChanged,
      /no pause or restart line was crossed|pause now applies|pause no longer applies|restart line is now met|restart line is no longer met/,
    );
  });

  it("keeps an existing week's publication stamp and correction on a re-freeze", async () => {
    const result = await assembleCurrentWeekBrief({
      now,
      load: async () => ({ reportData: liveReportData, degraded: false, snapshot: liveSnapshot }),
      findExisting: (slug) => ({ ...newest, slug, publishedAt: "2020-01-01T00:00:00.000Z", correction: "Corrected the flip line." }),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.publishedAt, "2020-01-01T00:00:00.000Z");
    assert.equal(result.record.correction, "Corrected the flip line.");
  });

  it("refuses fallback data with the guard's reason, before any record is built", async () => {
    const fallbackReportData = buildReportDataFixture({
      treasury: { isLive: false, fallback_reason: "FRED returned 403" },
    });
    const fallbackSnapshot = buildWeeklyBriefSnapshot({ reportData: fallbackReportData, degraded: false });

    const result = await assembleCurrentWeekBrief({
      now,
      load: async () => ({ reportData: fallbackReportData, degraded: false, snapshot: fallbackSnapshot }),
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /fallback snapshot/);
  });

  it("refuses a record date outside the publish window", async () => {
    const result = await assembleCurrentWeekBrief({
      now: new Date(Date.parse(liveReportData.treasury.record_date) + 30 * 86_400_000),
      load: async () => ({ reportData: liveReportData, degraded: false, snapshot: liveSnapshot }),
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /days old/);
  });

  it("exposes the pure builder for both writers", () => {
    const isoWeek = getIsoWeekInfo(new Date(liveReportData.treasury.record_date));
    const record = buildPublishedBriefRecord({ reportData: liveReportData, snapshot: liveSnapshot, recordDate: liveReportData.treasury.record_date, isoWeek });
    assert.equal(record.year, isoWeek.year);
    assert.equal(record.week, isoWeek.week);
  });

  /* w38–w40 stored moves from Aug 31 with no date, and the page called each "vs prior week". */
  it("stores the scores' moves only with the reading they are measured against", () => {
    const isoWeek = getIsoWeekInfo(new Date(liveReportData.treasury.record_date));
    const comparedWith = { recordDate: "2026-01-30", label: "Jan 30" };
    const datedReport = buildReportDataFixture({
      treasury: { isLive: true, fallback_at: undefined, fallback_reason: undefined },
      reportDynamics: { ...liveReportData.reportDynamics, comparedWith },
    });
    const dated = buildPublishedBriefRecord({
      reportData: datedReport,
      snapshot: buildWeeklyBriefSnapshot({ reportData: datedReport, degraded: false }),
      recordDate: datedReport.treasury.record_date,
      isoWeek,
    });
    assert.deepEqual(dated.scores?.comparedWith, comparedWith);
    assert.equal(dated.scores?.tightnessDelta, 2, "the fixture's funding-pressure move");
    assert.equal(dated.scores?.riskAppetiteDelta, 0, "a score under the reporting floor moved by zero, not by nothing");
    assert.ok(PublishedBriefSchema.safeParse(dated).success);

    const undated = buildPublishedBriefRecord({ reportData: liveReportData, snapshot: liveSnapshot, recordDate: liveReportData.treasury.record_date, isoWeek });
    assert.equal(liveReportData.reportDynamics.comparedWith, undefined);
    assert.equal(undated.scores?.comparedWith, undefined);
    assert.equal(undated.scores?.tightnessDelta, null, "a move against a reading nobody named is not stored");
    assert.equal(undated.scores?.riskAppetiteDelta, null);
  });

  /* Next week compares with this record, and w38–w40 stored no rate to compare with,
     nor the engine that scored them. */
  it("stores the short-term rate and the recession warning gauge it published, so next week can compare them", () => {
    const isoWeek = getIsoWeekInfo(new Date(liveReportData.treasury.record_date));
    const record = buildPublishedBriefRecord({ reportData: liveReportData, snapshot: liveSnapshot, recordDate: liveReportData.treasury.record_date, isoWeek });
    assert.equal(record.scores?.baseRate, liveReportData.assessment.scores.baseRate);
    assert.equal(record.scores?.curveSlope, liveReportData.assessment.scores.curveSlope);
    assert.ok(PublishedBriefSchema.safeParse(record).success);

    /* The fixture's scores are hand-set, not its treasury's, so no engine reproduces
       them: the record names no engine and stores no inputs ("the inputs a record
       stores" below), and next week passes it over under any engine. It named this
       engine until 2026-10-07, which next week would have compared with as stored. */
    const nextWeek = new Date(Date.parse(`${record.recordDate}T00:00:00.000Z`) + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rescore = rescoreStoredInputs(evaluateRegime, liveReportData.assessment.thresholds);
    assert.equal(record.scores?.engineVersion, undefined);
    assert.equal(record.inputs, undefined);
    assert.equal(findWeeklyComparisonReading([record], nextWeek, ENGINE_VERSION, rescore), null);
    assert.equal(findWeeklyComparisonReading([record], nextWeek, "engine-next", rescore), null, "a scoring change since is not a market move");

    const missingRate = buildReportDataFixture({
      treasury: { isLive: true, fallback_at: undefined, fallback_reason: undefined },
      assessment: { scores: { baseRateUsed: "MISSING", baseRate: 0 } },
    });
    const withoutRate = buildPublishedBriefRecord({
      reportData: missingRate,
      snapshot: buildWeeklyBriefSnapshot({ reportData: missingRate, degraded: false }),
      recordDate: missingRate.treasury.record_date,
      isoWeek,
    });
    assert.equal(withoutRate.scores?.baseRate, null, "a missing rate scores as 0, which is not a reading");
  });
});

/*
 * A record frozen from 2026-10-07 stores what the engine scored, so that after an
 * ENGINE_VERSION bump next week scores it again instead of dropping to the
 * month-end (docs/feature-specs-current.md §1.1.53).
 */
describe("the inputs a record stores", () => {
  const recordDate = "2026-03-02";
  const isoWeek = getIsoWeekInfo(new Date(recordDate));
  /* A week whose scores are its own inputs': the engine scored this treasury and these series. */
  const treasury = buildTreasuryFixture({
    record_date: recordDate,
    isLive: true,
    yields: { oneMonth: 3.62, threeMonth: 3.7, twoYear: 3.55, tenYear: 4.1 },
    /* 91 days before the latest print: the tightening-speed term resolves this pair. */
    oneMonthHistory: [
      { date: "2025-12-01", value: 3.1 },
      { date: "2026-01-02", value: 3.3 },
      { date: "2026-03-02", value: 3.62 },
    ],
  });
  const assessment = evaluateRegime(treasury, undefined, macroSeries, null, { baseRateHistory: treasury.oneMonthHistory });
  const scoredReport = buildReportDataFixture({
    treasury,
    macroSeries,
    assessment: { regime: assessment.regime, scores: assessment.scores, thresholds: assessment.thresholds },
  });
  const record = buildPublishedBriefRecord({
    reportData: scoredReport,
    snapshot: buildWeeklyBriefSnapshot({ reportData: scoredReport, degraded: false }),
    recordDate,
    isoWeek,
  });

  it("are what the scorer read: the yields, the speed term's two prints, the scored series' values, the VIX closes", () => {
    assert.ok(assessment.scores.baseRateVelocityPoints, "the fixture exercises the tightening-speed term");
    const value = (id: string) => macroSeries.find((series) => series.id === id)?.value;
    assert.deepEqual(record.inputs, {
      yields: { oneMonth: 3.62, threeMonth: 3.7, twoYear: 3.55, tenYear: 4.1 },
      baseRateWindow: { compareDate: "2025-12-01", compareValue: 3.1, latestDate: "2026-03-02", latestValue: 3.62 },
      macro: {
        HY_CREDIT_SPREAD: value("HY_CREDIT_SPREAD"),
        CHICAGO_FCI: value("CHICAGO_FCI"),
        VIX_INDEX: value("VIX_INDEX"),
        VC_FUNDING_VELOCITY: value("VC_FUNDING_VELOCITY"),
        TECH_LAYOFF_TREND: value("TECH_LAYOFF_TREND"),
      },
      vixCloses: (macroSeries.find((series) => series.id === "VIX_INDEX")?.history ?? []).map((point) => point.value).slice(-10),
    });
  });

  it("re-score, under the engine that froze them, to the record's scores exactly", () => {
    const { inputs } = record;
    assert.ok(inputs);
    const rescored = rescoreStoredInputs(evaluateRegime, assessment.thresholds)(inputs, recordDate);
    assert.deepEqual(rescored.scores, {
      tightness: record.scores?.tightness,
      riskAppetite: record.scores?.riskAppetite,
      baseRate: record.scores?.baseRate,
      curveSlope: record.scores?.curveSlope,
    });
    assert.equal(rescored.regime, record.regime);
  });

  it("name the engine that reproduced them, and are compared with as stored under it", () => {
    assert.equal(record.scores?.engineVersion, ENGINE_VERSION);
    const nextWeek = "2026-03-09";
    const notRescored = () => {
      throw new Error("a record this engine scored is compared as stored");
    };
    assert.deepEqual(findWeeklyComparisonReading([record], nextWeek, ENGINE_VERSION, notRescored)?.scores, {
      tightness: assessment.scores.tightness,
      riskAppetite: assessment.scores.riskAppetite,
      baseRate: record.scores?.baseRate,
      curveSlope: assessment.scores.curveSlope,
    });
  });

  it("round-trip through the archive schema as the file is written, and are refused when malformed", () => {
    const written: unknown = JSON.parse(fileBody([record]));
    const [read] = PublishedBriefIndexSchema.parse(written);
    assert.ok(read.inputs);
    assert.deepEqual([read], written, "nothing stripped, nothing added");
    assert.deepEqual(read.inputs, record.inputs);
    assert.equal(PublishedBriefSchema.safeParse({ ...read, inputs: { ...read.inputs, vixCloses: ["16.8"] } }).success, false);
    assert.equal(PublishedBriefSchema.safeParse({ ...read, inputs: { macro: {} } }).success, false, "no yields, no record of what was scored");
    assert.ok(PublishedBriefSchema.safeParse({ ...read, inputs: undefined }).success, "a record frozen before inputs were stored");
  });

  it("are not stored when they do not reproduce the record's scores", () => {
    /* The default fixture's scores are hand-set: funding pressure 72 where its treasury scores 95. */
    const handSet = buildReportDataFixture({ treasury: { isLive: true, fallback_at: undefined, fallback_reason: undefined } });
    const unscored = buildPublishedBriefRecord({
      reportData: handSet,
      snapshot: buildWeeklyBriefSnapshot({ reportData: handSet, degraded: false }),
      recordDate: handSet.treasury.record_date,
      isoWeek: getIsoWeekInfo(new Date(handSet.treasury.record_date)),
    });
    assert.equal("inputs" in unscored, false, "absent, not undefined: the record re-reads as written");
    assert.equal(unscored.scores && "engineVersion" in unscored.scores, false, "nor the engine, whose scores these are not");
  });
});
