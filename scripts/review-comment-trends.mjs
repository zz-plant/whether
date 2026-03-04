#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const args = process.argv.slice(2);

function readArg(name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function printHelp() {
  console.log(`Review comment trend analyzer

Usage:
  node scripts/review-comment-trends.mjs [options]

Options:
  --repo <owner/name>   Repository to query (default: zz-plant/whether)
  --limit <n>           Max comments to analyze (default: 200)
  --humans-only         Exclude bot-authored review comments
  --out <path>          Write JSON result artifact
  --summary-out <path>  Write markdown summary artifact
  -h, --help            Show this help
`);
}

if (hasFlag("--help") || hasFlag("-h")) {
  printHelp();
  process.exit(0);
}

const repo = readArg("--repo", "zz-plant/whether");
const limit = Number.parseInt(readArg("--limit", "200"), 10);
const outPath = readArg("--out");
const summaryOutPath = readArg("--summary-out");
const humansOnly = hasFlag("--humans-only");

if (!Number.isFinite(limit) || limit <= 0) {
  console.error("Expected --limit to be a positive integer.");
  process.exit(1);
}

const categoryRules = {
  "type-safety": [
    /\bunsafe\b/,
    /\btype assertion\b/,
    /\bnull\b/,
    /\bundefined\b/,
    /\bnon-null\b/,
    /\bstrict\b.*\btype\b/,
  ],
  "duplication-refactor": [
    /\bduplicate\b/,
    /\bduplication\b/,
    /\bextract\b/,
    /\bhelper\b/,
    /\brefactor\b/,
    /\bredundan/,
  ],
  "edge-cases": [
    /\bedge case\b/,
    /\bfallback\b/,
    /\berror\b/,
    /\bempty\b/,
    /\bmissing\b/,
    /\bhandle\b/,
  ],
  "separation-of-concerns": [
    /\bcomponent is responsible for\b/,
    /\btoo much\b/,
    /\bsplit\b/,
    /\bseparation\b/,
    /\bmaintainability\b/,
  ],
  testing: [/\btest\b/, /\bcoverage\b/, /\bspec\b/, /\bassert/],
  readability: [
    /\bclarity\b/,
    /\breadability\b/,
    /\brename\b/,
    /\bvariable names?\b/,
    /\bmagic number\b/,
  ],
};

function fetchPage(url) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const curlArgs = [
    "-sS",
    "-L",
    "-D",
    "-",
    "-H",
    "Accept: application/vnd.github+json",
    "-H",
    "User-Agent: whether-review-comment-trends-script",
  ];

  if (token) {
    curlArgs.push("-H", `Authorization: Bearer ${token}`);
  }

  curlArgs.push(url);

  const raw = execFileSync("curl", curlArgs, { encoding: "utf8" });
  const boundaryPattern = /\r?\n\r?\n(?=[\[{])/g;
  let boundaryMatch = null;
  for (const match of raw.matchAll(boundaryPattern)) {
    boundaryMatch = match;
  }

  if (!boundaryMatch) {
    throw new Error("Unable to parse GitHub API response headers.");
  }

  const headerText = raw.slice(0, boundaryMatch.index);
  const bodyText = raw.slice(boundaryMatch.index + boundaryMatch[0].length);
  const headerBlocks = headerText.split(/\r?\n\r?\n/);
  const finalHeaderBlock = headerBlocks[headerBlocks.length - 1] || "";

  const statusLine = finalHeaderBlock.split(/\r?\n/)[0] || "";
  if (!statusLine.includes(" 200 ")) {
    throw new Error(`GitHub API request failed: ${statusLine}`);
  }

  const linkLine = finalHeaderBlock
    .split(/\r?\n/)
    .find((line) => line.toLowerCase().startsWith("link:"));
  const linkValue = linkLine ? linkLine.slice(linkLine.indexOf(":") + 1).trim() : "";

  let nextUrl = null;
  if (linkValue) {
    const nextPart = linkValue
      .split(",")
      .map((part) => part.trim())
      .find((part) => part.endsWith('rel="next"'));
    if (nextPart) {
      nextUrl = nextPart.slice(1, nextPart.indexOf(">"));
    }
  }

  return { data: JSON.parse(bodyText), nextUrl };
}

function normalizeText(body) {
  return body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/<sub>|<\/sub>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categorize(body) {
  const text = normalizeText(body).toLowerCase();
  const matches = [];

  for (const [category, rules] of Object.entries(categoryRules)) {
    if (rules.some((rule) => rule.test(text))) {
      matches.push(category);
    }
  }

  return { categories: matches.length > 0 ? matches : ["uncategorized"], text };
}

function isBotComment(comment) {
  const login = comment?.user?.login?.toLowerCase() || "";
  const type = comment?.user?.type || "";
  return type === "Bot" || login.includes("bot") || login.includes("codereviewagent");
}

function buildSummaryMarkdown({ repoName, fetchedCount, analyzedCount, onlyHumans, sorted, examples }) {
  const lines = [
    `# Review comment trends (${repoName})`,
    "",
    `- Fetched comments: ${fetchedCount}`,
    `- Analyzed comments: ${analyzedCount} (${onlyHumans ? "humans only" : "including bots"})`,
    "",
    "## Recurring categories",
  ];

  if (sorted.length === 0) {
    lines.push("", "No comments matched the configured analysis scope.");
    return `${lines.join("\n")}\n`;
  }

  for (const [category, count] of sorted) {
    lines.push(`- **${category}**: ${count}`);
    lines.push(`  - Example: ${examples.get(category) || "n/a"}`);
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  if (!repo.includes("/")) {
    throw new Error("Expected --repo in owner/name format.");
  }

  let url = `https://api.github.com/repos/${repo}/pulls/comments?per_page=100`;
  const comments = [];

  while (url && comments.length < limit) {
    const { data, nextUrl } = fetchPage(url);
    comments.push(...data);
    url = nextUrl;
  }

  const scopedComments = comments.slice(0, limit);
  const analyzedComments = humansOnly ? scopedComments.filter((c) => !isBotComment(c)) : scopedComments;

  const summary = new Map();
  const examples = new Map();

  for (const comment of analyzedComments) {
    const body = comment.body || "";
    const { categories, text } = categorize(body);
    for (const category of categories) {
      summary.set(category, (summary.get(category) || 0) + 1);
      if (!examples.has(category)) {
        examples.set(category, text.slice(0, 180));
      }
    }
  }

  const sorted = [...summary.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`Repo: ${repo}`);
  console.log(`Fetched comments: ${scopedComments.length}`);
  console.log(`Analyzed comments: ${analyzedComments.length}${humansOnly ? " (humans only)" : " (including bots)"}`);
  console.log("\nRecurring categories:");
  for (const [category, count] of sorted) {
    console.log(`- ${category}: ${count}`);
    console.log(`  e.g. ${examples.get(category)}`);
  }

  const payload = {
    repo,
    fetchedComments: scopedComments.length,
    analyzedComments: analyzedComments.length,
    humansOnly,
    categories: Object.fromEntries(sorted),
    examples: Object.fromEntries(examples.entries()),
  };

  if (outPath) {
    await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`\nWrote JSON summary to ${outPath}`);
  }

  if (summaryOutPath) {
    await writeFile(
      summaryOutPath,
      buildSummaryMarkdown({
        repoName: repo,
        fetchedCount: scopedComments.length,
        analyzedCount: analyzedComments.length,
        onlyHumans: humansOnly,
        sorted,
        examples,
      }),
      "utf8",
    );
    console.log(`Wrote markdown summary to ${summaryOutPath}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
