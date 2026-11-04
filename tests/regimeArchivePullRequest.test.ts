import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { z } from "zod";

import { GitHubApiError, GitHubRepoClient } from "../lib/github/repoClient";
import { extractCalibrationMonths } from "../lib/report/confidenceCalibration";
import { buildPostureArchivePeriods } from "../lib/summary/postureArchiveIndex";
import { REGIME_ARCHIVE_PATHS, weeklySummariesPath } from "../lib/summary/regimeArchiveFiles";
import { commitRegimeArchiveRebuild, openRegimeArchivePullRequest } from "../lib/summary/regimeArchivePullRequest";
import { parseSummaryArchive } from "../lib/summary/summaryArchive";
import { bundledCache, bundledGeneratedAt, buildBundledSeries, type BundledSeriesId } from "./fixtures/bundledArchiveSeries";

/*
 * The Worker's archive rebuild end to end, offline: FRED is the bundled series served as its
 * CSV export, and GitHub is an in-memory repository whose main is this checkout's data files.
 */

const MAIN_SHA = "sha-main-000";
const ARCHIVE_PATHS = [...Object.values(REGIME_ARCHIVE_PATHS), weeklySummariesPath(2026)];
const readCheckout = () => new Map(ARCHIVE_PATHS.map((path) => [path, readFileSync(path, "utf8")]));

const DAY_MS = 24 * 60 * 60 * 1000;
const TUESDAY_UTC = 2;

/**
 * The day nearest the archive's last generation that satisfies `isWanted`, in the same month,
 * since the bundled series end there and a later month would turn the last one into a new month-end.
 */
const nearestDayInMonth = (isWanted: (weekday: number) => boolean) => {
  const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];
  const day = offsets
    .map((offset) => new Date(bundledGeneratedAt.getTime() + offset * DAY_MS))
    .find((candidate) => candidate.getUTCMonth() === bundledGeneratedAt.getUTCMonth() && isWanted(candidate.getUTCDay()));
  assert.ok(day, "every month has every weekday within six days of any date in it");
  return day;
};
const OFF_DAY = nearestDayInMonth((weekday) => weekday !== TUESDAY_UTC);
const TUESDAY = nearestDayInMonth((weekday) => weekday === TUESDAY_UTC);

const bundled = buildBundledSeries();
const isBundledSeriesId = (id: string | null): id is BundledSeriesId => id !== null && id in bundled.csv;

const fred: typeof fetch = async (input) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const id = url.searchParams.get("id");
  assert.equal(url.origin + url.pathname, "https://fred.stlouisfed.org/graph/fredgraph.csv");
  return isBundledSeriesId(id) ? new Response(bundled.csv[id]) : new Response("unknown series", { status: 404 });
};

const BodySchema = z.record(z.string(), z.unknown());

/**
 * Enough of GitHub's REST API, in memory, to read files at a commit, commit several files
 * through the Git Data API, move a branch, and open a pull request. Every call is recorded.
 */
class FakeGitHub {
  calls: Array<{ method: string; path: string; accept: string | null; body?: Record<string, unknown> }> = [];
  branches = new Map<string, string>([["main", MAIN_SHA]]);
  /** Each commit's whole tree: the files it carries, by path. */
  commits = new Map<string, { parents: string[]; message: string; files: Map<string, string> }>();
  blobs = new Map<string, string>();
  trees = new Map<string, { base: string; entries: Array<{ path: string; sha: string }> }>();
  openPulls: Array<{ number: number; head: string; html_url: string; title: string; body: string }> = [];

  constructor(mainFiles: Map<string, string>) {
    this.commits.set(MAIN_SHA, { parents: [], message: "main", files: mainFiles });
  }

