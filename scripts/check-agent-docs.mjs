#!/usr/bin/env node
/**
 * Holds the agent docs to the repo they describe.
 *
 * Docs drift quietly: a renamed script, a moved lesson, a guide added but never indexed.
 * This checks the three things that break a reader first:
 *   1. every `bun run <script>` named in the docs exists in package.json;
 *   2. every relative markdown link resolves to a file;
 *   3. every guide in docs/agents/ is linked from docs/agents/README.md.
 *
 * `tests/agentDocsFreshness.test.ts` runs it in the suite, so it is held in every gate.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { walkFiles } from "./walk-files.mjs";

const DOC_FILES = ["AGENTS.md", "CLAUDE.md"];
const DOCS_DIRECTORY = "docs/agents";
const INDEX_FILE = "docs/agents/README.md";
const SCRIPT_PATTERN = /\bbun run ([a-zA-Z0-9:_-]+)/g;
const LINK_PATTERN = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const EXTERNAL_LINK = /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i;
const MAX_DOC_BYTES = 50 * 1024;
const INDEX_HEADINGS = ["## Read the section you need", "## Contents", "## How to read"];

const toPosix = (file) => file.split(path.sep).join("/");

function docFiles(repoRoot) {
  const guides = walkFiles(path.join(repoRoot, DOCS_DIRECTORY), { followSymlinks: false })
    .map((file) => toPosix(path.relative(repoRoot, file)))
    .filter((file) => file.endsWith(".md"));
  return [...DOC_FILES, ...guides].filter((file) => existsSync(path.join(repoRoot, file)));
}

/** The repo path a link names, or "" when it is external or an in-page anchor. */
function resolveLink(fromFile, link) {
  if (!link || EXTERNAL_LINK.test(link)) return "";
  const withoutAnchor = link.split("#")[0];
  if (!withoutAnchor) return "";
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), withoutAnchor));
}

export function checkAgentDocs({ repoRoot = process.cwd() } = {}) {
  const root = path.resolve(repoRoot);
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const scripts = new Set(Object.keys(packageJson.scripts ?? {}));
  const failures = [];
  const files = docFiles(root);

  for (const file of files) {
    const text = readFileSync(path.join(root, file), "utf8");

    // A long guide without a section index is read whole or not at all. `ui-ux-standards.md`
    // crossed 50KB and earned its "Read the section you need" table; keep the next one honest.
    if (Buffer.byteLength(text, "utf8") > MAX_DOC_BYTES) {
      const head = text.split("\n").slice(0, 120).join("\n");
      if (!INDEX_HEADINGS.some((heading) => head.includes(heading))) {
        failures.push(
          `${file}: ${Math.round(Buffer.byteLength(text, "utf8") / 1024)}KB with no section index ` +
            `(add one of: ${INDEX_HEADINGS.join(", ")})`,
        );
      }
    }

    for (const match of text.matchAll(SCRIPT_PATTERN)) {
      const script = match[1];
      if (!scripts.has(script)) failures.push(`${file}: names a missing package script: bun run ${script}`);
    }

    for (const match of text.matchAll(LINK_PATTERN)) {
      const link = match[1];
      const resolved = resolveLink(file, link);
      if (!resolved) continue;
      if (!existsSync(path.join(root, resolved))) failures.push(`${file}: links a missing file: ${link}`);
    }
  }

  // Every guide under docs/agents/ is reachable from the index, not only from a sibling.
  const indexText = existsSync(path.join(root, INDEX_FILE)) ? readFileSync(path.join(root, INDEX_FILE), "utf8") : "";
  const indexed = new Set(
    [...indexText.matchAll(LINK_PATTERN)]
      .map((match) => resolveLink(INDEX_FILE, match[1]))
      .filter(Boolean),
  );
  for (const file of files.filter((entry) => entry.startsWith(`${DOCS_DIRECTORY}/`) && entry !== INDEX_FILE && entry.split("/").length === 3)) {
    const basename = path.posix.basename(file);
    // The index may link a guide or name it in backticks; both make it findable.
    const named = indexed.has(file) || indexText.includes(`\`${file}\``) || indexText.includes(`\`${basename}\``);
    if (!named) failures.push(`${INDEX_FILE}: does not name the guide ${file}`);
  }

  return { checked: files.length, failures };
}

function main() {
  const result = checkAgentDocs({ repoRoot: process.cwd() });
  if (result.failures.length > 0) {
    console.error(`[agent-docs] ${result.failures.length} problem(s) across ${result.checked} file(s):`);
    for (const failure of result.failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`[agent-docs] ${result.checked} file(s): commands, links and the guide index resolve.`);
}

if (import.meta.main) {
  main();
}
