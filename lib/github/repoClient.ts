/**
 * The little of GitHub's REST API a Workflow needs to land one data file behind a pull
 * request: read a branch head, create a branch, read and write one file, open a PR. Fetch
 * is injected so the whole client runs against an in-memory fake under bun tests.
 *
 * The token travels only in the Authorization header, never in a URL, so no error message
 * built from a URL or a status can carry it.
 */

type GitHubRepoClientOptions = {
  /** Fine-grained token with contents:write and pull-requests:write on the one repository. */
  token: string;
  /** "owner/repo". */
  repository: string;
  fetcher?: typeof fetch;
  apiBaseUrl?: string;
  userAgent?: string;
};

type GitHubFile = { sha: string; content: string };
export type GitHubPullRequest = { number: number; html_url: string };

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

  private async request(operation: string, path: string, init: RequestInit = {}, allow: number[] = []): Promise<Response> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers, ...(init.body ? { "content-type": "application/json" } : {}) },
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
