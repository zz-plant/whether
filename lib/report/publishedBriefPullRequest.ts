/**
 * The deterministic half of the brief-freeze Workflow (worker/workflows/weeklyBriefFreeze.ts).
 *
 * `data/published_briefs.json` is the product's proof of cadence: one record per week the
 * call was published, append-only, citable. The scheduled routine meant to append to it ran
 * in a sandbox whose egress proxy denies FRED, so every run failed before it had a week to
 * write and the archive stayed at one entry (CLAUDE.md, "Scheduled automation"). This module
 * lands the record from inside Cloudflare, where the data is reachable, behind a pull request
 * so a person still confirms the snapshot before it becomes permanent.
 *
 * Append-only is enforced here, not only by convention: a slug the base branch already
 * carries is left exactly as it is, and the update reports no change. Rewriting a published
 * week is a correction, which is a human edit with a stated reason, never automation.
 *
 * The merge base is the file on the pull request's base branch, read at run time — never the
 * archive bundled into the running deployment — for the reason the regime-history Workflow
 * gives: a preview deployment may be older than main.
 */
import { GitHubRepoClient, type GitHubPullRequest } from "../github/repoClient";
import { PublishedBriefIndexSchema, type PublishedBrief } from "./publishedBriefs";

export const PUBLISHED_BRIEFS_FILE_PATH = "data/published_briefs.json";

export type PublishedBriefFileUpdate = {
  /** False when the base branch already carries this week. */
  changed: boolean;
  /** The next file body: two-space JSON with a trailing newline, as the freeze script writes it. */
  content: string;
  slug: string;
};

/** The archive as it stands on `branch`. Throws rather than falling back: a Workflow that cannot read its base must not write. */
export const readPublishedBriefsFromBranch = async (
  client: GitHubRepoClient,
  branch: string,
): Promise<PublishedBrief[]> => {
  const file = await client.getFile(PUBLISHED_BRIEFS_FILE_PATH, branch);
  if (!file) {
    throw new Error(`${PUBLISHED_BRIEFS_FILE_PATH} is missing on ${branch}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(file.content);
  } catch {
    throw new Error(`${PUBLISHED_BRIEFS_FILE_PATH} on ${branch} is not JSON`);
  }
  const validated = PublishedBriefIndexSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`${PUBLISHED_BRIEFS_FILE_PATH} on ${branch} did not validate as a published brief index`);
  }
  return validated.data;
};

/** `current` is the archive the pull request will replace: the file on the base branch. */
export const buildPublishedBriefFileUpdate = (
  record: PublishedBrief,
  current: PublishedBrief[],
): PublishedBriefFileUpdate => {
  if (current.some((brief) => brief.slug === record.slug)) {
    return { changed: false, content: `${JSON.stringify(current, null, 2)}\n`, slug: record.slug };
  }
  const next = [...current, record].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  return { changed: true, content: `${JSON.stringify(next, null, 2)}\n`, slug: record.slug };
};

export const buildPublishedBriefUpdateAgainstBase = async ({
  client,
  base = "main",
  record,
}: {
  client: GitHubRepoClient;
  base?: string;
  record: PublishedBrief;
}): Promise<PublishedBriefFileUpdate> => buildPublishedBriefFileUpdate(record, await readPublishedBriefsFromBranch(client, base));

/** One branch per week, so an unmerged week is never reset by the next one. Matches the manual GitHub workflow's naming. */
export const publishedBriefBranchName = (slug: string) => `automation/weekly-brief-freeze-${slug}`;

export const buildPublishedBriefPullRequestBody = (update: PublishedBriefFileUpdate, now: Date) =>
  [
    "## Summary",
    `- Appends week \`${update.slug}\` to \`${PUBLISHED_BRIEFS_FILE_PATH}\`.`,
    `- Publishes it at \`/brief/${update.slug}\` with a \`datePublished\` that never moves.`,
    "",
    "Opened by the `WeeklyBriefFreezeWorkflow` (worker/workflows/weeklyBriefFreeze.ts) from a live read that passed `assessPublishReadiness`: not a fallback snapshot, record date inside the publish window. The archive is append-only; this adds one week and rewrites nothing.",
    "",
    "## Decision delta (required for product-facing changes)",
    "- **What changed this week for operators?**",
    `  - This week's call has a permanent, citable URL once merged.`,
    "- **What decision should tighten or loosen because of this change?**",
    "  - None. Data only.",
    "- **What should be revisited now?**",
    "  - Nothing, unless the frozen record disagrees with what the site showed this week.",
    "- **What would flip/reverse this call?**",
    "  - A correction, recorded on the published week with its reason, per the stated corrections policy.",
    "",
    "## Surface + owner (required)",
    `- **Primary surface touched**: \`${PUBLISHED_BRIEFS_FILE_PATH}\` and \`/brief/${update.slug}\`.`,
    "- **Requested reviewer/owner for this hotspot**: repo owner.",
    "",
    `_Generated ${now.toISOString()} by the weekly brief freeze Workflow._`,
  ].join("\n");

export type OpenPublishedBriefPullRequestInput = {
  client: GitHubRepoClient;
  update: PublishedBriefFileUpdate;
  base?: string;
  now?: Date;
};

export type OpenPublishedBriefPullRequestResult =
  | { opened: false; reason: string }
  | { opened: true; pullRequest: GitHubPullRequest; branch: string; alreadyOpen: boolean };

/**
 * Idempotent per week: a re-run after a partial failure reuses the branch and, if a PR is
 * already open for it, reports that PR instead of opening a duplicate.
 */
export const openPublishedBriefPullRequest = async ({
  client,
  update,
  base = "main",
  now = new Date(),
}: OpenPublishedBriefPullRequestInput): Promise<OpenPublishedBriefPullRequestResult> => {
  if (!update.changed) {
    return { opened: false, reason: `${base} already carries week ${update.slug}` };
  }

  const branch = publishedBriefBranchName(update.slug);

  const existing = await client.findOpenPullRequest(branch);
  if (existing) {
    return { opened: true, pullRequest: existing, branch, alreadyOpen: true };
  }

  const baseSha = await client.getBranchHeadSha(base);
  if (!baseSha) {
    throw new Error(`base branch ${base} not found in ${client.repository}`);
  }

  if ((await client.getBranchHeadSha(branch)) === null) {
    await client.createBranch(branch, baseSha);
  }

  const current = await client.getFile(PUBLISHED_BRIEFS_FILE_PATH, branch);
  if (!current || current.content !== update.content) {
    await client.putFile({
      path: PUBLISHED_BRIEFS_FILE_PATH,
      branch,
      message: `chore: freeze the ${update.slug} brief to its permanent dated URL`,
      content: update.content,
      sha: current?.sha,
    });
  }

  const pullRequest = await client.openPullRequest({
    title: `chore: freeze the ${update.slug} brief`,
    head: branch,
    base,
    body: buildPublishedBriefPullRequestBody(update, now),
  });

  return { opened: true, pullRequest, branch, alreadyOpen: false };
};
