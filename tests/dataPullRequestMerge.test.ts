import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GitHubRepoClient, type GitHubCheckRun } from "../lib/github/repoClient";
import { judgeBranchBuild, mergeDataPullRequest } from "../lib/github/dataPullRequestMerge";
import { landDataPullRequest } from "../worker/workflows/landDataPullRequest";

/*
 * A data pull request merges itself only when it changes exactly its data file and Cloudflare's
 * build of that exact commit — the deploy gate plus a dry-run deploy — is green. Each case below
 * is one way a merge nobody reviewed could land something it should not.
 */

const DATA_FILE = "data/published_briefs.json";
const HEAD = "sha-head-123";

const build = (status: string, conclusion: string | null, appSlug = "cloudflare-workers-and-pages"): GitHubCheckRun => ({
  name: "Workers Builds: whether",
  status,
  conclusion,
  appSlug,
});

type FakeState = {
  state?: "open" | "closed";
  merged?: boolean;
  files?: string[];
  runs?: Array<{ name: string; status: string; conclusion: string | null; app: { slug: string } | null }>;
  mergeStatus?: number;
};

const fakeGitHub = (initial: FakeState = {}) => {
  const state = {
    state: initial.state ?? "open",
    merged: initial.merged ?? false,
    files: initial.files ?? [DATA_FILE],
    runs: initial.runs ?? [{ name: "Workers Builds: whether", status: "completed", conclusion: "success", app: { slug: "cloudflare-workers-and-pages" } }],
    mergeStatus: initial.mergeStatus ?? 200,
  };
  const merges: Array<Record<string, unknown>> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const path = url.pathname.replace("/repos/zz-plant/whether", "");
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (path === "/pulls/7" && (init?.method ?? "GET") === "GET") {
      return json({ number: 7, html_url: "https://github.com/zz-plant/whether/pull/7", state: state.state, merged: state.merged, head: { sha: HEAD } });
    }
    if (path === "/pulls/7/files") return json(state.files.map((filename) => ({ filename })));
    if (path === `/commits/${HEAD}/check-runs`) return json({ check_runs: state.runs });
    if (path === "/pulls/7/merge" && init?.method === "PUT") {
      merges.push(typeof init.body === "string" ? JSON.parse(init.body) : {});
      return json({ merged: state.mergeStatus === 200, message: "Head branch was modified" }, state.mergeStatus);
    }
    return json({ message: `unexpected ${init?.method ?? "GET"} ${path}` }, 500);
  };
  const client = new GitHubRepoClient({ token: "t", repository: "zz-plant/whether", fetcher });
  return { client, merges, state };
};

const merge = (client: GitHubRepoClient) => mergeDataPullRequest({ client, number: 7, paths: [DATA_FILE], title: "chore: freeze" });

describe("judgeBranchBuild", () => {
  it("waits until a Workers Builds run exists and has completed", () => {
    assert.deepEqual(judgeBranchBuild([]), { state: "pending" });
    assert.deepEqual(judgeBranchBuild([build("in_progress", null)]), { state: "pending" });
  });

  it("ignores checks from other apps", () => {
    assert.deepEqual(judgeBranchBuild([build("completed", "failure", "some-other-app")]), { state: "pending" });
    assert.deepEqual(judgeBranchBuild([build("completed", "success"), build("completed", "failure", "other")]), { state: "passed" });
  });

  it("fails on any conclusion but success", () => {
    assert.deepEqual(judgeBranchBuild([build("completed", "cancelled")]), { state: "failed", conclusion: "cancelled" });
  });
});

describe("mergeDataPullRequest", () => {
  it("squash-merges a data-only pull request with a green build, pinned to the judged head", async () => {
    const { client, merges } = fakeGitHub();
    assert.deepEqual(await merge(client), { merged: true, alreadyMerged: false });
    assert.deepEqual(merges, [{ sha: HEAD, merge_method: "squash", commit_title: "chore: freeze" }]);
  });

  it("leaves open a pull request someone added another file to", async () => {
    const { client, merges } = fakeGitHub({ files: [DATA_FILE, "lib/report/briefDocument.ts"] });
    const result = await merge(client);
    assert.equal(result.merged, false);
    assert.match(result.merged ? "" : result.reason, /briefDocument\.ts beyond its data file/);
    assert.equal(merges.length, 0);
  });

  it("leaves open a pull request whose branch build failed or has not finished", async () => {
    for (const run of [
      { name: "Workers Builds: whether", status: "completed", conclusion: "failure", app: { slug: "cloudflare-workers-and-pages" } },
      { name: "Workers Builds: whether", status: "queued", conclusion: null, app: { slug: "cloudflare-workers-and-pages" } },
    ]) {
      const { client, merges } = fakeGitHub({ runs: [run] });
      const result = await merge(client);
      assert.equal(result.merged, false);
      assert.match(result.merged ? "" : result.reason, /branch build .* (ended failure|has not finished)/);
      assert.equal(merges.length, 0);
    }
  });

  it("reports a pull request merged by a person as merged, and one closed without merging as not", async () => {
    assert.deepEqual(await merge(fakeGitHub({ state: "closed", merged: true }).client), { merged: true, alreadyMerged: true });
    const closed = await merge(fakeGitHub({ state: "closed" }).client);
    assert.equal(closed.merged, false);
  });

  it("throws when GitHub refuses the merge because the head moved", async () => {
    await assert.rejects(() => merge(fakeGitHub({ mergeStatus: 409 }).client), /HTTP 409/);
  });
});

describe("landDataPullRequest", () => {
  const recordingSteps = () => {
    const names: string[] = [];
    return {
      names,
      steps: {
        do: <T,>(name: string, optionsOrRun: (() => Promise<T>) | object, run?: () => Promise<T>): Promise<T> => {
          names.push(name);
          if (typeof optionsOrRun === "function") return optionsOrRun();
          if (!run) throw new Error("step.do was called with options but no body");
          return run();
        },
        sleep: async (name: string) => {
          names.push(name);
        },
      },
    };
  };

  it("waits for the build, then merges", async () => {
    const { client, merges } = fakeGitHub();
    const { names, steps } = recordingSteps();
    await landDataPullRequest({ step: steps, client, number: 7, paths: [DATA_FILE], title: "chore: freeze" });
    assert.deepEqual(names, ["give the branch build time to start", "wait for the branch build", "merge the pull request"]);
    assert.equal(merges.length, 1);
  });

  it("keeps waiting while the build is pending, which the platform retries", async () => {
    const { client } = fakeGitHub({ runs: [] });
    await assert.rejects(
      () => landDataPullRequest({ step: recordingSteps().steps, client, number: 7, paths: [DATA_FILE], title: "t" }),
      /has not finished/,
    );
  });

  it("fails the run with the reason when the pull request may not merge", async () => {
    const { client, merges } = fakeGitHub({
      runs: [{ name: "Workers Builds: whether", status: "completed", conclusion: "failure", app: { slug: "cloudflare-workers-and-pages" } }],
    });
    await assert.rejects(
      () => landDataPullRequest({ step: recordingSteps().steps, client, number: 7, paths: [DATA_FILE], title: "t" }),
      /ended failure; left open for review/,
    );
    assert.equal(merges.length, 0);
  });
});
