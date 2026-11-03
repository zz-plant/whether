/**
 * The little of GitHub's REST API a Workflow needs to land data behind a pull request: read a
 * branch head, create a branch, read and write one file, commit several files at once (the
 * archive rebuild writes up to ten, the largest 5MB), open a PR, and — where the lane merges
 * its own data pull requests — read the PR, its files and its checks, and merge it. Fetch is
 * injected so the whole client runs against an in-memory fake under bun tests.
 *
 * The token travels only in the Authorization header, never in a URL, so no error message
 * built from a URL or a status can carry it.
 */

import { z } from "zod";

type GitHubRepoClientOptions = {
  /** Fine-grained token with contents:write, pull-requests:write and checks:read on the one repository. */
  token: string;
  /** "owner/repo". */
  repository: string;
  fetcher?: typeof fetch;
  apiBaseUrl?: string;
  userAgent?: string;
};

type GitHubFile = { sha: string; content: string };
export type GitHubPullRequest = { number: number; html_url: string };

const pullRequestDetailSchema = z.object({
  number: z.number(),
  html_url: z.string(),
  state: z.string(),
  merged: z.boolean(),
  head: z.object({ sha: z.string() }),
});
export type GitHubPullRequestDetail = { number: number; html_url: string; open: boolean; merged: boolean; headSha: string };

const pullRequestFilesSchema = z.array(z.object({ filename: z.string() }));

const gitObjectSchema = z.object({ sha: z.string() });
const gitCommitSchema = z.object({ sha: z.string(), tree: gitObjectSchema });

/** One file of a multi-file commit: its full new text. */
type GitHubFileWrite = { path: string; content: string };

const checkRunsSchema = z.object({
  check_runs: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      conclusion: z.string().nullable(),
      app: z.object({ slug: z.string() }).nullable(),
    }),
  ),
});
export type GitHubCheckRun = { name: string; status: string; conclusion: string | null; appSlug: string | null };

export class GitHubApiError extends Error {
  readonly status: number;

