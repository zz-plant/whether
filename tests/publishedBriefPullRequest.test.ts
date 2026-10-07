import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GitHubRepoClient, fromBase64Utf8, toBase64Utf8 } from "../lib/github/repoClient";
import { formatIsoWeekSlug, getIsoWeekInfo } from "../lib/isoWeek";
import { PublishedBriefSchema, getPublishedBriefs, type PublishedBrief } from "../lib/report/publishedBriefs";
import {
  PUBLISHED_BRIEFS_FILE_PATH,
  buildPublishedBriefFileUpdate,
  buildPublishedBriefUpdateAgainstBase,
  openPublishedBriefPullRequest,
  publishedBriefBranchName,
  readPublishedBriefsFromBranch,
} from "../lib/report/publishedBriefPullRequest";
import { assembleCurrentWeekBrief, buildPublishedBriefRecord } from "../lib/report/publishedBriefRecord";
import { buildWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { buildReportDataFixture } from "./fixtures/reportFixtures";

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
      /no pause or resume line was crossed|pause now applies|pause no longer applies|resume line is now met|resume line is no longer met/,
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
});
