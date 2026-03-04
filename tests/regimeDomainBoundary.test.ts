import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const DOMAIN_DIRECTORIES = [
  join(ROOT, "lib/regimeEngine"),
  join(ROOT, "lib/policy"),
];
const DOMAIN_ENTRY_FILES = [join(ROOT, "lib/regimeEngine.ts")];
const ALLOWED_FILE_IMPORTS = new Set([join(ROOT, "lib/types.ts")]);

const IMPORT_PATTERN = /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_PATTERN = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

const collectTypescriptFiles = (directory: string): string[] => {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTypescriptFiles(absolute));
      continue;
    }

    if (entry.isFile() && absolute.endsWith(".ts")) {
      files.push(absolute);
    }
  }

  return files;
};

const collectImportSpecifiers = (source: string): string[] => {
  const specifiers = new Set<string>();

  for (const match of source.matchAll(IMPORT_PATTERN)) {
    if (match[1]) {
      specifiers.add(match[1]);
    }
  }
  for (const match of source.matchAll(DYNAMIC_IMPORT_PATTERN)) {
    if (match[1]) {
      specifiers.add(match[1]);
    }
  }

  return [...specifiers];
};

const resolveLocalImport = (importerFile: string, specifier: string): string | null => {
  const basePath = resolve(dirname(importerFile), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    join(basePath, "index.ts"),
    join(basePath, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const isWithinDirectory = (filePath: string, directory: string) =>
  filePath === directory || filePath.startsWith(`${directory}${sep}`);

describe("regime domain boundaries", () => {
  it("keeps regime and policy modules pure-domain and framework-agnostic", () => {
    const files = [
      ...DOMAIN_ENTRY_FILES,
      ...DOMAIN_DIRECTORIES.flatMap(collectTypescriptFiles),
    ];
    const violations: string[] = [];

    for (const filePath of files) {
      const source = readFileSync(filePath, "utf8");
      const specifiers = collectImportSpecifiers(source);

      for (const specifier of specifiers) {
        if (!specifier.startsWith(".")) {
          violations.push(`${filePath}: non-relative import "${specifier}"`);
          continue;
        }

        const resolved = resolveLocalImport(filePath, specifier);
        if (!resolved) {
          violations.push(`${filePath}: unresolved local import "${specifier}"`);
          continue;
        }

        const allowed =
          ALLOWED_FILE_IMPORTS.has(resolved) ||
          DOMAIN_DIRECTORIES.some((directory) => isWithinDirectory(resolved, directory));

        if (!allowed) {
          violations.push(
            `${filePath}: import "${specifier}" resolves outside domain boundary -> ${resolved}`,
          );
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Domain boundary violations:\n${violations.join("\n")}`,
    );
  });
});