  constructor(operation: string, status: number, detail?: string) {
    super(`GitHub ${operation} failed (HTTP ${status})${detail ? `: ${detail}` : ""}`);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export const toBase64Utf8 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export const fromBase64Utf8 = (encoded: string): string => {
  const binary = atob(encoded.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export class GitHubRepoClient {
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly options: GitHubRepoClientOptions) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(options.repository)) {
      throw new Error(`GitHub repository must be "owner/repo", got "${options.repository}"`);
    }
    this.fetcher = options.fetcher ?? fetch;
    this.baseUrl = `${options.apiBaseUrl ?? "https://api.github.com"}/repos/${options.repository}`;
    this.headers = {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${options.token}`,
      "user-agent": options.userAgent ?? "WhetherDataBot/1.0 (+https://whether.work)",
      "x-github-api-version": "2022-11-28",
    };
  }

  get repository() {
    return this.options.repository;
  }

  private async request(
    operation: string,
    path: string,
    { accept, ...init }: RequestInit & { accept?: string } = {},
    allow: number[] = [],
  ): Promise<Response> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...this.headers,
        ...(accept ? { accept } : {}),
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
    });
    if (!response.ok && !allow.includes(response.status)) {
      let detail: string | undefined;
      try {
        const body: unknown = await response.json();
        if (isRecord(body) && typeof body.message === "string") detail = body.message;
      } catch {
        /* the status is the message */
      }
      throw new GitHubApiError(operation, response.status, detail);
    }
    return response;
  }

  async getBranchHeadSha(branch: string): Promise<string | null> {
    const response = await this.request("read branch", `/git/ref/heads/${encodeURIComponent(branch)}`, {}, [404]);
    if (response.status === 404) return null;
    const body: unknown = await response.json();
    const sha = isRecord(body) && isRecord(body.object) ? body.object.sha : undefined;
    if (typeof sha !== "string") throw new GitHubApiError("read branch", response.status, "no object.sha in response");
    return sha;
  }

  async createBranch(branch: string, fromSha: string): Promise<void> {
    await this.request("create branch", "/git/refs", {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
    });
  }

  async getFile(path: string, ref: string): Promise<GitHubFile | null> {
    const response = await this.request(
      "read file",
      `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`,
      {},
      [404],
    );
    if (response.status === 404) return null;
    const body: unknown = await response.json();
    if (!isRecord(body) || typeof body.sha !== "string" || typeof body.content !== "string") {
      throw new GitHubApiError("read file", response.status, "unexpected contents payload");
    }
    return { sha: body.sha, content: fromBase64Utf8(body.content) };
  }

  /**
   * A file's text at `ref`, or null when it does not exist there. The raw media type, because
   * the contents API leaves `content` empty for a file over 1MB and the summary archive is 5MB;
   * raw serves up to 100MB.
   */
  async getFileText(path: string, ref: string): Promise<string | null> {
    const response = await this.request(
      "read file",
      `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`,
      { accept: "application/vnd.github.raw+json" },
      [404],
    );
    return response.status === 404 ? null : response.text();
  }

  private async postGitObject(operation: string, path: string, body: unknown): Promise<string> {
    const response = await this.request(operation, path, { method: "POST", body: JSON.stringify(body) });
    const parsed = gitObjectSchema.safeParse(await response.json());
    if (!parsed.success) throw new GitHubApiError(operation, response.status, "no sha in response");
    return parsed.data.sha;
  }

  /**
   * Every file in one commit on top of `parentSha`, and `branch` pointed at it: created when
   * missing, moved (forced) when it exists, so a re-run replaces the branch's last attempt
   * rather than stacking on it. Blobs, a tree over the parent's, a commit, the ref — the Git
   * Data API, since the contents API writes one file per commit. Returns the commit's sha.
   */
  async commitFiles(input: { branch: string; parentSha: string; message: string; files: GitHubFileWrite[] }): Promise<string> {
    const parentResponse = await this.request("read commit", `/git/commits/${encodeURIComponent(input.parentSha)}`);
    const parent = gitCommitSchema.safeParse(await parentResponse.json());
    if (!parent.success) throw new GitHubApiError("read commit", parentResponse.status, "unexpected commit payload");

    const tree: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];
    for (const file of input.files) {
      const sha = await this.postGitObject("create blob", "/git/blobs", { content: file.content, encoding: "utf-8" });
      tree.push({ path: file.path, mode: "100644", type: "blob", sha });
    }
    const treeSha = await this.postGitObject("create tree", "/git/trees", { base_tree: parent.data.tree.sha, tree });
    const commitSha = await this.postGitObject("create commit", "/git/commits", {
      message: input.message,
      tree: treeSha,
      parents: [input.parentSha],
    });

    if ((await this.getBranchHeadSha(input.branch)) === null) {
      await this.createBranch(input.branch, commitSha);
    } else {
      await this.request("move branch", `/git/refs/heads/${encodeURIComponent(input.branch)}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commitSha, force: true }),
      });
    }
    return commitSha;
  }

  async putFile(input: { path: string; branch: string; message: string; content: string; sha?: string }): Promise<void> {
    await this.request("write file", `/contents/${input.path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "PUT",
      body: JSON.stringify({
        message: input.message,
        content: toBase64Utf8(input.content),
        branch: input.branch,
        ...(input.sha ? { sha: input.sha } : {}),
      }),
    });
  }

  async findOpenPullRequest(headBranch: string): Promise<GitHubPullRequest | null> {
    const owner = this.options.repository.split("/")[0];
    const response = await this.request(
      "list pull requests",
      `/pulls?state=open&head=${encodeURIComponent(`${owner}:${headBranch}`)}&per_page=1`,
    );
    const body: unknown = await response.json();
    if (!Array.isArray(body) || body.length === 0) return null;
    const first: unknown = body[0];
    if (!isRecord(first) || typeof first.number !== "number" || typeof first.html_url !== "string") return null;
    return { number: first.number, html_url: first.html_url };
  }

  async getPullRequest(number: number): Promise<GitHubPullRequestDetail> {
    const response = await this.request("read pull request", `/pulls/${number}`);
    const parsed = pullRequestDetailSchema.safeParse(await response.json());
    if (!parsed.success) throw new GitHubApiError("read pull request", response.status, "unexpected pull request payload");
    const { html_url, state, merged, head } = parsed.data;
    return { number, html_url, open: state === "open", merged, headSha: head.sha };
  }

  /** Paths the pull request changes. One page of 100: the largest data pull request, the archive rebuild, changes ten. */
  async listPullRequestFiles(number: number): Promise<string[]> {
    const response = await this.request("list pull request files", `/pulls/${number}/files?per_page=100`);
    const parsed = pullRequestFilesSchema.safeParse(await response.json());
    if (!parsed.success) throw new GitHubApiError("list pull request files", response.status, "unexpected files payload");
    return parsed.data.map((file) => file.filename);
  }

  async listCheckRuns(ref: string): Promise<GitHubCheckRun[]> {
    const response = await this.request("list check runs", `/commits/${encodeURIComponent(ref)}/check-runs?per_page=100`);
    const parsed = checkRunsSchema.safeParse(await response.json());
    if (!parsed.success) throw new GitHubApiError("list check runs", response.status, "unexpected check runs payload");
    return parsed.data.check_runs.map((run) => ({
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      appSlug: run.app?.slug ?? null,
    }));
  }

  /** Squash-merges at exactly `sha`: GitHub refuses (409) if the head moved after it was judged. */
  async mergePullRequest(number: number, input: { sha: string; title: string }): Promise<void> {
    await this.request("merge pull request", `/pulls/${number}/merge`, {
      method: "PUT",
      body: JSON.stringify({ sha: input.sha, merge_method: "squash", commit_title: input.title }),
    });
  }

  async openPullRequest(input: { title: string; head: string; base: string; body: string }): Promise<GitHubPullRequest> {
    const response = await this.request("open pull request", "/pulls", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const body: unknown = await response.json();
    if (!isRecord(body) || typeof body.number !== "number" || typeof body.html_url !== "string") {
      throw new GitHubApiError("open pull request", response.status, "unexpected pull request payload");
    }
    return { number: body.number, html_url: body.html_url };
  }
}
