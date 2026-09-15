import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const CONTENT_ROOT = new URL("../content", import.meta.url).pathname;
const REPO_ROOT = new URL("..", import.meta.url).pathname;

/**
 * Fields that name a page rather than assert something about the world. A page
 * called "Startup Funding Climate This Week" is a weekly page saying so; the
 * same words inside its body are a claim about the week that shipped, frozen
 * into a file nothing re-derives.
 */
const NAMING_KEYS = new Set(["slug", "keyword", "canonicalPath", "href", "path", "title", "label", "id", "cta", "linkLabel"]);

/**
 * Present-tense assertions about the current regime. Each one shipped in
 * static content at some point and said something the file could not know:
 * an article heading promised a weekly read above prose that never changed, a
 * pillar asserted that the growth-era pattern "has inverted" as of today, and
 * an answer told readers to raise "while the window is open" — which is the
 * call, not a constant.
 */
const LIVE_CLAIM_PATTERNS: { pattern: RegExp; why: string }[] = [
  { pattern: /\bthis week\b/i, why: "names the current week in copy nothing re-derives" },
  { pattern: /\bin today['’]s (environment|market|markets|climate|conditions)\b/i, why: "asserts what today's conditions are" },
  { pattern: /\bthe window is (open|closed|closing)\b/i, why: "asserts the state of the raise window" },
  { pattern: /\b(conditions|markets|multiples) are (tightening|loosening|easing|compressing)\b/i, why: "asserts a direction as current" },
  { pattern: /\b(right now|currently),? (the|conditions|markets|rates|capital)\b/i, why: "asserts a current reading" },
];

type Finding = { file: string; path: string; key: string; why: string; excerpt: string };

const walk = (directory: string, into: string[]) => {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) walk(full, into);
    else if (entry.endsWith(".json")) into.push(full);
  }
  return into;
};

const findLiveClaims = (): Finding[] => {
  const findings: Finding[] = [];

  for (const file of walk(CONTENT_ROOT, [])) {
    const data: unknown = JSON.parse(readFileSync(file, "utf8"));

    const visit = (node: unknown, key: string, trail: string) => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => visit(item, key, `${trail}[${index}]`));
        return;
      }
      if (node && typeof node === "object") {
        for (const [childKey, value] of Object.entries(node)) visit(value, childKey, `${trail}.${childKey}`);
        return;
      }
      if (typeof node !== "string" || NAMING_KEYS.has(key)) return;

      for (const { pattern, why } of LIVE_CLAIM_PATTERNS) {
        const match = pattern.exec(node);
        if (!match) continue;
        findings.push({
          file: relative(REPO_ROOT, file),
          path: trail,
          key,
          why,
          excerpt: node.slice(Math.max(0, match.index - 40), match.index + 60),
        });
      }
    };

    visit(data, "", "");
  }

  return findings;
};

describe("static content makes no live claims", () => {
  /*
   * Content JSON is published verbatim and never re-derived, so a sentence in
   * it that asserts what conditions are today becomes false the week after it
   * lands — and, on an answer page whose `shortAnswer` ships into the meta
   * description, becomes a false claim in search results.
   */
  it("asserts nothing about the current week or regime", () => {
    const findings = findLiveClaims();
    assert.deepEqual(
      findings,
      [],
      findings.map((finding) => `${finding.file}${finding.path} (${finding.key}): ${finding.why}\n    …${finding.excerpt}…`).join("\n"),
    );
  });

  it("still allows a page to be named for the week it covers", () => {
    /* The guard would be useless if it also failed the page titles. */
    const titles = JSON.parse(readFileSync(join(CONTENT_ROOT, "answers/pages.json"), "utf8")) as { title: string }[];
    assert.ok(titles.some((page) => /this week/i.test(page.title)), "a weekly page still names itself");
  });
});
