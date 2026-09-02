import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GitHubApiError, GitHubRepoClient, fromBase64Utf8, toBase64Utf8 } from "../lib/github/repoClient";
import { getBundledMonthlyRegimeHistory, monthKeyFor, type MonthlyRegimeHistoryEntry } from "../lib/summary/monthlyRegimeHistory";
import {
  REGIME_HISTORY_FILE_PATH,
  buildRegimeHistoryFileUpdate,
  buildRegimeHistoryUpdateAgainstBase,
  openRegimeHistoryPullRequest,
  readRegimeHistoryFromBranch,
  readStoredMonthlyRegimeHistory,
  regimeHistoryBranchName,
} from "../lib/summary/regimeHistoryPullRequest";

const bundled = getBundledMonthlyRegimeHistory();
const lastBundled = bundled[bundled.length - 1];

/** A month the bundle cannot have yet: the month after its last entry. */
const nextMonthEntry = (): MonthlyRegimeHistoryEntry => {
  const last = new Date(`${lastBundled.record_date}T00:00:00.000Z`);
  const next = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 15));
  return { record_date: next.toISOString().slice(0, 10), regime: "VOLATILE", tightness: 61, riskAppetite: 42 };
};

/**
 * Enough of GitHub's REST API, in memory, to land a file behind a pull request. Records every
 * call so a test can assert the sequence and the bodies.
 */
class FakeGitHub {
  calls: Array<{ method: string; path: string; body?: Record<string, unknown> }> = [];
  branches = new Map<string, string>([["main", "sha-main-000"]]);
  files = new Map<string, { sha: string; content: string }>();
  openPulls: Array<{ number: number; head: string; html_url: string }> = [];

  constructor(mainFileContent: string) {
    this.files.set(`main:${REGIME_HISTORY_FILE_PATH}`, { sha: "sha-file-main", content: mainFileContent });
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
      const file = this.files.get(`main:${REGIME_HISTORY_FILE_PATH}`);
      if (file) this.files.set(`${branch}:${REGIME_HISTORY_FILE_PATH}`, file);
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

describe("buildRegimeHistoryFileUpdate", () => {
  it("reports no change when KV carries nothing the bundle lacks", () => {
    const update = buildRegimeHistoryFileUpdate([lastBundled], bundled);
    assert.equal(update.changed, false);
    assert.deepEqual(update.changedMonths, []);
  });

  it("adds the month in progress in the generator scripts' file format", () => {
    const entry = nextMonthEntry();
    const update = buildRegimeHistoryFileUpdate([entry], bundled);

    assert.equal(update.changed, true);
    assert.deepEqual(update.changedMonths, [monthKeyFor(entry.record_date)]);
    assert.ok(update.content.endsWith("\n"), "trailing newline, like scripts/summaryFile.ts writes");
    const parsed: MonthlyRegimeHistoryEntry[] = JSON.parse(update.content);
    assert.equal(parsed.length, bundled.length + 1);
    assert.deepEqual(parsed[parsed.length - 1], entry);
    assert.equal(update.content, `${JSON.stringify(parsed, null, 2)}\n`, "two-space indentation");
  });

  it("rewrites a month the bundle already has when KV's entry differs, and only that month", () => {
    const rewritten = { ...lastBundled, tightness: (lastBundled.tightness ?? 0) + 1 };
    const update = buildRegimeHistoryFileUpdate([rewritten], bundled);
    assert.deepEqual(update.changedMonths, [monthKeyFor(lastBundled.record_date)]);
    const parsed: MonthlyRegimeHistoryEntry[] = JSON.parse(update.content);
    assert.equal(parsed.length, bundled.length, "no entry was added");
  });

  it("reads and validates the KV copy, tolerating an empty or corrupt value", async () => {
    assert.deepEqual(await readStoredMonthlyRegimeHistory({ get: async () => null }), []);
    assert.deepEqual(await readStoredMonthlyRegimeHistory({ get: async () => "not json" }), []);
    const entry = nextMonthEntry();
    assert.deepEqual(await readStoredMonthlyRegimeHistory({ get: async () => JSON.stringify([entry]) }), [entry]);
  });
});

describe("merging against the base branch", () => {
  /** A month main has that this deployment's bundle does not: the deployment is older than main. */
  const monthOnMainOnly = (): MonthlyRegimeHistoryEntry => nextMonthEntry();
  const monthAfter = (entry: MonthlyRegimeHistoryEntry): MonthlyRegimeHistoryEntry => {
    const date = new Date(`${entry.record_date}T00:00:00.000Z`);
    const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 15));
    return { record_date: next.toISOString().slice(0, 10), regime: "DEFENSIVE", tightness: 55, riskAppetite: 48 };
  };

  it("reads and validates the file on the branch", async () => {
    const github = new FakeGitHub(`${JSON.stringify(bundled, null, 2)}\n`);
    const entries = await readRegimeHistoryFromBranch(github.client(), "main");
    assert.equal(entries.length, bundled.length);
  });

  it("keeps months that reached main after this deployment was built", async () => {
    const onMain = monthOnMainOnly();
    const fromKv = monthAfter(onMain);
    const github = new FakeGitHub(`${JSON.stringify([...bundled, onMain], null, 2)}\n`);

    const update = await buildRegimeHistoryUpdateAgainstBase({ client: github.client(), base: "main", stored: [fromKv] });

    const parsed: MonthlyRegimeHistoryEntry[] = JSON.parse(update.content);
    assert.deepEqual(update.changedMonths, [monthKeyFor(fromKv.record_date)], "only KV's month is new");
    assert.ok(parsed.some((entry) => entry.record_date === onMain.record_date), "main's month survives the merge");
    assert.equal(parsed.length, bundled.length + 2);
  });

  it("reports no change when main already carries KV's month, even if this deployment's bundle does not", async () => {
    const onMain = monthOnMainOnly();
    const github = new FakeGitHub(`${JSON.stringify([...bundled, onMain], null, 2)}\n`);

    const update = await buildRegimeHistoryUpdateAgainstBase({ client: github.client(), base: "main", stored: [onMain] });

    assert.equal(update.changed, false);
    assert.equal(github.calls.length, 1, "one read of the base file, nothing written");
  });

  it("refuses to proceed when the base file is missing or does not validate", async () => {
    const missing = new FakeGitHub("[]");
    missing.files.delete(`main:${REGIME_HISTORY_FILE_PATH}`);
    await assert.rejects(readRegimeHistoryFromBranch(missing.client(), "main"), /is missing on main/);

    const invalid = new FakeGitHub("not json");
    await assert.rejects(readRegimeHistoryFromBranch(invalid.client(), "main"), /is not JSON/);
  });
});

