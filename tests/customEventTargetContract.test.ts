import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "bun:test";

const APP_DIR = new URL("../app/", import.meta.url).pathname;


function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

type Site = { file: string; target: string; bubbles: boolean };

// Event names reach dispatch/listener calls either as a string literal or as a module
// constant (`const SLACK_PREVIEW_CHANGED_EVENT = "whether-..."`). Collect the constants
// first so an event routed through one is still checked rather than silently skipped.
function collectEventNameConstants(sources: Map<string, string>): Map<string, string> {
  const byIdentifier = new Map<string, string>();
  for (const source of sources.values()) {
    for (const [, identifier, name] of source.matchAll(
      /const\s+([A-Za-z_$][\w$]*)\s*=\s*"(whether[^"]*)"/g,
    )) {
      byIdentifier.set(identifier, name);
    }
  }
  return byIdentifier;
}

describe("whether custom event targets", () => {
  it("dispatches every whether:* event where a listener can hear it", () => {
    const dispatches = new Map<string, Site[]>();
    const listeners = new Map<string, Site[]>();

    const sources = new Map(
      sourceFiles(APP_DIR).map((file) => [file, readFileSync(file, "utf8")] as const),
    );
    const eventNameConstants = collectEventNameConstants(sources);

    const resolveName = (raw: string): string | null => {
      if (raw.startsWith('"')) return raw.slice(1, -1);
      return eventNameConstants.get(raw) ?? null;
    };

    for (const [file, source] of sources) {
      for (const match of source.matchAll(
        /(window|document)\.dispatchEvent\(\s*new CustomEvent\(\s*("whether[^"]*"|[A-Za-z_$][\w$]*)([\s\S]*?)\)\s*\)/g,
      )) {
        const [, target, rawName, rest] = match;
        const name = resolveName(rawName);
        if (!name) continue;
        const sites = dispatches.get(name) ?? [];
        sites.push({ file, target, bubbles: /bubbles:\s*true/.test(rest) });
        dispatches.set(name, sites);
      }

      for (const match of source.matchAll(
        /(window|document)\.addEventListener\(\s*("whether[^"]*"|[A-Za-z_$][\w$]*)/g,
      )) {
        const [, target, rawName] = match;
        const name = resolveName(rawName);
        if (!name) continue;
        const sites = listeners.get(name) ?? [];
        sites.push({ file, target, bubbles: false });
        listeners.set(name, sites);
      }
    }

    assert.ok(dispatches.size > 0, "expected to find whether custom event dispatches under app/");

    for (const [name, dispatchSites] of dispatches) {
      const listenerSites = listeners.get(name) ?? [];
      assert.ok(
        listenerSites.length > 0,
        `"${name}" is dispatched but nothing listens for it`,
      );

      for (const dispatch of dispatchSites) {
        for (const listener of listenerSites) {
          // A non-bubbling event dispatched on document never reaches window.
          const reachable =
            dispatch.target === listener.target ||
            (dispatch.bubbles && listener.target === "window");
          assert.ok(
            reachable,
            `"${name}" is dispatched on ${dispatch.target} in ${dispatch.file} but listened for on ${listener.target} in ${listener.file}; make the targets match or dispatch with { bubbles: true }`,
          );
        }
      }
    }
  });
});
