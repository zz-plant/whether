import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { presetTasks, resolveCheckPlan } from "../scripts/check-tasks.mjs";
import { renderToStaticMarkup } from "react-dom/server";

import { ContentPageShell } from "../app/components/ui/contentPageShell";
import {
  auditMainContentRoutes,
  collectMainContentRouteSamples,
  collectUnresolvedAnchors,
  inspectInPageAnchors,
  inspectMainContentHtml,
} from "../scripts/main-content-landmarks.mjs";

describe("main-content landmark ownership", () => {
  it("gives ContentPageShell routes the skip-link target", () => {
    const html = renderToStaticMarkup(
      <ContentPageShell>
        <h1>Route content</h1>
      </ContentPageShell>,
    );

    assert.match(html, /^<main\b[^>]*\bid="main-content"/);
    assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  });

  it("keeps route loading fallbacks out of main landmark ownership", () => {
    const source = readFileSync(
      new URL("../app/components/routeLoadingShell.tsx", import.meta.url),
      "utf8",
    );

    assert.doesNotMatch(source, /ReportShell/);
    assert.doesNotMatch(source, /<main\b/);
    assert.doesNotMatch(source, /\bid=["']main-content["']/);
  });
});

describe("fetch-based main-content guard", () => {
  const validHtml = `<!doctype html><html><body>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <main id="main-content"><h1>Brief</h1></main>
  </body></html>`;

  it("accepts one skip link targeting the only main landmark", () => {
    assert.deepEqual(inspectMainContentHtml(validHtml), {
      mainCount: 1,
      mainContentIdCount: 1,
      skipLinkCount: 1,
      nestedMain: false,
      issues: [],
    });
  });

  it("rejects missing, duplicate, and nested main landmarks", () => {
    const missing = inspectMainContentHtml(
      '<a href="#main-content">Skip</a><main>Content</main>',
    );
    assert.ok(missing.issues.some((issue: string) => /main-content/.test(issue)));

    const duplicate = inspectMainContentHtml(
      '<a href="#main-content">Skip</a><main id="main-content"></main><main id="main-content"></main>',
    );
    assert.ok(duplicate.issues.some((issue: string) => /2 <main>/.test(issue)));
    assert.ok(duplicate.issues.some((issue: string) => /2 elements/.test(issue)));

    const nested = inspectMainContentHtml(
      '<a href="#main-content">Skip</a><main id="main-content"><main></main></main>',
    );
    assert.equal(nested.nestedMain, true);
    assert.ok(nested.issues.some((issue: string) => /nested/.test(issue)));
  });

  it("fetches route output and reports the route that violates the contract", async () => {
    const responses = new Map([
      ["http://whether.test/valid", validHtml],
      ["http://whether.test/missing", '<a href="#main-content">Skip</a><main>Missing target</main>'],
    ]);
    const fetchCalls: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      fetchCalls.push(url);
      return new Response(responses.get(url) ?? "Not found", { status: responses.has(url) ? 200 : 404 });
    };

    const results = await auditMainContentRoutes({
      baseUrl: "http://whether.test",
      routes: ["/valid", "/missing"],
      fetchImpl,
    });

    assert.deepEqual(fetchCalls, ["http://whether.test/valid", "http://whether.test/missing"]);
    assert.equal(results[0].ok, true);
    assert.equal(results[1].ok, false);
    assert.equal(results[1].route, "/missing");
  });

  it("covers every page file and resolves every dynamic route family", async () => {
    const routes = await collectMainContentRouteSamples();

    for (const expected of [
      "/",
      "/about",
      "/brief/2026-w31",
      "/history/2025",
      "/resources/decision-shield-overview",
      "/search",
    ]) {
      assert.ok(routes.includes(expected), `${expected} is absent from the landmark audit`);
    }

    assert.equal(routes.some((route: string) => route.includes("[")), false);
  });

  it("runs from every local and preview check gate", () => {
    const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

    assert.match(packageJson, /"check:landmarks":\s*"node scripts\/check-main-content-landmarks\.mjs"/);
    assert.deepEqual(
      resolveCheckPlan(["landmarks"], {}).stages,
      [[{ name: "landmarks", script: "check:landmarks" }]],
    );
    // The hook runs the pre-push preset and `check:vinext` (what Workers Builds runs on
    // every push, main included) runs the deploy preset; tests/deployGateTestScope.test.ts
    // holds each consumer to its preset. Both presets carry the audit.
    assert.ok(presetTasks("pre-push").includes("landmarks"), "the pre-push gate no longer runs landmarks");
    assert.ok(presetTasks("deploy").includes("landmarks"), "the deploy gate no longer runs landmarks");
    assert.match(workflow, /run-checks\.mjs[^\n]*\blandmarks\b/);
  });

  /*
   * The audit is mostly waiting: the dev server compiles each route on demand and this
   * process does nothing meanwhile. A flat concurrency of 4 left most of a bigger box
   * idle — measured on 2026-09-03, 40 routes took 51.8s at 4 and 33.0s at 8 on four
   * cores, with 12 buying nothing further. What must not change is the small container:
   * this check runs where a route that compiles slowly must not read as one that never
   * answered, so two cores still land on the 4 that was always there.
   */
  it("scales its route concurrency with the box, never below the old default", () => {
    const audit = readFileSync(new URL("../scripts/check-main-content-landmarks.mjs", import.meta.url), "utf8");
    assert.match(audit, /Math\.min\(8, Math\.max\(4, availableParallelism\(\) \* 2\)\)/);

    const defaultFor = (cores: number) => Math.min(8, Math.max(4, cores * 2));
    assert.equal(defaultFor(1), 4);
    assert.equal(defaultFor(2), 4);
    assert.equal(defaultFor(4), 8);
    assert.equal(defaultFor(16), 8);

    // Still overridable, so a box that disagrees needs no code change.
    assert.match(audit, /readArgValue\("--concurrency", String\(defaultConcurrency\)\)/);
  });
});

/*
 * Every route's flight payload carries the layout's 404 boundary, and
 * app/not-found.tsx renders a targeted <main>. Until 2026-10-06 the audit read
 * that row as the route's own landmark, so five reading routes whose <main> had
 * no id passed it. The payloads here are trimmed from what vinext serves: rows
 * pushed as one escaped string, the 404 named as a boundary's `fallback`.
 */
describe("the 404 boundary in every flight payload", () => {
  const row = (id: string, value: unknown) => `${id}:${JSON.stringify(value)}`;
  const flight = (...rows: string[]) =>
    `<script>(self.rsc??=[]).push(${JSON.stringify(`${rows.join("\n")}\n`)})</script>`;
  const layout = row("0", ["$", "body", null, {
    children: [
      ["$", "a", null, { className: "skip-link", href: "#main-content", children: "Skip to content" }],
      ["$", "$L1", null, { resetKey: "about", fallback: "$2", children: "$3" }],
    ],
  }]);
  const notFound = row("2", ["$", "main", null, { id: "main-content", tabIndex: -1, children: "That page moved." }]);
  const routeMain = (props: Record<string, unknown>) => row("3", ["$", "main", null, { ...props, children: "About" }]);
  const skipLink = '<a class="skip-link" href="#main-content">Skip to content</a>';

  it("fails a painted <main> without the id, though the 404's targeted one is in the payload", () => {
    const html = `${skipLink}<main class="mx-auto">About</main>${flight(layout, notFound, routeMain({}))}`;

    assert.ok(
      inspectMainContentHtml(html).issues.some((issue: string) => /id="main-content" on the route's <main>; found 0/.test(issue)),
    );
  });

  it("passes a streamed route whose own targeted <main> arrives in the payload", () => {
    const html = `${skipLink}<div>Loading</div>${flight(layout, notFound, routeMain({ id: "main-content", tabIndex: -1 }))}`;

    assert.deepEqual(inspectMainContentHtml(html).issues, []);
  });

  it("fails a streamed route whose only targeted <main> is the 404's, wherever its row sits", () => {
    /* The second shape outlines the 404's <main> below its fallback row, as a
       not-found page that wraps its shell in another component would. */
    const outlinedNotFound = [
      row("2", ["$", "$L4", null, { children: "$5" }]),
      row("5", ["$", "main", null, { id: "main-content", tabIndex: -1, children: "That page moved." }]),
    ];

    for (const notFoundRows of [[notFound], outlinedNotFound]) {
      const html = `${skipLink}<div>Loading</div>${flight(layout, ...notFoundRows, routeMain({}))}`;
      assert.ok(inspectMainContentHtml(html).issues.some((issue: string) => /found 0 <main>/.test(issue)));
    }
  });

  it("judges a painted <main> as painted, even beside a targeted one in the payload", () => {
    /* The fallback used to excuse this as a "placeholder" /state flushed. /state
       had no loading shell: its page rendered a <main> without the id, the same
       defect as the five reading routes. */
    const html = `${skipLink}<main class="flex min-h-screen">Loading</main>${flight(layout, notFound, routeMain({ id: "main-content" }))}`;

    assert.notDeepEqual(inspectMainContentHtml(html).issues, []);
  });
});

/*
 * A dead `#anchor` fails silently — the browser stays put — and nothing in a
 * type check or a unit test sees it. The four found by hand on 2026-09-16 were
 * all invisible for one reason: they sat in code that never rendered, so no
 * reader could click one and report it. The audit reads links and ids off the
 * same served response, which is the only place both are true at once.
 */
describe("in-page anchor targets", () => {
  it("separates the ids a page carries from the anchors it links to", () => {
    const html = '<a href="#present">go</a><a href="#absent">go</a><div id="present"></div>';

    assert.deepEqual(inspectInPageAnchors(html), {
      ids: ["present"],
      anchors: ["absent", "present"],
    });
  });

  it("reads an id out of the flight payload, as a streamed route's arrives", () => {
    /* The shape a streamed <main id="main-content"> takes in the served HTML.
       Reading only literal markup called the skip link on five routes dead. */
    const html = '<a href="#main-content">skip</a>' + String.raw`\"id\":\"main-content\"`;

    assert.deepEqual(inspectInPageAnchors(html).ids, ["main-content"]);
  });

  it("leaves #top alone, which needs no id", () => {
    assert.deepEqual(inspectInPageAnchors('<a href="#top">top</a>').anchors, []);
  });

  it("says nothing about a link to another route's anchor", () => {
    assert.deepEqual(inspectInPageAnchors('<a href="/trust#beginner-glossary">glossary</a>').anchors, []);
  });
});

/*
 * Aggregated across routes before judging, and that is the load-bearing part.
 * Plenty of targets render only under a condition — a section that needs
 * figures entered, a banner that needs degraded data — so "this page links to
 * an id it is not currently showing" is a claim about the data a route got, and
 * it would go red in a container whose log cannot be read from here. "No page in
 * the app renders this id" is a claim about the code, and it is what the four
 * dead anchors found by hand had in common.
 */
describe("unresolved anchors across routes", () => {
  it("passes an anchor another route renders, and fails one no route does", () => {
    const results = [
      { route: "/", anchorIds: ["weekly-call"], inPageAnchors: ["weekly-call", "elsewhere", "nowhere"] },
      { route: "/operate", anchorIds: ["elsewhere"], inPageAnchors: [] },
    ];

    assert.deepEqual(collectUnresolvedAnchors(results), [{ route: "/", missing: ["nowhere"] }]);
  });

  it("names every route that links to a missing id, in route order", () => {
    const results = [
      { route: "/b", anchorIds: [], inPageAnchors: ["gone"] },
      { route: "/a", anchorIds: [], inPageAnchors: ["gone"] },
    ];

    assert.deepEqual(collectUnresolvedAnchors(results), [
      { route: "/a", missing: ["gone"] },
      { route: "/b", missing: ["gone"] },
    ]);
  });

  it("says nothing when a route reported no anchors at all", () => {
    assert.deepEqual(collectUnresolvedAnchors([{ route: "/" }]), []);
  });
});
