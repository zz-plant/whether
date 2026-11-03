import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/*
 * The vocabulary guard reaches `content/` and `public/downloads/`.
 *
 * `tests/readerVocabulary.test.tsx` renders the app's routes, so it sees every
 * string a component prints. It does not see the article bodies, the resource
 * metadata or the downloadable templates, which are data files read at runtime —
 * and that is exactly where the retired words survived longest. The 2026-10-30
 * audit found five of them in four lines of one public memo: "Posture at quarter
 * end: Defensive · Confidence: MED", "the call moved off Expansion".
 *
 * The rules are the ones in docs/editorial-guardrails.md: the stance is
 * "guidance", the four states are the weather names, the distance is "room
 * before a change", and "posture" is not a reader-facing label. The patterns are
 * the retired *senses*, not the bare word: "compliance posture" is ordinary
 * English and stays.
 */

const RETIRED: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /\bcapital posture\b/i, why: '"capital discipline" is the name' },
  { pattern: /\bposture (call|framework|governance|change)\b/i, why: "posture is retired as a stance label" },
  { pattern: /\bcurrent posture\b/i, why: '"this week\'s guidance" is the name' },
  { pattern: /\bthe posture\b/i, why: '"the guidance" is the name' },
  { pattern: /\bposture[- ]to[- ]/i, why: "compound labels built on a retired word" },
  { pattern: /\bConfidence:\s*(HIGH|MED|LOW|MEDIUM)\b/i, why: '"room before a change" replaced it' },
  { pattern: /\b(SCARCITY|DEFENSIVE|VOLATILE|EXPANSION)\b/, why: "engine keys are internal; reader text uses the weather name" },
  { pattern: /\bthe call\b/i, why: 'the stance is "guidance" and the state is "conditions"' },
];

const readAll = (root: string, extensions: string[]): Array<{ path: string; text: string }> => {
  const found: Array<{ path: string; text: string }> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (extensions.some((extension) => entry.name.endsWith(extension))) {
        found.push({ path, text: readFileSync(path, "utf8") });
      }
    }
  };
  walk(root);
  return found;
};

describe("the reader vocabulary in the content layer", () => {
  const files = [
    ...readAll("content", [".json"]),
    ...readAll("public/downloads", [".md"]),
  ];

  it("has files to check, so a moved directory fails loudly", () => {
    assert.ok(files.length > 0, "no content files were read");
  });

  it("uses no retired word in any article, answer, resource or download", () => {
    const findings: string[] = [];
    for (const file of files) {
      const lines = file.text.split("\n");
      lines.forEach((line, index) => {
        for (const { pattern, why } of RETIRED) {
          if (pattern.test(line)) findings.push(`${file.path}:${index + 1} — ${why}\n    ${line.trim().slice(0, 160)}`);
        }
      });
    }
    assert.deepEqual(findings, [], `retired vocabulary in the content layer:\n${findings.join("\n")}`);
  });
});