  readonly fetcher: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? "GET";
    const path = url.pathname.replace("/repos/zz-plant/whether", "");
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === "string" ? BodySchema.parse(JSON.parse(init.body)) : undefined;
    this.calls.push({ method, path, accept: headers.get("accept"), body });
    const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status });
    const notFound = () => json({ message: "Not Found" }, 404);

    if (method === "GET" && path.startsWith("/git/ref/heads/")) {
      const sha = this.branches.get(decodeURIComponent(path.slice("/git/ref/heads/".length)));
      return sha ? json({ object: { sha } }) : notFound();
    }
    if (method === "POST" && path === "/git/refs") {
      this.branches.set(String(body?.ref).replace("refs/heads/", ""), String(body?.sha));
      return json({ ref: body?.ref }, 201);
    }
    if (method === "PATCH" && path.startsWith("/git/refs/heads/")) {
      const branch = decodeURIComponent(path.slice("/git/refs/heads/".length));
      if (!this.branches.has(branch)) return notFound();
      assert.equal(body?.force, true, "a re-run replaces the branch's last attempt");
      this.branches.set(branch, String(body?.sha));
      return json({ object: { sha: body?.sha } });
    }
    if (method === "GET" && path.startsWith("/git/commits/")) {
      const sha = decodeURIComponent(path.slice("/git/commits/".length));
      return this.commits.has(sha) ? json({ sha, tree: { sha: `tree-${sha}` } }) : notFound();
    }
    if (method === "POST" && path === "/git/blobs") {
      assert.equal(body?.encoding, "utf-8");
      const sha = `blob-${this.blobs.size + 1}`;
      this.blobs.set(sha, String(body?.content));
      return json({ sha }, 201);
    }
    if (method === "POST" && path === "/git/trees") {
      const entries = z.array(z.object({ path: z.string(), sha: z.string(), mode: z.literal("100644"), type: z.literal("blob") })).parse(body?.tree);
      const sha = `tree-new-${this.trees.size + 1}`;
      this.trees.set(sha, { base: String(body?.base_tree), entries });
      return json({ sha }, 201);
    }
    if (method === "POST" && path === "/git/commits") {
      const parents = z.array(z.string()).parse(body?.parents);
      const tree = this.trees.get(String(body?.tree));
      const parent = this.commits.get(parents[0] ?? "");
      if (!tree || !parent || tree.base !== `tree-${parents[0]}`) return json({ message: "bad tree" }, 422);
      const files = new Map(parent.files);
      for (const entry of tree.entries) files.set(entry.path, this.blobs.get(entry.sha) ?? "");
      const sha = `sha-commit-${this.commits.size}`;
      this.commits.set(sha, { parents, message: String(body?.message), files });
      return json({ sha }, 201);
    }
    if (method === "GET" && path.startsWith("/contents/")) {
      const files = this.commits.get(url.searchParams.get("ref") ?? "")?.files;
      const text = files?.get(decodeURIComponent(path.slice("/contents/".length)));
      return text === undefined ? notFound() : new Response(text);
    }
    if (method === "GET" && path === "/pulls") {
      return json(this.openPulls.filter((pull) => `zz-plant:${pull.head}` === url.searchParams.get("head")));
    }
    if (method === "POST" && path === "/pulls") {
      const number = this.openPulls.length + 1;
      this.openPulls.push({
        number,
        head: String(body?.head),
        html_url: `https://github.com/zz-plant/whether/pull/${number}`,
        title: String(body?.title),
        body: String(body?.body),
      });
      return json({ number, html_url: `https://github.com/zz-plant/whether/pull/${number}` }, 201);
    }
    return json({ message: `unhandled ${method} ${path}` }, 500);
  };

  client() {
    return new GitHubRepoClient({ token: "test-token", repository: "zz-plant/whether", fetcher: this.fetcher });
  }

  filesOn(branch: string) {
    const files = this.commits.get(this.branches.get(branch) ?? "")?.files;
    assert.ok(files, `no commit on ${branch}`);
    return files;
  }
}

const rebuild = (github: FakeGitHub, now: Date, landAnyChange = false) =>
  commitRegimeArchiveRebuild({ client: github.client(), now, fetcher: fred, landAnyChange });

const ArchiveRowSchema = z.object({
  cadence: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  year: z.number(),
  month: z.number().optional(),
  asOf: z.string(),
  record_date: z.string(),
  summary: z.object({ regime: z.string() }),
  tightness: z.number().optional(),
  riskAppetite: z.number().optional(),
});
const readJson = (files: Map<string, string>, path: string): unknown => JSON.parse(files.get(path) ?? "null");