describe("openRegimeHistoryPullRequest", () => {
  const now = new Date("2026-09-07T13:00:00.000Z");

  it("branches from main, commits the file, and opens the pull request", async () => {
    const github = new FakeGitHub(`${JSON.stringify(bundled, null, 2)}\n`);
    const entry = nextMonthEntry();
    const update = buildRegimeHistoryFileUpdate([entry], bundled);

    const result = await openRegimeHistoryPullRequest({ client: github.client(), update, now });

    assert.equal(result.opened, true);
    if (!result.opened) return;
    assert.equal(result.alreadyOpen, false);
    assert.equal(result.branch, regimeHistoryBranchName(now));
    assert.equal(result.branch, "automation/regime-history-2026-09-07");

    const methods = github.calls.map((call) => `${call.method} ${call.path.split("?")[0]}`);
    assert.deepEqual(methods, [
      "GET /pulls",
      "GET /git/ref/heads/main",
      `GET /git/ref/heads/${encodeURIComponent(result.branch)}`,
      "POST /git/refs",
      `GET /contents/${REGIME_HISTORY_FILE_PATH}`,
      `PUT /contents/${REGIME_HISTORY_FILE_PATH}`,
      "POST /pulls",
    ]);

    const committed = github.files.get(`${result.branch}:${REGIME_HISTORY_FILE_PATH}`);
    assert.equal(committed?.content, update.content, "the branch carries exactly the merged file");

    const pullBody = github.calls.find((call) => call.method === "POST" && call.path === "/pulls")?.body;
    assert.ok(pullBody, "a pull request body was posted");
    assert.equal(pullBody.base, "main");
    assert.match(String(pullBody.title), new RegExp(monthKeyFor(entry.record_date)));
    assert.match(String(pullBody.body), /no backfill/);
  });

  it("is idempotent for the day: a second run reports the open pull request instead of opening another", async () => {
    const github = new FakeGitHub(`${JSON.stringify(bundled, null, 2)}\n`);
    const update = buildRegimeHistoryFileUpdate([nextMonthEntry()], bundled);

    const first = await openRegimeHistoryPullRequest({ client: github.client(), update, now });
    const second = await openRegimeHistoryPullRequest({ client: github.client(), update, now });

    assert.ok(first.opened && second.opened);
    if (!first.opened || !second.opened) return;
    assert.equal(second.alreadyOpen, true);
    assert.equal(second.pullRequest.number, first.pullRequest.number);
    assert.equal(github.openPulls.length, 1);
  });

  it("does nothing when the update carries no change", async () => {
    const github = new FakeGitHub(`${JSON.stringify(bundled, null, 2)}\n`);
    const result = await openRegimeHistoryPullRequest({ client: github.client(), update: buildRegimeHistoryFileUpdate([], bundled), now });
    assert.equal(result.opened, false);
    assert.equal(github.calls.length, 0);
  });

  it("surfaces GitHub failures with the status and never with the token", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 });
    const client = new GitHubRepoClient({ token: "ghp_super_secret", repository: "zz-plant/whether", fetcher });

    await assert.rejects(
      openRegimeHistoryPullRequest({ client, update: buildRegimeHistoryFileUpdate([nextMonthEntry()], bundled), now }),
      (error: unknown) =>
        error instanceof GitHubApiError && error.status === 401 && !error.message.includes("ghp_super_secret"),
    );
  });

  it("refuses a repository that is not owner/repo", () => {
    assert.throws(() => new GitHubRepoClient({ token: "t", repository: "https://github.com/zz-plant/whether" }));
  });
});
