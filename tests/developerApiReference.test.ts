import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { describe, it } from "node:test";

const API_DOC_PATH = join(process.cwd(), "docs/developer/api-reference.md");
const API_ROUTES_ROOT = join(process.cwd(), "app/api");

const UNDOCUMENTED_ALLOWED = new Set<string>([
  // Image endpoint intentionally omitted from JSON API reference.
  "/api/og",
]);

const normalizeDocEndpoint = (raw: string) => {
  const withoutQuery = raw.split("?")[0] ?? raw;
  return withoutQuery.trim();
};

const collectApiRoutes = (directory: string, relative = ""): string[] => {
  const entries = readdirSync(directory);
  const routes: string[] = [];

  for (const entry of entries) {
    const absolute = join(directory, entry);
    const entryRelative = relative ? posix.join(relative, entry) : entry;
    const stats = statSync(absolute);

    if (stats.isDirectory()) {
      routes.push(...collectApiRoutes(absolute, entryRelative));
      continue;
    }

    if (stats.isFile() && entry === "route.ts") {
      const endpointPath = `/${entryRelative.replace(/\/route\.ts$/, "")}`;
      routes.push(endpointPath);
    }
  }

  return routes;
};

describe("developer API reference", () => {
  it("documents every implemented JSON API route and no removed routes", () => {
    const markdown = readFileSync(API_DOC_PATH, "utf8");
    const documentedApiPaths = new Set(
      [...markdown.matchAll(/\|\s*`(\/api\/[^`]+)`\s*\|/g)]
        .map((match) => normalizeDocEndpoint(match[1] ?? ""))
        .filter(Boolean),
    );

    const implementedApiPaths = new Set(
      collectApiRoutes(API_ROUTES_ROOT)
        .map((route) => `/api${route}`)
        .filter((route) => !UNDOCUMENTED_ALLOWED.has(route)),
    );

    const documentedButMissing = [...documentedApiPaths].filter(
      (path) => !implementedApiPaths.has(path),
    );
    const implementedButUndocumented = [...implementedApiPaths].filter(
      (path) => !documentedApiPaths.has(path),
    );

    assert.deepEqual(
      documentedButMissing,
      [],
      `Documented API path(s) missing implementation: ${documentedButMissing.join(", ")}`,
    );
    assert.deepEqual(
      implementedButUndocumented,
      [],
      `Implemented API path(s) missing docs: ${implementedButUndocumented.join(", ")}`,
    );
  });
});