describe("commitRegimeArchiveRebuild", () => {
  const github = new FakeGitHub(readCheckout());
  const first = rebuild(github, OFF_DAY, true);

  it("rebuilds against main and commits every changed file in one commit on the rebuild branch", async () => {
    const result = await first;
    assert.equal(result.committed, true);
    if (!result.committed) return;

    assert.equal(result.baseSha, MAIN_SHA);
    assert.ok(result.paths.length > 0);
    assert.deepEqual(result.paths.filter((path) => !ARCHIVE_PATHS.includes(path)), []);
    assert.equal(github.branches.get(result.branch), result.commitSha);

    const commit = github.commits.get(result.commitSha);
    assert.deepEqual(commit?.parents, [MAIN_SHA]);
    const writes = github.calls.filter((call) => call.method !== "GET").map((call) => `${call.method} ${call.path}`);
    assert.deepEqual(writes, [
      ...result.paths.map(() => "POST /git/blobs"),
      "POST /git/trees",
      "POST /git/commits",
      "POST /git/refs",
    ]);
    // Read through the raw media type: the contents API returns no content for a file over 1MB.
    const reads = github.calls.filter((call) => call.path.startsWith("/contents/"));
    assert.ok(reads.length >= ARCHIVE_PATHS.length);
    assert.deepEqual([...new Set(reads.map((call) => call.accept))], ["application/vnd.github.raw+json"]);
    // A Workflow step's result must stay under 1MiB; the files themselves are 11MB.
    assert.ok(JSON.stringify(result).length < 4096);
  });

  it("commits files that agree with each other the way the suite checks the bundle", async () => {
    const result = await first;
    assert.equal(result.committed, true);
    const files = github.filesOn("automation/regime-archive-rebuild");
    const rawArchive = readJson(files, REGIME_ARCHIVE_PATHS.summaryArchive);
    const archive = z.array(ArchiveRowSchema).parse(rawArchive);
    const byAsOf = (left: { asOf: string }, right: { asOf: string }) => left.asOf.localeCompare(right.asOf);
    const monthly = archive.filter((entry) => entry.cadence === "monthly").sort(byAsOf);
    const weekly = archive.filter((entry) => entry.cadence === "weekly").sort(byAsOf);

    assert.deepEqual(
      readJson(files, REGIME_ARCHIVE_PATHS.monthlyRegimeHistory),
      monthly.map(({ record_date, summary, tightness, riskAppetite }) => ({ record_date, regime: summary.regime, tightness, riskAppetite })),
    );
    assert.deepEqual(
      readJson(files, REGIME_ARCHIVE_PATHS.weeklyPostureHistory),
      weekly.slice(-4).map(({ record_date, summary }) => ({ record_date, regime: summary.regime })),
    );
    assert.deepEqual(readJson(files, REGIME_ARCHIVE_PATHS.calibrationMonths), extractCalibrationMonths(rawArchive));
    const cache = z.array(z.object({ year: z.number(), month: z.number(), record_date: z.string() })).parse(
      readJson(files, REGIME_ARCHIVE_PATHS.timeMachineCache),
    );
    assert.equal(cache.at(-1)?.record_date, monthly.at(-1)?.record_date);
    assert.deepEqual(
      readJson(files, REGIME_ARCHIVE_PATHS.postureArchiveIndex),
      JSON.parse(JSON.stringify(buildPostureArchivePeriods(parseSummaryArchive(rawArchive)))),
    );
  });

  it("finds nothing to change when it rebuilds over its own commit", async () => {
    const result = await first;
    assert.equal(result.committed, true);
    if (!result.committed) return;
    const again = new FakeGitHub(github.filesOn(result.branch));
    const second = await rebuild(again, OFF_DAY, true);
    assert.deepEqual(second, { committed: false, reason: "main already carries the archive FRED rebuilds to" });
  });

  it("on a day other than Tuesday, lands only a month-end the base lacks", async () => {
    const quiet = await rebuild(new FakeGitHub(readCheckout()), OFF_DAY);
    assert.equal(quiet.committed, false);
    assert.match(quiet.committed ? "" : quiet.reason, /no month-end is new; Tuesday's rebuild lands them/);

    const behind = readCheckout();
    const rail = z.array(z.unknown()).parse(JSON.parse(behind.get(REGIME_ARCHIVE_PATHS.monthlyRegimeHistory) ?? "[]"));
    behind.set(REGIME_ARCHIVE_PATHS.monthlyRegimeHistory, `${JSON.stringify(rail.slice(0, -1), null, 2)}\n`);
    const monthEnd = await rebuild(new FakeGitHub(behind), OFF_DAY);
    assert.equal(monthEnd.committed, true);
    const newest = bundledCache.at(-1);
    assert.ok(newest);
    assert.deepEqual(monthEnd.committed ? monthEnd.newMonthEnds : [], [`${newest.year}-${String(newest.month).padStart(2, "0")}`]);
  });

  it("on Tuesday, lands whatever changed", async () => {
    const result = await rebuild(new FakeGitHub(readCheckout()), TUESDAY);
    assert.equal(result.committed, true);
    assert.deepEqual(result.committed ? result.newMonthEnds : null, []);
  });

  it("refuses a missing base branch and a FRED failure before writing anything", async () => {
    const noMain = new FakeGitHub(readCheckout());
    noMain.branches.delete("main");
    await assert.rejects(rebuild(noMain, OFF_DAY, true), /base branch main not found/);

    const github = new FakeGitHub(readCheckout());
    const down: typeof fetch = async () => new Response("unavailable", { status: 503 });
    await assert.rejects(
      commitRegimeArchiveRebuild({ client: github.client(), now: OFF_DAY, fetcher: down, landAnyChange: true }),
      /FRED series fetch failed for DGS1MO: 503/,
    );
    assert.deepEqual(github.calls.filter((call) => call.method !== "GET"), []);
  });
});

describe("openRegimeArchivePullRequest", () => {
  it("opens one pull request for the branch, naming the files, and reuses it on the next run", async () => {
    const github = new FakeGitHub(readCheckout());
    const commit = await rebuild(github, OFF_DAY, true);
    assert.equal(commit.committed, true);
    if (!commit.committed) return;

    const opened = await openRegimeArchivePullRequest({ client: github.client(), commit, now: OFF_DAY });
    assert.equal(opened.alreadyOpen, false);
    const pull = github.openPulls[0];
    assert.equal(pull?.head, "automation/regime-archive-rebuild");
    assert.match(pull?.title ?? "", /^chore: rebuild the regime archive from FRED \(weeks through \d{4}-\d{2}-\d{2}\)$/);
    for (const path of commit.paths) assert.ok(pull?.body.includes(`\`${path}\``), path);

    const again = await openRegimeArchivePullRequest({ client: github.client(), commit, now: OFF_DAY });
    assert.deepEqual(again, { pullRequest: { number: 1, html_url: pull?.html_url }, alreadyOpen: true });
    assert.equal(github.openPulls.length, 1);
  });
});

describe("GitHubRepoClient.commitFiles", () => {
  it("moves an existing branch, forced, instead of stacking on its last attempt", async () => {
    const github = new FakeGitHub(readCheckout());
    github.branches.set("automation/regime-archive-rebuild", "sha-stale");
    const sha = await github.client().commitFiles({
      branch: "automation/regime-archive-rebuild",
      parentSha: MAIN_SHA,
      message: "two files",
      files: [
        { path: "data/a.json", content: "[]\n" },
        { path: "data/b.json", content: "{}\n" },
      ],
    });
    assert.equal(github.branches.get("automation/regime-archive-rebuild"), sha);
    assert.equal(github.filesOn("automation/regime-archive-rebuild").get("data/b.json"), "{}\n");
    assert.ok(github.calls.some((call) => call.method === "PATCH"));
  });

  it("reads a missing file as null and surfaces GitHub failures without the token", async () => {
    const github = new FakeGitHub(readCheckout());
    assert.equal(await github.client().getFileText("data/nope.json", MAIN_SHA), null);
    const failing = new GitHubRepoClient({
      token: "secret-token",
      repository: "zz-plant/whether",
      fetcher: async () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 }),
    });
    const error = await failing.getFileText(REGIME_ARCHIVE_PATHS.summaryArchive, "main").catch((caught: unknown) => caught);
    assert.ok(error instanceof GitHubApiError);
    assert.equal(error.status, 401);
    assert.ok(!error.message.includes("secret-token"));
  });
});
